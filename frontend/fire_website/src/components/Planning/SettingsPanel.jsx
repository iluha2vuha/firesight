import Icon from './Icon';

export default function SettingsPanel({ dataSource, setDataSource, nightMode, setTheme, status, onRetry, premisesStatus, premisesCount }) {
  return <>
    <div className="panel-heading"><h2>Settings</h2></div>
    <section className="detail-section first-section">
      <h3>Data source</h3>
      <div className="segmented-control" role="group" aria-label="Data source">
        <button aria-pressed={dataSource === 'model'} onClick={() => setDataSource('model')} disabled={status.status === 'ready' && !status.data?.model_loaded}>Model</button>
        <button aria-pressed={dataSource === 'mock'} onClick={() => setDataSource('mock')}>Mock</button>
      </div>
      <ul className="panel-notes">
        <li><strong>Mock:</strong> sample scores, premises and events. Opens by default.</li>
        <li><strong>Model:</strong> scores and fire projections from historical data.</li>
      </ul>
      {status.status === 'error' ? <>
        <p className="error-copy" role="alert">Cannot connect to the backend.</p>
        <button className="secondary-button" onClick={onRetry}>Retry connection</button>
      </> : status.status === 'loading'
        ? <p className="small-copy" role="status">Checking model…</p>
        : <p className="availability">{status.data?.model_loaded ? 'Model ready' : 'Model unavailable. Use Mock or check again.'}</p>}
      {status.status === 'ready' && !status.data?.model_loaded && <button className="secondary-button" onClick={onRetry}>Check model availability</button>}
    </section>
    <section className="detail-section">
      <h3>Appearance</h3>
      <div className="segmented-control" role="group" aria-label="Appearance">
        <button aria-pressed={nightMode} onClick={() => setTheme(true)}><Icon name="moon" size={16}/>Dark</button>
        <button aria-pressed={!nightMode} onClick={() => setTheme(false)}><Icon name="sun" size={16}/>Light</button>
      </div>
      <p className="small-copy">Saved on this device.</p>
    </section>
    <section className="detail-section">
      <h3>Map layers</h3>
      <p className="small-copy">Choose layers and timeframe in the top bar.</p>
      {dataSource === 'mock' ? <><p className="small-copy">{premisesStatus === 'loading' ? 'Loading sample premises…' : premisesStatus === 'ready' ? `${premisesCount} sample premises · 4 archived events` : 'Sample premises unavailable.'}</p>
      {premisesStatus === 'error' && <button className="secondary-button" onClick={onRetry}>Retry premises</button>}</> : <p className="small-copy">Switch to Mock for premises and event examples.</p>}
    </section>
  </>;
}
