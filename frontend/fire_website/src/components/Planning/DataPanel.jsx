export default function DataPanel() {
  return <>
    <div className="panel-heading"><h2>Data & method</h2></div>
    <section className="detail-section first-section">
      <h3>What the score means</h3>
      <p className="small-copy">The 0–100 score is a relative planning indicator, not a probability of fire. Lower scores do not establish safety.</p>
      <p className="small-copy">This is a student prototype. Its scores, forecasts and suggested actions have not been validated for operational fire-safety decisions.</p>
    </section>
    <section className="detail-section">
      <h3>Ward scores</h3>
      <p className="source-tag">SIMD 2020</p>
      <p className="small-copy">DataZone scores combine deprivation, overcrowding, health vulnerability, central heating and crime indicators. The ward map uses the mean zone score for the ward’s assigned deprivation decile. This is a proxy, not a spatial aggregation of every zone inside a ward.</p>
      <p className="small-copy">The ward list always sorts current scores, even when a scenario year is selected. Tied scores are ordered by ward name.</p>
    </section>
    <section className="detail-section">
      <h3>Annual projections</h3>
      <p className="source-tag">2009/10–2022/23 observations</p>
      <p className="small-copy">Model mode fits a recency-weighted linear trend to 14 annual observations of dwelling fires. Years 1, 2 and 3 are separate annual counts after that training period, not cumulative totals or forecasts trained on today’s data.</p>
      <p className="small-copy">The range is an indicative residual-based band for Year 1. Accuracy and uncertainty coverage have not been validated. Mock provides sample scores, with no annual incident forecasts.</p>
    </section>
    <section className="detail-section">
      <h3>Scenario years</h3>
      <p className="small-copy">Year 1, 2 and 3 add 4, 8 and 12 points to the current score, capped at 100. These adjustments illustrate scenarios; they are not changes learned by the model. The same controls are used in both modes.</p>
    </section>
    <section className="detail-section">
      <h3>City-centre examples</h3>
      <p className="small-copy">Premises are illustrative records with authored scores and inspection priorities. They are hidden by default and remain sample data in either mode. They are not verified inspections or live risk records.</p>
    </section>
  </>;
}
