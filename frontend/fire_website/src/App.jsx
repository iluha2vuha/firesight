import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import RiskMap from './components/Map/RiskMap';
import MapLegend from './components/Map/MapLegend';
import WardPanel from './components/Planning/WardPanel';
import SettingsPanel from './components/Planning/SettingsPanel';
import DataPanel from './components/Planning/DataPanel';
import Icon from './components/Planning/Icon';
import useRemoteData from './hooks/useRemoteData';
import { TIME_FRAME_OPTIONS } from './utils/forecast';
import { validPremisesData, validWardData } from './utils/data';

export default function App() {
  const [dataSource, setDataSource] = useState('mock');
  const [selectedPeriod, setTimeFrame] = useState('Current');
  const timeFrame = TIME_FRAME_OPTIONS.includes(selectedPeriod) ? selectedPeriod : 'Current';
  const [attempt, setAttempt] = useState(0);
  const [showWards, setShowWards] = useState(true);
  const [premisesEnabled, setShowPremises] = useState(false);
  const showPremises = dataSource === 'mock' && premisesEnabled;
  const [eventsEnabled, setShowEvents] = useState(false);
  const showEvents = dataSource === 'mock' && eventsEnabled;
  const [panel, setPanel] = useState('wards');
  const [panelOpen, setPanelOpen] = useState(true);
  const [dockHeight, setDockHeight] = useState(84);
  const dockRef = useRef(null);
  const sidebarRef = useRef(null);
  const returnFocusRef = useRef(null);
  const wardsButtonRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [overviewRequest, setOverviewRequest] = useState(0);
  const [search, setSearch] = useState('');
  const panelRef = useRef(null);
  const [nightMode, setNightMode] = useState(() => {
    try { return window.localStorage.getItem('fireSightNightMode') !== 'false'; }
    catch { return true; }
  });

  const closeSidebar = useCallback(() => {
    setPanelOpen(false);
    const trigger = returnFocusRef.current?.isConnected ? returnFocusRef.current : wardsButtonRef.current;
    trigger?.focus({ preventScroll:true });
  }, []);

  const showAllWards = () => {
    setSelectedId(null);
    setSearch('');
    setShowWards(true);
    setPanel('wards');
    setPanelOpen(true);
    setOverviewRequest((request) => request + 1);
  };

  const togglePanel = (next) => {
    returnFocusRef.current = document.activeElement;
    if (next === 'wards') { showAllWards(); return; }
    if (panel === next && panelOpen) { closeSidebar(); return; }
    setPanel(next);
    setPanelOpen(true);
  };

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setDockHeight(entry.target.getBoundingClientRect().height));
    if (dockRef.current) observer.observe(dockRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    panelRef.current?.scrollTo({ top:0 });
  }, [selectedId, panel, dataSource, panelOpen]);

  useEffect(() => {
    if (panelOpen) sidebarRef.current?.focus({ preventScroll:true });
  }, [panelOpen, panel, selectedId]);

  useEffect(() => {
    if (!panelOpen) return;
    const handleKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeSidebar(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [panelOpen, closeSidebar]);

  const rawStatus = useRemoteData('/api/status', attempt);
  const status = rawStatus.status === 'ready' && typeof rawStatus.data?.model_loaded !== 'boolean'
    ? { status: 'error', data: null } : rawStatus;
  const wardResource = useRemoteData(`/api/strategic/wards.geojson?source=${dataSource}`, attempt);
  const premisesResource = useRemoteData(dataSource === 'mock' ? '/api/premises?focus=city-centre&risk_band=high' : null, attempt);
  const wardsValid = validWardData(wardResource.data, dataSource);
  const features = wardsValid ? wardResource.data.features : [];
  const wardError = wardResource.status === 'error' || (wardResource.status === 'ready' && !wardsValid);
  const selected = features.find((f) => f.properties.ward_id === selectedId) || null;
  const premisesValid = validPremisesData(premisesResource.data);
  const premises = premisesValid ? premisesResource.data : [];
  const premisesStatus = premisesResource.status === 'ready' && !premisesValid ? 'error' : premisesResource.status;
  const retry = () => setAttempt((value) => value + 1);
  const chooseWard = (id) => {
    returnFocusRef.current = document.activeElement;
    setSelectedId(id);
    setShowWards(true);
    setPanel('wards');
    setPanelOpen(true);
    setOverviewRequest((request) => request + 1);
  };
  const setTheme = (dark) => {
    setNightMode(dark);
    try { window.localStorage.setItem('fireSightNightMode', String(dark)); } catch { /* Storage may be unavailable. */ }
  };

  return <div className={`planning-app${nightMode ? ' night-mode' : ''}`} style={{'--dock-height':`${dockHeight}px`}}>
    <nav className="app-rail" aria-label="Workspace navigation">
      <button className={`rail-button${panelOpen && panel === 'wards' ? ' active' : ''}`} ref={wardsButtonRef} aria-expanded={panelOpen && panel === 'wards'} aria-controls="insight-panel" onClick={() => togglePanel('wards')} aria-label="Priority wards" title="Priority wards">
        <Icon name="map"/><span>Wards</span>
      </button>
      <div className="rail-spacer"/>
      <button className={`rail-button${panelOpen && panel === 'method' ? ' active' : ''}`} aria-expanded={panelOpen && panel === 'method'} aria-controls="insight-panel" onClick={() => togglePanel('method')} aria-label="Data and method" title="Data and method">
        <Icon name="info"/><span>Data</span>
      </button>
      <button className={`rail-button${panelOpen && panel === 'settings' ? ' active' : ''}`} aria-expanded={panelOpen && panel === 'settings'} aria-controls="insight-panel" onClick={() => togglePanel('settings')} aria-label="Settings" title="Settings">
        <Icon name="settings"/><span>Settings</span>
      </button>
    </nav>
    <main className="planning-main">
      <div className={`workspace${panelOpen ? ' sidebar-open' : ''}`}>
        <div className="dock-area">
          <div ref={dockRef} className="filter-dock" role="group" aria-label="Map filters">
            <label className="dock-toggle">
              <input type="checkbox" checked={showWards} onChange={(e) => { setShowWards(e.target.checked); if (e.target.checked) setOverviewRequest((request) => request + 1); }}/>
              <span className="dock-icon dock-icon-wards"><Icon name="map" size={20}/></span>
              <span>Ward scores</span>
            </label>
            {dataSource === 'mock' && <label className="dock-toggle">
              <input aria-label="High-risk premises examples" type="checkbox" checked={showPremises} onChange={(e) => setShowPremises(e.target.checked)}/>
              <span className="dock-icon dock-icon-premises"><Icon name="pin" size={20}/></span>
              <span>Premises</span>
            </label>}
            {dataSource === 'mock' && <label className="dock-toggle">
              <input aria-label="Event examples" type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)}/>
              <span className="dock-icon dock-icon-events"><Icon name="calendar" size={20}/></span>
              <span>Events</span>
            </label>}
            <div className="dock-period">
              <span>Timeframe</span>
              <div className="period-options" role="group" aria-label="Projection period">
                {TIME_FRAME_OPTIONS.map((period) => <button key={period} aria-pressed={timeFrame === period} onClick={() => setTimeFrame(period)}>{period}</button>)}
              </div>
            </div>
            {((showWards && features.length > 0) || (showPremises && premises.length > 0) || showEvents) && <MapLegend timeFrame={timeFrame} showWards={showWards && features.length > 0} showPremises={showPremises && premises.length > 0} showEvents={showEvents}/>}
          </div>
        </div>
        <section className="map-stage" aria-label="Glasgow ward map">
          <RiskMap overviewRequest={overviewRequest} panelOpen={panelOpen} dockHeight={dockHeight} features={features} timeFrame={timeFrame} nightMode={nightMode} showWards={showWards} showPremises={showPremises} showEvents={showEvents} premises={premises} selectedId={selectedId} onSelect={chooseWard}/>
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
        <aside id="insight-panel" ref={sidebarRef} hidden={!panelOpen} tabIndex={-1} className="insight-panel" aria-label={panel === 'wards' ? 'Ward priorities and details' : panel === 'method' ? 'Data and method' : 'Settings'}>
          {panelOpen && <>
            <button className="sidebar-close" aria-label="Close sidebar" title="Close sidebar" onClick={closeSidebar}><Icon name="close"/></button>
            <div ref={panelRef} className="panel-content">
              {panel === 'wards' && <WardPanel features={features} selected={selected} onSelect={chooseWard} onBack={showAllWards} dataSource={dataSource} timeFrame={timeFrame} loading={wardResource.status === 'loading'} error={wardError} onRetry={retry} search={search} onSearchChange={setSearch}/>}
              {panel === 'method' && <DataPanel/>}
              {panel === 'settings' && <SettingsPanel dataSource={dataSource} setDataSource={setDataSource} nightMode={nightMode} setTheme={setTheme} status={status} onRetry={retry} premisesStatus={premisesStatus} premisesCount={premises.length}/>}
            </div>
          </>}
        </aside>
      </div>
    </main>
  </div>;
}
