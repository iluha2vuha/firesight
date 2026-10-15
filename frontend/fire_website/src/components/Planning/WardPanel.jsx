import { selectForecast } from '../../utils/forecast';
import { bandLabel, displayedScore, rankedWards, scoreColor } from '../../utils/wards';
import ForecastChart from './ForecastChart';
import Guidance from './Guidance';
import Icon from './Icon';

export default function WardPanel({ features, selected, onSelect, onBack, dataSource, timeFrame, loading, error, onRetry, search, onSearchChange }) {
  const allRanked = rankedWards(features);
  const ranked = rankedWards(features, search);
  const sourceName = dataSource === 'model' ? 'Model' : 'Mock';

  if (selected) {
    const p = selected.properties;
    const score = displayedScore(selected, timeFrame);
    const forecast = selectForecast(p.prediction, timeFrame, dataSource);
    return <>
      <button className="back-button" onClick={onBack}><Icon name="back" size={16}/> All wards</button>
      <div className="detail-title">
        <h2>{p.ward_name}</h2>
        <p className="panel-meta">{sourceName} / Glasgow</p>
      </div>
      <div className="score-card">
        <div>
          <span className="score-label">{timeFrame === 'Current' ? 'Current score' : `${timeFrame} scenario`}</span>
          <div className="score-number" style={{ color: scoreColor(score) }}>{score}<span>/ 100</span></div>
        </div>
        <span className="band-badge" style={{ color: scoreColor(score) }}>{bandLabel(score)} priority</span>
      </div>
      {dataSource === 'model' && <section className="detail-section">
        <h3>{forecast.label} projection</h3>
        {forecast.value != null ? <>
          <div className="forecast-total">{forecast.value}<span> projected incidents</span></div>
          {forecast.lower != null && forecast.upper != null && <p className="projection-range">Range {forecast.lower}–{forecast.upper}</p>}
          <ForecastChart prediction={p.prediction} dataSource={dataSource}/>
        </> : <p className="small-copy">Projection unavailable.</p>}
      </section>}
      <Guidance key={`${p.ward_id}-${dataSource}-${timeFrame}`} wardId={p.ward_id} dataSource={dataSource} timeFrame={timeFrame}/>
      <details key={p.ward_id} className="record-details">
        <summary>Ward information</summary>
        <dl><div><dt>Ward code</dt><dd>{p.ward_id}</dd></div><div><dt>Current score</dt><dd>{p.risk_score} / 100</dd></div></dl>
      </details>
    </>;
  }

  return <>
    <div className="panel-heading"><h2>Glasgow wards</h2><span className="ward-count">{features.length}</span></div>
    <p className="panel-meta">{sourceName} / Sorted by current score</p>
    <label className="search-field">
      <Icon name="search" size={17}/>
      <input aria-label="Search wards" placeholder="Search wards" value={search} onChange={(e) => onSearchChange(e.target.value)}/>
      {search && <button onClick={() => onSearchChange('')} aria-label="Clear search">×</button>}
    </label>
    <div className="list-label"><span>Ward</span><span>Current score</span></div>
    {loading ? <p className="empty-note" role="status">Loading wards…</p>
      : error ? <div className="panel-error" role="alert">
        <h3>Ward data is unavailable</h3><p>Check the backend connection and try again.</p>
        <button className="secondary-button" onClick={onRetry}>Retry connection</button>
      </div> : !ranked.length ? <p className="empty-note" role="status">{search ? 'No wards match your search.' : 'No ward data is available.'}</p>
        : <ol className="ward-list">{ranked.map((feature) => {
          const p = feature.properties;
          const rank = allRanked.findIndex((f) => f.properties.ward_id === p.ward_id) + 1;
          const forecast = selectForecast(p.prediction, timeFrame, dataSource);
          return <li key={p.ward_id}>
            <button className="ward-row" onClick={() => onSelect(p.ward_id)} aria-label={`Inspect ${p.ward_name}`}>
              <span className="ward-rank">{rank}</span>
              <span className="ward-row-main">
                <strong>{p.ward_name}</strong>
                <span>{forecast.value == null ? (dataSource === 'mock' ? 'Sample score' : 'Projection unavailable') : `${forecast.label}: ${forecast.value} projected incidents`}</span>
              </span>
              <span className="row-score" style={{ color: scoreColor(p.risk_score) }}>{p.risk_score}<Icon name="arrow" size={13}/></span>
            </button>
          </li>;
        })}</ol>}
  </>;
}
