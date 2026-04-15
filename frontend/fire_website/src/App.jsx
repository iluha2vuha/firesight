import './App.css';
import RiskMap from './components/Map/RiskMap';

function App() {
  return (
    <div className="app-container" style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      
      {/* Dashboard Header */}
      <header style={{ 
        padding: '15px 20px', 
        backgroundColor: '#b30000', 
        color: 'white', 
        fontFamily: 'sans-serif',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1000 
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          FireSight: Risk & Demand Predictor
        </h1>
      </header>
      
      {/* Main Map Area */}
      <main style={{ flexGrow: 1, position: 'relative' }}>
        <RiskMap />
      </main>

    </div>
  );
}

export default App;
