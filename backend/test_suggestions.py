import json
import os
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import httpx
import openai
from fastapi import HTTPException
from fastapi.testclient import TestClient
import main

WARD_ID = 'S13003133'


class SuggestionTests(unittest.TestCase):
    def test_mock_never_calls_openai(self):
        with patch('main.openai_explanation') as provider:
            result = main.explain('ward', WARD_ID, source='mock', period='Year 3')
        provider.assert_not_called()
        self.assertEqual(result['source'], 'mock')
        self.assertEqual(result['period'], 'Year 3')
        self.assertIn('North East', result['text'])
        self.assertNotIn('6 months', result['text'])

    def test_placeholder_key_is_unconfigured(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY':'sk-your-key-here'}):
            self.assertFalse(main.api_status()['openai_configured'])
            with self.assertRaises(HTTPException) as error:
                main.openai_explanation('ward', main.wards_by_id[WARD_ID])
            self.assertEqual(error.exception.detail['code'], 'openai_not_configured')

    def test_model_returns_only_provider_text(self):
        with patch('main.openai_explanation', return_value='An actual generated option.') as provider:
            result = main.explain('ward', WARD_ID, source='model', period='Year 2')
        provider.assert_called_once_with('ward', main.wards_by_id[WARD_ID], period='Year 2')
        self.assertEqual(result['source'], 'openai')
        self.assertEqual(result['text'], 'An actual generated option.')
        self.assertEqual(result['data_source'], 'model')

    def test_model_without_key_is_explicitly_unavailable(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY': ''}):
            response = TestClient(main.app).get('/api/explain', params={'mode':'ward', 'id':WARD_ID, 'source':'model'})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()['detail']['code'], 'openai_not_configured')
        self.assertNotIn('text', response.json())

    def test_bad_source_period_and_model_premises_are_rejected(self):
        for mode, source, period in [('ward','other','Current'), ('ward','model','In 6 months'), ('premises','model','Current')]:
            with self.subTest(mode=mode, source=source, period=period), patch('main.openai_explanation') as provider:
                with self.assertRaises(HTTPException) as error:
                    main.explain(mode, WARD_ID, source=source, period=period)
                self.assertEqual(error.exception.status_code, 400)
                provider.assert_not_called()

    def test_model_context_uses_selected_real_projection_without_authored_context(self):
        context = main.build_suggestion_context('ward', main.wards_by_id[WARD_ID], 'Year 2')
        model = main.get_strategic_ward(WARD_ID, source='model')['properties']
        self.assertEqual(context['risk_score'], model['risk_score'])
        self.assertEqual(context['selected_annual_projection'], 23)
        self.assertEqual(context['scenario_score'], min(100, model['risk_score'] + 8))
        for field in ['drivers', 'forecast_lower', 'forecast_upper', 'trend_pct', 'forecast_6mo']:
            self.assertNotIn(field, context)

    def test_current_does_not_apply_a_future_increment(self):
        context = main.build_suggestion_context('ward', main.wards_by_id[WARD_ID])
        self.assertEqual(context['scenario_score'], context['current_score'])
        self.assertEqual(context['scenario_increment'], 0)
        self.assertEqual(context['selected_annual_projection'], 24)
        self.assertIn('forecast_lower', context)

    def test_missing_model_data_does_not_generate_from_mock_scores(self):
        with patch.dict(main.decile_to_model_score, {}, clear=True), patch('main.openai_explanation') as provider:
            with self.assertRaises(HTTPException) as error:
                main.explain('ward', WARD_ID, source='model')
        self.assertEqual(error.exception.detail['code'], 'model_unavailable')
        provider.assert_not_called()

    def test_sdk_receives_actual_selected_data_and_configured_model(self):
        completion = SimpleNamespace(choices=[SimpleNamespace(finish_reason='stop', message=SimpleNamespace(content='Generated option.'))])
        with patch.dict(os.environ, {'OPENAI_API_KEY':'test-key', 'OPENAI_MODEL':'configured-model'}), patch('openai.OpenAI') as factory:
            client = factory.return_value.__enter__.return_value
            client.chat.completions.create.return_value = completion
            text = main.openai_explanation('ward', main.wards_by_id[WARD_ID], 'Year 2')
        factory.assert_called_once_with(api_key='test-key', timeout=15.0, max_retries=0)
        args = client.chat.completions.create.call_args.kwargs
        self.assertEqual(args['model'], 'configured-model')
        self.assertFalse(args['store'])
        self.assertEqual(args['max_completion_tokens'], 350)
        self.assertNotIn('max_tokens', args)
        self.assertNotIn('reasoning_effort', args)
        context = json.loads(args['messages'][1]['content'])
        self.assertEqual(context['selected_annual_projection'], 23)
        self.assertEqual(text, 'Generated option.')
        self.assertNotIn('test-key', json.dumps(args))

    def test_luna_uses_supported_output_limit_and_disables_reasoning(self):
        for model in ['gpt-6-luna', 'gpt-6-luna-2026-10-01']:
            with self.subTest(model=model), patch.dict(os.environ, {'OPENAI_API_KEY':'test-key', 'OPENAI_MODEL':model}), patch('openai.OpenAI') as factory:
                client = factory.return_value.__enter__.return_value
                client.chat.completions.create.return_value = SimpleNamespace(choices=[SimpleNamespace(finish_reason='stop', message=SimpleNamespace(content='Generated option.'))])
                main.openai_explanation('ward', main.wards_by_id[WARD_ID])
                args = client.chat.completions.create.call_args.kwargs
                self.assertEqual(args['model'], model)
                self.assertEqual(args['max_completion_tokens'], 350)
                self.assertEqual(args['reasoning_effort'], 'none')
                self.assertNotIn('max_tokens', args)

    def test_request_and_model_errors_have_actionable_safe_messages(self):
        request = httpx.Request('POST', 'https://api.openai.com/v1/chat/completions')
        for failure, code in [
            (openai.BadRequestError('secret error', response=httpx.Response(400, request=request), body={}), 'openai_invalid_request'),
            (openai.NotFoundError('secret error', response=httpx.Response(404, request=request), body={}), 'openai_model_unavailable'),
        ]:
            with self.subTest(code=code), patch.dict(os.environ, {'OPENAI_API_KEY':'test-key'}), patch('openai.OpenAI') as factory:
                factory.return_value.__enter__.return_value.chat.completions.create.side_effect = failure
                with self.assertRaises(HTTPException) as error:
                    main.openai_explanation('ward', main.wards_by_id[WARD_ID])
                self.assertEqual(error.exception.detail['code'], code)
                self.assertNotIn('secret error', str(error.exception.detail))

    def test_empty_and_truncated_responses_are_not_replaced_with_templates(self):
        for choices in [[], [SimpleNamespace(finish_reason='stop', message=SimpleNamespace(content=' '))], [SimpleNamespace(finish_reason='length', message=SimpleNamespace(content='Truncated.'))]]:
            with self.subTest(choices=choices), patch.dict(os.environ, {'OPENAI_API_KEY':'test-key'}), patch('openai.OpenAI') as factory:
                factory.return_value.__enter__.return_value.chat.completions.create.return_value = SimpleNamespace(choices=choices)
                with self.assertRaises(HTTPException) as error:
                    main.openai_explanation('ward', main.wards_by_id[WARD_ID])
                self.assertEqual(error.exception.status_code, 502)

    def test_provider_errors_remain_errors_not_mock_success(self):
        request = httpx.Request('POST', 'https://api.openai.com/v1/chat/completions')
        cases = [
            (openai.AuthenticationError('secret error', response=httpx.Response(401, request=request), body={}), 503),
            (openai.PermissionDeniedError('secret error', response=httpx.Response(403, request=request), body={}), 503),
            (openai.RateLimitError('secret error', response=httpx.Response(429, request=request), body={'code':'insufficient_quota'}), 429),
            (openai.APITimeoutError(request=request), 504),
            (openai.APIConnectionError(request=request), 503),
            (openai.BadRequestError('secret error', response=httpx.Response(400, request=request), body={}), 502),
        ]
        for failure, status in cases:
            with self.subTest(failure=type(failure).__name__), patch.dict(os.environ, {'OPENAI_API_KEY':'test-key'}), patch('openai.OpenAI') as factory:
                factory.return_value.__enter__.return_value.chat.completions.create.side_effect = failure
                with self.assertRaises(HTTPException) as error:
                    main.openai_explanation('ward', main.wards_by_id[WARD_ID])
                self.assertEqual(error.exception.status_code, status)
                self.assertNotIn('secret error', str(error.exception.detail))


if __name__ == '__main__':
    unittest.main()
