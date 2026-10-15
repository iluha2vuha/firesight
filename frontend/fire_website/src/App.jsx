import { useEffect, useRef, useState } from 'react';
import './App.css';
import RiskMap from './components/Map/RiskMap';
import WardPanel from './components/Planning/WardPanel';
import Icon from './components/Planning/Icon';
import { timeframeLabel } from './utils/forecast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const PERIODS = ['Current', 'In 6 months', 'In 1 year', 'In 1.5 years'];

function useRemoteData(path, attempt) {
  const [resource, setResource] = useState({ path: null, status: 'loading', data: null });
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => controller.abort(), 10000);
    const load = async () => {
      setResource({ path, status: 'loading', data: null });
      try {
        const response = await fetch(`${BACKEND_URL}${path}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Data unavailable');
        const data = await response.json();
        if (!cancelled) setResource({ path, status: 'ready', data });
      } catch {
        if (!cancelled) setResource({ path, status: 'error', data: null });
      } finally { clearTimeout(timeout); }
    };
    load();
    return () => { cancelled = true; controller.abort(); clearTimeout(timeout); };
  }, [path, attempt]);
  return resource.path === path ? resource : { status: 'loading', data: null };
}

function MethodPanel() {
  return <>
    <div className="panel-heading"><div><span className="eyebrow">READING THE DATA</span><h2>Data & method</h2></div></div>
    <section className="detail-section"><h3>Priority score ≠ fire probability</h3><p className="small-copy">The 0–100 score is a relative planning indicator. Higher scores suggest an area to review; lower scores do not establish safety.</p></section>
    <section className="detail-section"><span className="source-tag">SIMD 2020</span><h3>How ward scores are derived</h3><p className="small-copy">DataZone scores combine deprivation, overcrowding, health vulnerability, central heating and crime indicators. The ward map uses the mean zone score for the ward’s assigned deprivation decile. This is a proxy, not a spatial aggregation of every zone inside a ward.</p></section>
    <section className="detail-section"><span className="source-tag">2009/10–2022/23</span><h3>Historical fire projections</h3><p className="small-copy">The model fits a recency-weighted linear trend to 14 annual observations of dwelling fires. Year 1, 2 and 3 are separate annual counts after the training period, not cumulative totals or a forecast trained on today’s data.</p><p className="small-copy">The displayed range is an indicative residual-based band for Year 1. Forecast accuracy and uncertainty coverage have not been validated.</p></section>
    <section className="detail-section"><h3>Scenario adjustments</h3><p className="small-copy">Selecting later periods adds 4, 8 or 12 points to the current score, capped at 100. These fixed adjustments illustrate planning scenarios; they are not predictions learned by the model. The ward ranking always uses current scores.</p></section>
    <section className="detail-section"><h3>Sample layers</h3><p className="small-copy">Mock mode uses illustrative ward data. City-centre premises are examples with authored scores and inspection priorities, not verified live risk records. They are hidden by default and remain examples in either data mode.</p></section>
    <div className="panel-footnote"><Icon name="info"/><p>Student prototype. Not validated for operational fire-safety decisions.</p></div>
  </>;
}

export default function App() {
  const [dataSource, setDataSource] = useState('model');
  const [timeFrame, setTimeFrame] = useState('Current');
  const [attempt, setAttempt] = useState(0);
  const [showWards, setShowWards] = useState(true);
  const [showPremises, setShowPremises] = useState(false);
  const [panel, setPanel] = useState('wards');
  const [selectedId, setSelectedId] = useState(null);
  const panelRef = useRef(null);
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
    if (window.matchMedia('(max-width: 800px)').matches && (selectedId || panel !== 'wards')) {
      panelRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [selectedId, panel, dataSource]);
  const [nightMode, setNightMode] = useState(() => {
    try { return window.localStorage.getItem('fireSightNightMode') !== 'false'; }
    catch { return true; }
  });
  const status = useRemoteData('/api/status', attempt);
  const wardResource = useRemoteData(`/api/strategic/wards.geojson?source=${dataSource}`, attempt);
  const premisesResource = useRemoteData('/api/premises?focus=city-centre&risk_band=high', attempt);
  const validWards = wardResource.data?.type === 'FeatureCollection'
    && Array.isArray(wardResource.data.features)
    && wardResource.data.features.every((f) => Number.isFinite(f.properties?.risk_score)
      && (dataSource !== 'model' || f.properties.data_source === 'model'));
  const features = validWards ? wardResource.data.features : [];
  const wardError = wardResource.status === 'error' || (wardResource.status === 'ready' && !validWards);
  const selected = features.find((f) => f.properties.ward_id === selectedId) || null;
  const premises = Array.isArray(premisesResource.data) ? premisesResource.data : [];
  const retry = () => setAttempt((value) => value + 1);
  const chooseWard = (id) => { setSelectedId(id); setPanel('wards'); };
  const setTheme = (dark) => {
    setNightMode(dark);
    try { window.localStorage.setItem('fireSightNightMode', String(dark)); } catch { /* Storage can be unavailable. */ }
  };

  return <div className={`planning-app${nightMode ? ' night-mode' : ''}`}>
    <nav className="app-rail" aria-label="Workspace navigation">
      <button className={`rail-button${panel === 'wards' ? ' active' : ''}`} onClick={() => { setPanel('wards'); setSelectedId(null); }} aria-label="Priority wards" title="Priority wards"><Icon name="map"/><span>Wards</span></button>
      <button className={`rail-button${panel === 'method' ? ' active' : ''}`} onClick={() => setPanel('method')} aria-label="Data and method" title="Data and method"><Icon name="info"/><span>Data</span></button>
      <div className="rail-spacer"/>
      <button className={`rail-button${panel === 'settings' ? ' active' : ''}`} onClick={() => setPanel('settings')} aria-label="Settings" title="Settings"><Icon name="settings"/><span>Settings</span></button>
    </nav>
    <main className="planning-main">
      <div className="filter-bar">
        <div className="location-title"><Icon name="pin" size={18}/><strong>Glasgow</strong><span>City wards</span></div>
        <div className="filter-divider"/>
        <label className="layer-filter"><input type="checkbox" checked={showWards} onChange={(e) => setShowWards(e.target.checked)}/><span>Ward scores</span></label>
        <label className="layer-filter"><input type="checkbox" checked={showPremises} onChange={(e) => setShowPremises(e.target.checked)}/><span>City-centre premises</span><span className="sample-tag">Sample</span></label>
        <div className="filter-spacer"/>
        <label className="period-filter"><span>Projection</span><select aria-label="Projection period" value={timeFrame} onChange={(e) => setTimeFrame(e.target.value)}>{PERIODS.map((period) => <option key={period} value={period}>{timeframeLabel(period, dataSource)}</option>)}</select></label>
      </div>
      <div className="workspace">
        <section className="map-stage" aria-label="Glasgow ward map">
          <div className="map-caption"><span className={`status-dot${wardError ? ' error' : ''}`}/><span>{dataSource === 'model' ? 'Historical model' : 'Mock · sample data'}</span><span className="caption-divider">/</span><span>{features.length} wards</span>{timeFrame !== 'Current' && <span className="scenario-tag">Illustrative score scenario</span>}</div>
          <RiskMap features={features} timeFrame={timeFrame} nightMode={nightMode} showWards={showWards} showPremises={showPremises} premises={premises} selectedId={selectedId} onSelect={chooseWard}/>
          {(wardResource.status === 'loading' || wardError) && <div className="map-notice" role={wardError ? 'alert' : 'status'}>{wardError ? <><strong>Unable to load ward data</strong><span>Check the backend connection and retry. If model output is missing, select Mock in Settings.</span><button className="secondary-button" onClick={retry}>Retry connection</button></> : 'Loading Glasgow wards…'}</div>}
          {showPremises && premisesResource.status !== 'ready' && <div className="layer-notice" role="status">{premisesResource.status === 'error' ? <><span>Example premises could not be loaded.</span><button onClick={retry}>Retry</button></> : 'Loading example premises…'}</div>}
          <div className="map-disclaimer">Planning prototype · scores are not fire probabilities</div>
        </section>
        <aside ref={panelRef} className="insight-panel" aria-label={panel === 'wards' ? 'Ward priorities and details' : panel === 'method' ? 'Data and method' : 'Settings'}>
          {panel === 'wards' && <WardPanel features={features} selected={selected} onSelect={chooseWard} onBack={() => setSelectedId(null)} dataSource={dataSource} timeFrame={timeFrame} loading={wardResource.status === 'loading'} error={wardError} onRetry={retry}/>}
          {panel === 'method' && <MethodPanel/>}
          {panel === 'settings' && <>
            <div className="panel-heading"><div><span className="eyebrow">WORKSPACE</span><h2>Settings</h2></div></div>
            <section className="detail-section"><h3>Data source</h3><div className="segmented-control" role="group" aria-label="Data source"><button aria-pressed={dataSource === 'model'} onClick={() => setDataSource('model')} disabled={status.status === 'ready' && !status.data?.model_loaded}>Model</button><button aria-pressed={dataSource === 'mock'} onClick={() => setDataSource('mock')}>Mock</button></div><p className="small-copy">Model uses historical statistics and derived scores. Mock uses sample ward scores and incident counts.</p>{status.status === 'error' ? <><p className="error-copy" role="alert">Backend connection unavailable.</p><button className="secondary-button" onClick={retry}>Retry connection</button></> : status.status === 'loading' ? <p className="small-copy" role="status">Checking model availability…</p> : <p className="availability"><span className="status-dot"/>{status.data?.model_loaded ? 'Model output available' : 'Model output not loaded'}</p>}</section>
            <section className="detail-section"><h3>Appearance</h3><div className="segmented-control" role="group" aria-label="Appearance"><button aria-pressed={nightMode} onClick={() => setTheme(true)}><Icon name="moon" size={16}/>Dark</button><button aria-pressed={!nightMode} onClick={() => setTheme(false)}><Icon name="sun" size={16}/>Light</button></div><p className="small-copy">Your preference is saved on this device.</p></section>
            <section className="detail-section"><h3>Map layers</h3><p className="small-copy">Use the filter bar above the map to show ward scores and sample city-centre premises, or change the projection period.</p><p className="small-copy">{premisesResource.status === 'ready' ? `${premises.length} higher-score example premises available.` : 'Example premises data is not currently available.'}</p></section>
          </>}
        </aside>
      </div>
    </main>
  </div>;
}
