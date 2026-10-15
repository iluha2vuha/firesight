import { useEffect, useRef, useState } from 'react';
import './App.css';
import RiskMap from './components/Map/RiskMap';
import WardPanel from './components/Planning/WardPanel';
import SettingsPanel from './components/Planning/SettingsPanel';
import DataPanel from './components/Planning/DataPanel';
import Icon from './components/Planning/Icon';
import useRemoteData from './hooks/useRemoteData';
import { TIME_FRAME_OPTIONS } from './utils/forecast';
import { validPremisesData, validWardData } from './utils/data';

export default function App() {
  const [dataSource, setDataSource] = useState('model');
  const [selectedPeriod, setTimeFrame] = useState('Current');
  const timeFrame = TIME_FRAME_OPTIONS.includes(selectedPeriod) ? selectedPeriod : 'Current';
  const [attempt, setAttempt] = useState(0);
  const [showWards, setShowWards] = useState(true);
  const [showPremises, setShowPremises] = useState(false);
  const [panel, setPanel] = useState('wards');
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const panelRef = useRef(null);
  const [nightMode, setNightMode] = useState(() => {
    try { return window.localStorage.getItem('fireSightNightMode') !== 'false'; }
    catch { return true; }
  });

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
    if (window.matchMedia('(max-width: 800px)').matches && (selectedId || panel !== 'wards')) {
      panelRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [selectedId, panel, dataSource]);

  const rawStatus = useRemoteData('/api/status', attempt);
  const status = rawStatus.status === 'ready' && typeof rawStatus.data?.model_loaded !== 'boolean'
    ? { status: 'error', data: null } : rawStatus;
  const wardResource = useRemoteData(`/api/strategic/wards.geojson?source=${dataSource}`, attempt);
  const premisesResource = useRemoteData('/api/premises?focus=city-centre&risk_band=high', attempt);
  const wardsValid = validWardData(wardResource.data, dataSource);
  const features = wardsValid ? wardResource.data.features : [];
  const wardError = wardResource.status === 'error' || (wardResource.status === 'ready' && !wardsValid);
  const selected = features.find((f) => f.properties.ward_id === selectedId) || null;
  const premisesValid = validPremisesData(premisesResource.data);
  const premises = premisesValid ? premisesResource.data : [];
  const premisesStatus = premisesResource.status === 'ready' && !premisesValid ? 'error' : premisesResource.status;
  const retry = () => setAttempt((value) => value + 1);
  const chooseWard = (id) => { setSelectedId(id); setPanel('wards'); };
  const setTheme = (dark) => {
    setNightMode(dark);
    try { window.localStorage.setItem('fireSightNightMode', String(dark)); } catch { /* Storage may be unavailable. */ }
  };

  return <div className={`planning-app${nightMode ? ' night-mode' : ''}`}>
    <nav className="app-rail" aria-label="Workspace navigation">
      <button className={`rail-button${panel === 'wards' ? ' active' : ''}`} aria-current={panel === 'wards' ? 'page' : undefined} onClick={() => { setPanel('wards'); setSelectedId(null); }} aria-label="Priority wards" title="Priority wards">
        <Icon name="map"/><span>Wards</span>
      </button>
      <button className={`rail-button${panel === 'method' ? ' active' : ''}`} aria-current={panel === 'method' ? 'page' : undefined} onClick={() => setPanel('method')} aria-label="Data and method" title="Data and method">
        <Icon name="info"/><span>Data</span>
      </button>
      <div className="rail-spacer"/>
      <button className={`rail-button${panel === 'settings' ? ' active' : ''}`} aria-current={panel === 'settings' ? 'page' : undefined} onClick={() => setPanel('settings')} aria-label="Settings" title="Settings">
        <Icon name="settings"/><span>Settings</span>
      </button>
    </nav>
    <main className="planning-main">
      <div className="workspace">
        <section className="map-stage" aria-label="Glasgow ward map">
          <div className="filter-dock" role="group" aria-label="Map filters">
            <label className="dock-toggle">
              <input type="checkbox" checked={showWards} onChange={(e) => setShowWards(e.target.checked)}/>
              <span className="dock-icon dock-icon-wards"><Icon name="map" size={25}/></span>
              <span>Ward scores</span>
            </label>
            <label className="dock-toggle">
              <input type="checkbox" checked={showPremises} onChange={(e) => setShowPremises(e.target.checked)}/>
              <span className="dock-icon dock-icon-premises"><Icon name="pin" size={25}/></span>
              <span>City-centre examples</span>
            </label>
            <label className="dock-period">
              <span>Projection</span>
              <select aria-label="Projection period" value={timeFrame} onChange={(e) => setTimeFrame(e.target.value)}>
                {TIME_FRAME_OPTIONS.map((period) => <option key={period} value={period}>{period}</option>)}
              </select>
            </label>
          </div>
          <RiskMap features={features} timeFrame={timeFrame} nightMode={nightMode} showWards={showWards} showPremises={showPremises} premises={premises} selectedId={selectedId} onSelect={chooseWard}/>
          <div className="map-notices">
            {(wardResource.status === 'loading' || wardError) && <div className="map-notice" role={wardError ? 'alert' : 'status'}>
              {wardError ? <>
                <strong>Ward data could not be loaded</strong>
                <span>Check the backend and retry. If model output is missing, choose Mock in Settings.</span>
                <button className="secondary-button" onClick={retry}>Retry connection</button>
              </> : 'Loading Glasgow wards…'}
            </div>}
            {showPremises && (premisesStatus !== 'ready' || !premises.length) && <div className="layer-notice" role="status">
              {premisesStatus === 'error' ? <>
                <span>City-centre examples could not be loaded.</span><button onClick={retry}>Retry premises</button>
              </> : premisesStatus === 'loading' ? 'Loading city-centre examples…' : 'No city-centre examples available.'}
            </div>}
          </div>
        </section>
        <aside ref={panelRef} className="insight-panel" aria-label={panel === 'wards' ? 'Ward priorities and details' : panel === 'method' ? 'Data and method' : 'Settings'}>
          {panel === 'wards' && <WardPanel features={features} selected={selected} onSelect={chooseWard} onBack={() => setSelectedId(null)} dataSource={dataSource} timeFrame={timeFrame} loading={wardResource.status === 'loading'} error={wardError} onRetry={retry} search={search} onSearchChange={setSearch}/>}
          {panel === 'method' && <DataPanel/>}
          {panel === 'settings' && <SettingsPanel dataSource={dataSource} setDataSource={setDataSource} nightMode={nightMode} setTheme={setTheme} status={status} onRetry={retry} premisesStatus={premisesStatus} premisesCount={premises.length}/>}
        </aside>
      </div>
    </main>
  </div>;
}
