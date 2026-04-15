import './App.css';
import RiskMap from './components/Map/RiskMap';

function App() {
  return (
    <div className="app-container">
      
      <header className="app-header">
        <h1>FireSight: Glasgow Risk Predictor</h1>
      </header>
      
      <main className="app-main">
        <RiskMap />
      </main>

    </div>
  );
}

export default App;
