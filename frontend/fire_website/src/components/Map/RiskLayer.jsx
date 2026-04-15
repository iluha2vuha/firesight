import { GeoJSON } from 'react-leaflet';

const TIMEFRAME_ADJUSTMENTS = {
  Current: 0,
  'In 6 months': 4,
  'In 1 year': 8,
  'In 1.5 years': 12
};

const RiskLayer = ({ timeFrame = 'Current' }) => {
  // Mock GeoJSON for Glasgow regions. 
  // Notice the "riskFactor" property determining the color.
  const glasgowData = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Anderston",
        "riskFactor": 65,
        "driver": "Mixed aging residential and new developments. Rising incidents of electrical faults.",
        "action": "Schedule targeted home safety visits focusing on electrical appliance safety.",
        "primaryRiskType": "Domestic - Electrical"
      },
      "geometry": { "type": "Polygon", "coordinates": [[[-4.269346793864372, 55.860460032545404], [-4.270042657287206, 55.8562667932145], [-4.259311710820896, 55.855979005292966], [-4.2592018376484475, 55.85920621919462], [-4.269346793864372, 55.860460032545404]]] }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Central",
        "riskFactor": 88,
        "driver": "High footfall transit hub with dense concentration of commercial kitchen extract systems.",
        "action": "Initiate multi-agency audits of commercial food vendor grease traps and extract flues.",
        "primaryRiskType": "Commercial - Kitchens"
      },
      "geometry": { "type": "Polygon", "coordinates": [[[-4.259327337384292, 55.85601321327553], [-4.250267846604743, 55.85395291302871], [-4.248862063552906, 55.859826672289415], [-4.258819693503824, 55.86072519147777], [-4.259327337384292, 55.85601321327553]]] }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Blythswood",
        "riskFactor": 25,
        "driver": "Modern office stock with high corporate compliance and frequent private safety audits.",
        "action": "Maintain standard annual review cycle. No escalated action required.",
        "primaryRiskType": "Commercial - Office"
      },
      "geometry": { "type": "Polygon", "coordinates": [[[-4.269283735572856, 55.8605344844635], [-4.259106003951871, 55.85919992019828], [-4.258297492560757, 55.86395076008449], [-4.270805639366671, 55.86560541058563], [-4.269283735572856, 55.8605344844635]]] }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Garnethill",
        "riskFactor": 82,
        "driver": "Steep topography restricting appliance access. Dense pre-1900 tenement housing with wooden stairwells.",
        "action": "Deploy 'Clear Stairwells' social media campaign; review routing constraints for heavy appliances.",
        "primaryRiskType": "Domestic - Tenement"
      },
      "geometry": { "type": "Polygon", "coordinates": [[[-4.270805639366671, 55.86565878523493], [-4.259343801418851, 55.86421764396462], [-4.26034255078406, 55.86974172847627], [-4.268142307727288, 55.86910129517486], [-4.270900758354173, 55.867179931902484], [-4.270805639366671, 55.86565878523493]]] }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Cowcaddens",
        "riskFactor": 55,
        "driver": "High concentration of student accommodation blocks. Frequent false alarms and cooking-related incidents.",
        "action": "Partner with universities for start-of-term fire safety inductions.",
        "primaryRiskType": "Domestic - Student"
      },
      "geometry": { "type": "Polygon", "coordinates": [[[-4.259248682432229, 55.8642710205209], [-4.248452677394255, 55.86309671934458], [-4.2462173811977095, 55.8695282518826], [-4.250259938149668, 55.8699285195336], [-4.26034255078406, 55.86966167489132], [-4.259248682432229, 55.8642710205209]]] }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Townhead",
        "riskFactor": 72,
        "driver": "Aging high-rise residential blocks. Historical data shows slight delays in vertical deployment.",
        "action": "Conduct immediate physical checks of dry risers and review high-rise evacuation protocols.",
        "primaryRiskType": "Domestic - High Rise"
      },
      "geometry": { "type": "Polygon", "coordinates": [[[-4.248522428012365, 55.86315031329178], [-4.240650774105404, 55.862308886948], [-4.239365564666201, 55.86591482524355], [-4.2363668355369555, 55.865554242201284], [-4.235188813043777, 55.867296988074344], [-4.240329502053271, 55.868859395247114], [-4.246219873565082, 55.86949035287594], [-4.248522428012365, 55.86315031329178]]] }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "George Square",
        "riskFactor": 30,
        "driver": "Civic center with well-regulated buildings. Risk profile spikes strictly during major public events.",
        "action": "No immediate structural action. Implement dynamic resource allocation during scheduled civic events.",
        "primaryRiskType": "Event-Driven"
      },
      "geometry": { "type": "Polygon", "coordinates": [[[-4.258268394230299, 55.864141952704614], [-4.258803918221474, 55.86074620766354], [-4.248093984491646, 55.85978451356482], [-4.246005662712321, 55.86290989929472], [-4.258268394230299, 55.864141952704614]]] }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Merchant City",
        "riskFactor": 85,
        "driver": "Dense late-night economy (bars/clubs) operating directly beneath historic residential flats.",
        "action": "Schedule joint inspections with the licensing board focusing on venue capacity and emergency exits.",
        "primaryRiskType": "Mixed Use - Nightlife"
      },
      "geometry": { "type": "Polygon", "coordinates": [[[-4.2460056597887785, 55.86281974866819], [-4.24804043458812, 55.859724407056206], [-4.24879013375724, 55.859784514179864], [-4.249432720331555, 55.857410229447765], [-4.242149887549772, 55.85635826623104], [-4.237865920648176, 55.857019504726026], [-4.235723913463431, 55.858402029687056], [-4.233635678586296, 55.86161771479436], [-4.2460056597887785, 55.86281974866819]]] }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Saltmarket",
        "riskFactor": 92,
        "driver": "High SIMD deprivation index correlating with historical incident clusters in older tenement stock.",
        "action": "Prioritize area for free smoke alarm installation program and community fire safety walkabouts.",
        "primaryRiskType": "Domestic - Deprivation"
      },
      "geometry": { "type": "Polygon", "coordinates": [[[-4.249379170469467, 55.85732006403967], [-4.250235935318614, 55.85395367321334], [-4.246755157678535, 55.85299179883012], [-4.245737723883536, 55.85413403732406], [-4.241293050336196, 55.85317217213358], [-4.24065047108661, 55.85611781182823], [-4.249379170469467, 55.85732006403967]]] }
    }
  ]
};

  const getAdjustedRiskFactor = (riskFactor) => {
    const adjustment = TIMEFRAME_ADJUSTMENTS[timeFrame] ?? 0;
    return Math.max(0, Math.min(100, riskFactor + adjustment));
  };

  const mapDataForTimeframe = {
    ...glasgowData,
    features: glasgowData.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        adjustedRiskFactor: getAdjustedRiskFactor(feature.properties.riskFactor)
      }
    }))
  };

  // The logic that turns the risk integer into a color
  const getRiskColor = (riskFactor) => {
    if (riskFactor >= 75) return '#d73027'; // Red
    if (riskFactor >= 40) return '#fdae61'; // Orange
    return '#1a9850';                       // Green
  };

  const styleRegion = (feature) => {
    return {
      fillColor: getRiskColor(feature.properties.adjustedRiskFactor),
      weight: 1, // Thin borders
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      const p = feature.properties;
      const timeframeRisk = p.adjustedRiskFactor;
      
      // Using a clean HTML structure for the popup
      layer.bindPopup(`
        <div class="custom-popup" style="min-width: 220px;">
            <h3 style="margin-bottom: 5px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">
              ${p.name}
            </h3>
            
            <div style="margin-bottom: 10px;">
              <span style="font-size: 24px; font-weight: bold; color: ${getRiskColor(timeframeRisk)}">
                ${timeframeRisk}
              </span>
              <span style="color: #666; font-size: 12px;">/ 100 Risk Score</span>
            </div>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;"><b>Time frame:</b> ${timeFrame}</p>

            <p style="margin: 5px 0;"><b>Category:</b> ${p.primaryRiskType}</p>
            
            <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; margin-top: 10px;">
              <p style="margin: 0 0 5px 0; font-size: 12px; color: #555;"><b>Primary Driver:</b><br/> ${p.driver}</p>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 8px; margin-top: 10px;">
              <p style="margin: 0; font-size: 12px;"><b>System Recommendation:</b><br/> ${p.action}</p>
            </div>
        </div>
      `);      
      // Hover effects
      layer.on({
        mouseover: (e) => {
          const l = e.target;
          l.setStyle({ weight: 3, color: '#333', fillOpacity: 0.9 });
          l.bringToFront();
        },
        mouseout: (e) => {
          // Reset style using the GeoJSON layer reference
          layer.options.style = styleRegion(feature);
          e.target.setStyle(layer.options.style);
        }
      });
    }
  };

  return (
    <GeoJSON 
      key={timeFrame}
      data={mapDataForTimeframe}
      style={styleRegion} 
      onEachFeature={onEachFeature} 
    />
  );
};

export default RiskLayer;