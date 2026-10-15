import json
import unittest

import main


class ModelDataContractTests(unittest.TestCase):
    def test_forecasts_cover_exactly_the_map_wards(self):
        self.assertEqual(len(main.wards_by_id), 23)
        self.assertEqual(set(main.ward_forecasts), set(main.wards_by_id))

    def test_north_east_uses_its_real_forecast(self):
        ward = main.get_strategic_ward('S13003133', source='model')['properties']
        self.assertEqual(ward['data_source'], 'model')
        self.assertEqual(ward['prediction']['forecast_6mo'], 24)
        self.assertEqual(ward['prediction']['forecast_12mo'], 23)
        self.assertEqual(ward['prediction']['forecast_18mo'], 22)

    def test_data_zones_have_unique_labels_and_preserve_intermediate_areas(self):
        self.assertEqual(len(main.zones), 746)
        self.assertEqual(len({z['zonename'] for z in main.zones}), 746)
        shared_area = [z for z in main.zones if z['intermediatezoneid'] == 'S02001949']
        self.assertGreater(len(shared_area), 1)
        self.assertEqual(len({z['zonename'] for z in shared_area}), len(shared_area))

    def test_model_explanations_use_annual_units(self):
        ward = main.wards_by_id['S13003133']
        explanation = main.fallback_ward_explanation_model(ward)
        self.assertIn('Year 1', explanation)
        self.assertNotIn('6 months', explanation)
        context = main._ai_context('ward', ward, source='model')
        self.assertIn('annual count', context)
        self.assertNotIn('/6mo', context)
        payload = main.build_explain_payload('ward', ward, source='model')
        self.assertEqual(payload['forecast_period_unit'], 'year')
        self.assertEqual(payload['forecast_year_1'], 24)
        self.assertEqual(payload['forecast_year_2'], 23)
        self.assertEqual(payload['forecast_year_3'], 22)
        self.assertNotIn('forecast_6mo', payload)
        self.assertEqual(payload['n_years'], 14)
        self.assertNotIn('accidental dwelling', payload['data_basis'])
        self.assertIn('indicative residual-based band', payload['data_basis'])

    def test_model_responses_are_json_serializable(self):
        json.dumps(main.get_strategic_wards_geojson(source='model'), allow_nan=False)
        json.dumps(main.top_zones(5), allow_nan=False)


if __name__ == '__main__':
    unittest.main()
