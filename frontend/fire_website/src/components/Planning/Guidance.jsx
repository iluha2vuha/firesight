import { useEffect, useRef, useState } from 'react';
import { guidanceParagraphs } from '../../utils/data';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function Guidance({ wardId, dataSource, timeFrame }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(null);
  useEffect(() => () => {
    requestRef.current?.abort();
    requestRef.current = null;
  }, []);

  const load = async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError('');
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const query = new URLSearchParams({ mode:'ward', id:wardId, source:dataSource, period:timeFrame });
      const response = await fetch(`${BACKEND_URL}/api/explain?${query}`, { signal:controller.signal });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof payload?.detail?.message === 'string' ? payload.detail.message : 'Suggestions could not be loaded. Try again.');
      const expectedSource = dataSource === 'model' ? 'openai' : 'mock';
      if (payload?.source !== expectedSource || payload.data_source !== dataSource || payload.id !== wardId || payload.period !== timeFrame || !guidanceParagraphs(payload.text).length) {
        throw new Error('Suggestions did not match this ward and timeframe. Try again.');
      }
      if (requestRef.current === controller) setResult(payload);
    } catch (error) {
      if (requestRef.current === controller) setError(error.name === 'AbortError' ? 'Suggestions took too long. Try again.' : error.message);
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) setLoading(false);
    }
  };

  return <details className="guidance-section" aria-busy={loading}>
    <summary>{dataSource === 'mock' ? 'Sample suggestions' : 'Planning suggestions'}</summary>
    {!result && <button className="secondary-button" onClick={load} disabled={loading}>
      {loading ? (dataSource === 'model' ? 'Generating…' : 'Loading…') : error ? 'Retry suggestions' : dataSource === 'model' ? 'Generate suggestions' : 'Show suggestions'}
    </button>}
    {error && <p role="alert" className="error-copy">{error}</p>}
    {result && <>
      <p className="source-tag">{dataSource === 'model' ? 'OpenAI' : 'Sample'} · {timeFrame}</p>
      <div className="guidance-copy">{guidanceParagraphs(result.text).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    </>}
  </details>;
}
