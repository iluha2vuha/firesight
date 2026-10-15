import { useState } from 'react';
import { selectForecast } from '../../utils/forecast';
import { bandLabel, displayedScore, rankedWards, scoreColor } from '../../utils/wards';
import ForecastChart from './ForecastChart';
import Icon from './Icon';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function Guidance({ ward, dataSource }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const load = async () => {
    setLoading(true);
    setError(false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(`${BACKEND_URL}/api/explain?mode=ward&id=${encodeURIComponent(ward.ward_id)}&source=${dataSource}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Guidance unavailable');
      setResult(await response.json());
    } catch { setError(true); }
    finally { clearTimeout(timeout); setLoading(false); }
  };
  return <section className="detail-section">
    <div className="section-heading"><h3>Planning guidance</h3><span className="text-muted">Optional</span></div>
    <p className="small-copy">Review suggestions alongside local knowledge. They do not prescribe an inspection or establish building safety.</p>
    {!result && <button className="secondary-button" onClick={load} disabled={loading}>{loading ? 'Loading guidance…' : error ? 'Retry guidance' : 'Load guidance'}<Icon name="arrow" size={15}/></button>}
    {error && <p role="alert" className="error-copy">Guidance could not be loaded. Try again.</p>}
    {result && <><span className="source-tag">{result.source === 'live' ? 'Generated suggestion' : 'Built-in suggestion'} · {dataSource === 'model' ? 'Year 1' : '6-month'} context</span><p className="guidance-copy">{result.text}</p></>}
  </section>;
}

export default function WardPanel({ features, selected, onSelect, onBack, dataSource, timeFrame, loading, error, onRetry }) {
  const [search, setSearch] = useState('');
  const ranked = rankedWards(features, search);
  if (selected) {
    const p = selected.properties;
    const score = displayedScore(selected, timeFrame);
    const forecast = selectForecast(p.prediction, timeFrame, dataSource);
    return <>
      <div className="panel-heading"><button className="back-button" onClick={onBack}><Icon name="back" size={16}/> All wards</button><span className="eyebrow">WARD DETAIL</span></div>
      <div className="detail-title"><span className="eyebrow">GLASGOW CITY</span><h2>{p.ward_name}</h2><span className="ward-code">{p.ward_id}</span></div>
      <div className="score-card">
        <div><span className="eyebrow">{timeFrame === 'Current' ? 'CURRENT PRIORITY SCORE' : 'SCENARIO PRIORITY SCORE'}</span><div className="score-number" style={{color:scoreColor(score)}}>{score}<span>/ 100</span></div></div>
        <span className="band-badge" style={{color:scoreColor(score)}}>{bandLabel(score)} band</span>
      </div>
      {timeFrame !== 'Current' && <p className="scenario-note">Current score {p.risk_score} + {displayedScore({properties:{risk_score:0}}, timeFrame)} scenario points, capped at 100. This adjustment is illustrative.</p>}
      <section className="detail-section">
        <div className="section-heading"><h3>{forecast.label} forecast</h3><span className="source-tag">{dataSource === 'model' ? 'Historical model' : 'Sample data'}</span></div>
        {forecast.value != null ? <><div className="forecast-total">{forecast.value}<span> projected incidents</span></div>
          {forecast.lower != null && forecast.upper != null && <p className="small-copy">Indicative range {forecast.lower}–{forecast.upper} · first period only</p>}
          <ForecastChart prediction={p.prediction} dataSource={dataSource}/>
          <p className="small-copy">{dataSource === 'model' ? 'Counts for each projected year, not cumulative totals. Based on 2009/10–2022/23 observations.' : 'Illustrative values from sample incident history, not observed fire statistics.'}</p></>
          : <p className="empty-note">No forecast is available for this ward.</p>}
      </section>
      <section className="detail-section"><div className="section-heading"><h3>Ward context</h3></div><p className="small-copy">Context supplied with the ward data; these are not measured contributions to the score.</p><ul className="context-list">{(p.drivers || []).map((driver) => <li key={driver}>{driver}</li>)}</ul></section>
      <Guidance key={`${p.ward_id}-${dataSource}`} ward={p} dataSource={dataSource}/>
    </>;
  }
  return <>
    <div className="panel-heading"><div><span className="eyebrow">WHERE TO LOOK FIRST</span><h2>Priority wards</h2></div><span className="count-badge">{features.length}</span></div>
    <p className="panel-intro">Ranked by current priority score. Select a ward to explore its indicators and projections.</p>
    <label className="search-field"><Icon name="search" size={17}/><input aria-label="Search wards" placeholder="Find a ward or ward code…" value={search} onChange={(e) => setSearch(e.target.value)}/>{search && <button onClick={() => setSearch('')} aria-label="Clear search">×</button>}</label>
    <div className="list-label"><span>WARD</span><span>CURRENT SCORE</span></div>
    {loading ? <p className="empty-note" role="status">Loading Glasgow wards…</p> : error ? <div className="panel-error" role="alert"><h3>Ward data is unavailable</h3><p>Check the backend connection and try again.</p><button className="secondary-button" onClick={onRetry}>Retry connection</button></div> : !ranked.length ? <p className="empty-note" role="status">{search ? 'No wards match your search.' : 'No ward data is available.'}</p> : <ol className="ward-list">{ranked.map((feature) => {
      const p = feature.properties;
      const rank = rankedWards(features).findIndex((f) => f.properties.ward_id === p.ward_id) + 1;
      const forecast = selectForecast(p.prediction, timeFrame, dataSource);
      return <li key={p.ward_id}><button className="ward-row" onClick={() => onSelect(p.ward_id)} aria-label={`Inspect ${p.ward_name}`}><span className="ward-rank">{String(rank).padStart(2,'0')}</span><span className="ward-row-main"><strong>{p.ward_name}</strong><span>{forecast.value == null ? 'Forecast unavailable' : `${forecast.label}: ${forecast.value} projected incidents`}</span><span className="score-track"><span style={{width:`${p.risk_score}%`,background:scoreColor(p.risk_score)}}/></span></span><span className="row-score" style={{color:scoreColor(p.risk_score)}}>{p.risk_score}<Icon name="arrow" size={13}/></span></button></li>;
    })}</ol>}
    <div className="panel-footnote"><Icon name="info" size={16}/><p>A relative planning indicator, not a probability of fire or a building safety rating.</p></div>
  </>;
}
