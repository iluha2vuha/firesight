import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const BACKEND_URL = "http://localhost:8000";

const getRiskColor = (score) => {
  if (score >= 80) return "#a50f15";
  if (score >= 65) return "#de2d26";
  if (score >= 50) return "#fb6a4a";
  if (score >= 35) return "#fcae91";
  return "#fee5d9";
};

const RiskMap = () => {
  const [geoData, setGeoData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/wards.geojson`)
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => {
        console.error("Error loading ward data:", err);
        setError("Could not load Glasgow ward data from the backend.");
      });
  }, []);

  const styleRegion = (feature) => {
    const score = feature.properties.risk_score;
    return {
      fillColor: getRiskColor(score),
      weight: 2,
      color: "white",
      fillOpacity: 0.72,
    };
  };

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      const props = feature.properties;
      layer.bindPopup(`
        <div style="font-size: 14px;">
            <h3>${props.ward_name}</h3>
            <b>Ward ID:</b> ${props.ward_id}<br/>
            <b>Risk Score:</b> ${props.risk_score}/100<br/>
            <b>6-month forecast:</b> ${props.prediction.forecast_6mo} incidents<br/>
            <b>Trend:</b> ${props.prediction.trend_pct}%<br/>
            <b>Drivers:</b>
            <ul style="padding-left: 18px; margin: 6px 0 0;">
              ${props.drivers.map((driver) => `<li>${driver}</li>`).join("")}
            </ul>
        </div>
      `);
    }
  };

  return (
    <>
      {error && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 1000,
            background: "white",
            color: "#a50f15",
            padding: "10px 12px",
            borderRadius: 8,
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          {error}
        </div>
      )}

      <MapContainer
        center={[55.8642, -4.2518]}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
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
    </>
  );
};

export default RiskMap;
