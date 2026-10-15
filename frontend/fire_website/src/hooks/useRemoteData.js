import { useEffect, useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function useRemoteData(path, attempt) {
  const [resource, setResource] = useState({ path: null, attempt: null, status: 'loading', data: null });
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => controller.abort(), 10000);
    const load = async () => {
      setResource({ path, attempt, status: 'loading', data: null });
      try {
        const response = await fetch(`${BACKEND_URL}${path}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Data unavailable');
        const data = await response.json();
        if (!cancelled) setResource({ path, attempt, status: 'ready', data });
      } catch {
        if (!cancelled) setResource({ path, attempt, status: 'error', data: null });
      } finally {
        clearTimeout(timeout);
      }
    };
    load();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [path, attempt]);
  return resource.path === path && resource.attempt === attempt
    ? resource : { status: 'loading', data: null };
}
