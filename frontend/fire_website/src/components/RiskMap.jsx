import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const RiskMap = () => {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    // URL to your backend API (update this to your team's endpoint)
    const backendApiUrl = 'http://localhost:5000/api/fire-risk'; 

    fetch(backendApiUrl)
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Error loading data:", err));
  }, []);

  const styleRegion = (feature) => {
    const score = feature.properties.riskScore;
    const color = score > 75 ? '#d73027' : score > 40 ? '#fee08b' : '#1a9850';
    return { fillColor: color, weight: 2, color: 'white', fillOpacity: 0.6 };
  };

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      layer.bindPopup(`
        <div style="font-size: 14px;">
            <h3>${feature.properties.name || 'Region'}</h3>
            <b>Risk Score:</b> ${feature.properties.riskScore}<br/>
            <b>Action:</b> ${feature.properties.action || 'Investigate further'}
        </div>
      `);
    }
  };

  return (
    <MapContainer 
      center={[51.505, -0.09]} 
      zoom={13} 
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geoData && (
        <GeoJSON 
          data={geoData} 
          style={styleRegion} 
          onEachFeature={onEachFeature} 
        />
      )}
    </MapContainer>
  );
};

export default RiskMap;