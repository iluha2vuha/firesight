import { useEffect, useRef, useState } from 'react';
import { guidanceParagraphs } from '../../utils/data';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function Guidance({ wardId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
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
    setError(false);
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(`${BACKEND_URL}/api/explain?mode=ward&id=${encodeURIComponent(wardId)}&source=model`, { signal: controller.signal });
      if (!response.ok) throw new Error('Guidance unavailable');
      const payload = await response.json();
      if (!guidanceParagraphs(payload?.text).length) throw new Error('Empty guidance');
      if (requestRef.current === controller) setResult(payload);
    } catch {
      if (requestRef.current === controller) setError(true);
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) setLoading(false);
    }
  };

  return <details className="guidance-section">
    <summary>Planning suggestions (Year 1)</summary>
    <p className="small-copy">Suggestions use the Year 1 projection, even when another scenario is selected. Review them alongside local knowledge.</p>
    {!result && <button className="secondary-button" onClick={load} disabled={loading}>
      {loading ? 'Loading suggestions…' : error ? 'Retry suggestions' : 'Load suggestions'}
    </button>}
    {error && <p role="alert" className="error-copy">Suggestions could not be loaded. Try again.</p>}
    {result && <>
      <p className="source-tag">{result.source === 'live' ? 'Generated suggestion' : 'Built-in suggestion'}</p>
      <div className="guidance-copy">{guidanceParagraphs(result.text).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    </>}
  </details>;
}
