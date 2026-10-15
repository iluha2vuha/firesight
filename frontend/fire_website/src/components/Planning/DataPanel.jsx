export default function DataPanel() {
  return <>
    <div className="panel-heading"><h2>Data & method</h2></div>
    <section className="detail-section first-section">
      <h3>Ward scores</h3>
      <ul className="panel-notes">
        <li>Scores run from 0–100. They indicate relative priority, not the chance of a fire.</li>
        <li>SIMD 2020 indicators cover deprivation, overcrowding, health, central heating and crime.</li>
        <li>Each ward uses the average DataZone score for its assigned deprivation decile, rather than the zones within its boundary.</li>
        <li>Wards are ranked by current score. Ties use alphabetical order.</li>
      </ul>
    </section>
    <section className="detail-section">
      <h3>Fire projections</h3>
      <ul className="panel-notes">
        <li>A recency-weighted linear trend uses 14 years of dwelling-fire records, from 2009/10 to 2022/23.</li>
      </ul>
    </section>
    <section className="detail-section">
      <h3>Future scores</h3>
      <ul className="panel-notes">
        <li>Years 1, 2 and 3 add 4, 8 and 12 points to the current score, up to 100.</li>
        <li>These are fixed scenario adjustments in both modes, separate from the fire projections.</li>
      </ul>
    </section>
    <section className="detail-section">
      <h3>Suggestions</h3>
      <ul className="panel-notes">
        <li><strong>Mock:</strong> written examples and sample ward context.</li>
        <li><strong>Model:</strong> OpenAI uses the ward's score and selected annual projection. Current uses Year 1.</li>
      </ul>
    </section>
    <section className="detail-section">
      <h3>Sample map layers</h3>
      <ul className="panel-notes">
        <li>Premises and events are available in Mock, hidden by default.</li>
        <li>Premises scores and inspection priorities are examples, not verified records.</li>
        <li>The four hackathon events use archived demo dates and attendance. They do not change with the timeframe or affect ward scores.</li>
      </ul>
    </section>
  </>;
}
