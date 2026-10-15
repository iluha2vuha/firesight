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
      <p className="small-copy">Model uses historical statistics and derived scores. Mock uses sample scores. Both use Current and Years 1–3; annual fire projections are available in Model mode.</p>
      {status.status === 'error' ? <>
        <p className="error-copy" role="alert">Backend connection unavailable.</p>
        <button className="secondary-button" onClick={onRetry}>Retry connection</button>
      </> : status.status === 'loading'
        ? <p className="small-copy" role="status">Checking model availability…</p>
        : <p className="availability">{status.data?.model_loaded ? 'Model output available' : 'Model output not loaded. Choose Mock to use sample scores.'}</p>}
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
      <p className="small-copy">Use the dock at the top of the map to change layers or the scenario year.</p>
      <p className="small-copy">{premisesStatus === 'loading' ? 'Loading city-centre examples…' : premisesStatus === 'ready' ? `${premisesCount} sample premises available.` : 'Sample premises are unavailable.'}</p>
      {premisesStatus === 'error' && <button className="secondary-button" onClick={onRetry}>Retry premises</button>}
    </section>
  </>;
}
