import ast
import json
import math
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
WARDS_FILE = DATA_DIR / "glasgow_wards.geojson"
PREMISES_FILE = DATA_DIR / "city_centre_premises.json"
ZONES_CSV = BASE_DIR.parent / "data-pipeline" / "output" / "glasgowzones.csv"

if load_dotenv is not None:
    load_dotenv(BASE_DIR / ".env")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_wards():
    if not WARDS_FILE.exists():
        return {"type": "FeatureCollection", "features": []}

    with WARDS_FILE.open() as file:
        return json.load(file)


def load_premises():
    if not PREMISES_FILE.exists():
        return []

    with PREMISES_FILE.open() as file:
        return json.load(file)


def load_zones() -> List[Dict[str, Any]]:
    """Load DataZone-level risk and forecast data from the data-pipeline output CSV."""
    if not ZONES_CSV.exists():
        return []

    try:
        import pandas as pd
    except ImportError:
        return []

    df = pd.read_csv(ZONES_CSV)

    # Parse the drivers column (stored as a Python list string by the notebook)
    def parse_drivers(val):
        if pd.isna(val):
            return []
        try:
            result = ast.literal_eval(str(val))
            return result if isinstance(result, list) else []
        except Exception:
            return []

    df["drivers"] = df["drivers"].apply(parse_drivers)

    # Replace NaN with None so FastAPI serialises them as JSON null
    df = df.where(pd.notna(df), None)

    return df.to_dict(orient="records")


wards_geojson = load_wards()
wards_by_id = {
    feature["properties"]["ward_id"]: feature
    for feature in wards_geojson.get("features", [])
}
premises = load_premises()
premises_by_id = {item["id"]: item for item in premises}

zones: List[Dict[str, Any]] = load_zones()
zones_by_id: Dict[str, Dict[str, Any]] = {z["zoneid"]: z for z in zones}

app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")


def risk_band(score):
    if score >= 75:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def forecast_incidents(counts):
    """Linear trend forecast ported from the data-pipeline notebook."""
    if not counts:
        return {
            "forecast_6mo": 0,
            "forecast_12mo": 0,
            "forecast_18mo": 0,
            "forecast_lower": 0,
            "forecast_upper": 0,
            "trend_pct": 0.0,
        }

    if len(counts) == 1:
        only_value = int(counts[0])
        return {
            "forecast_6mo": only_value,
            "forecast_12mo": only_value,
            "forecast_18mo": only_value,
            "forecast_lower": only_value,
            "forecast_upper": only_value,
            "trend_pct": 0.0,
        }

    n = len(counts)
    x_values = list(range(n))
    x_mean = sum(x_values) / n
    y_mean = sum(counts) / n
    denominator = sum((x - x_mean) ** 2 for x in x_values)
    slope = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, counts)) / denominator
    intercept = y_mean - slope * x_mean

    fitted = [slope * x + intercept for x in x_values]
    residuals = [actual - predicted for actual, predicted in zip(counts, fitted)]
    residual_std = (
        math.sqrt(sum(residual ** 2 for residual in residuals) / (n - 2))
        if n > 2
        else 0.0
    )

    def forecast(periods_ahead):
        point = max(0.0, slope * (n - 1 + periods_ahead) + intercept)
        return {
            "forecast": round(point),
            "lower": round(max(0.0, point - 1.96 * residual_std)),
            "upper": round(max(0.0, point + 1.96 * residual_std)),
        }

    six_month = forecast(1)
    latest = counts[-1]
    trend_pct = round((six_month["forecast"] - latest) / latest * 100, 1) if latest else 0.0

    return {
        "model": "linear_trend_forecast",
        "history_6mo": counts,
        "forecast_6mo": six_month["forecast"],
        "forecast_12mo": forecast(2)["forecast"],
        "forecast_18mo": forecast(3)["forecast"],
        "forecast_lower": six_month["lower"],
        "forecast_upper": six_month["upper"],
        "trend_pct": trend_pct,
        "note": "Uses prototype six-month incident history until real SFRS incident data is available.",
    }


def prediction_for(feature):
    props = feature["properties"]
    return forecast_incidents(props.get("incident_history_6mo", []))


def ward_summary(feature):
    props = feature["properties"]
    return {
        "id": props["ward_id"],
        "name": props["ward_name"],
        "mode": "ward",
        "ward_id": props["ward_id"],
        "ward_name": props["ward_name"],
        "risk_score": props["risk_score"],
        "risk_band": risk_band(props["risk_score"]),
        "drivers": props["drivers"],
        "prediction": prediction_for(feature),
    }


def ward_with_prediction(feature):
    return {
        **feature,
        "properties": {
            **feature["properties"],
            "id": feature["properties"]["ward_id"],
            "name": feature["properties"]["ward_name"],
            "mode": "ward",
            "risk_band": risk_band(feature["properties"]["risk_score"]),
            "prediction": prediction_for(feature),
        },
    }


def filter_premises(
    focus: Optional[str] = None,
    ward_id: Optional[str] = None,
    risk_band_filter: Optional[str] = None,
):
    results = premises
    if focus is not None:
        results = [
            item for item in results
            if item.get("focus", "").lower() == focus.lower()
        ]
    if ward_id is not None:
        results = [
            item for item in results
            if item.get("ward_id") == ward_id
        ]
    if risk_band_filter is not None:
        results = [
            item for item in results
            if item.get("risk_band", "").lower() == risk_band_filter.lower()
        ]
    return results


def fallback_ward_explanation(feature):
    props = feature["properties"]
    drivers = props.get("drivers", [])
    driver_text = ", ".join(drivers[:2]) if drivers else "the available risk indicators"
    forecast = prediction_for(feature)
    return (
        f"{props['ward_name']} is flagged as a {risk_band(props['risk_score'])} prevention priority "
        f"with a risk score of {props['risk_score']}/100, mainly because of {driver_text}. "
        f"The 6-month forecast is {forecast['forecast_6mo']} incidents, so this should be treated "
        "as a planning signal for targeted community safety activity rather than a prediction of a specific incident."
    )


def fallback_premises_explanation(item):
    drivers = item.get("drivers", [])
    driver_text = ", ".join(drivers[:3]) if drivers else "the available premises risk indicators"
    pressure = item.get("future_pressure", {})
    pressure_text = pressure.get("reason", "future demand pressure in the city centre")
    return (
        f"This premises is flagged as {item['inspection_priority']} because it combines "
        f"{driver_text}. {pressure_text.capitalize()} may affect prevention demand over the "
        f"{pressure.get('timeframe', 'next planning period')}. This should be treated as a "
        "prevention-review and inspection-prioritisation signal, not an official safety judgement."
    )


def build_explain_payload(mode, record):
    if mode == "ward":
        props = record["properties"]
        return {
            "mode": "ward",
            "name": props["ward_name"],
            "risk_score": props["risk_score"],
            "risk_band": risk_band(props["risk_score"]),
            "drivers": props.get("drivers", []),
            "planned_homes": props.get("planned_homes"),
            "planning_applications": props.get("planning_applications"),
            "prediction": prediction_for(record),
        }

    return {
        "mode": "premises",
        "name": record["name"],
        "risk_score": record["risk_score"],
        "risk_band": record["risk_band"],
        "premises_type": record["premises_type"],
        "primary_risk_type": record["primary_risk_type"],
        "inspection_priority": record["inspection_priority"],
        "drivers": record.get("drivers", []),
        "future_pressure": record.get("future_pressure", {}),
        "recommended_intervention": record.get("recommended_intervention"),
    }


def openai_explanation(mode, record):
    if not os.getenv("OPENAI_API_KEY"):
        return None

    try:
        from openai import OpenAI
    except ImportError:
        return None

    payload = build_explain_payload(mode, record)
    system_prompt = (
        "You are a fire prevention analyst supporting a UK Fire and Rescue Service. "
        "Explain risk in plain English for non-technical planners. Use only the data provided. "
        "Do not say a building is unsafe. Say it is flagged for prevention review or inspection prioritisation. "
        "Do not claim a specific incident will happen. Write exactly three concise sentences."
    )

    try:
        client = OpenAI(timeout=5.0)
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(payload)},
            ],
            temperature=0.3,
            max_tokens=180,
        )
        return response.choices[0].message.content
    except Exception:
        return None


@app.get("/")
def read_root():
    return {"message": "FireSight backend is running"}


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "wards_loaded": len(wards_by_id),
        "premises_loaded": len(premises),
        "zones_loaded": len(zones),
        "prediction_model": "linear_trend_forecast",
    }


@app.get("/api/modes")
def modes():
    return {
        "modes": [
            {
                "id": "strategic",
                "label": "Strategic Risk View",
                "description": "Ward-level overview for prevention planning across Glasgow.",
                "map_ready": True,
            },
            {
                "id": "premises",
                "label": "High-Risk Premises Overlay",
                "description": "City Centre building-level prevention and inspection priority markers.",
                "map_ready": True,
                "focus": "city-centre",
            },
        ]
    }


@app.get("/api/strategic/wards")
def list_strategic_wards():
    return [ward_summary(feature) for feature in wards_geojson.get("features", [])]


@app.get("/api/strategic/wards.geojson")
def get_strategic_wards_geojson():
    return {
        **wards_geojson,
        "features": [
            ward_with_prediction(feature)
            for feature in wards_geojson.get("features", [])
        ],
    }


@app.get("/api/strategic/wards/{ward_id}")
def get_strategic_ward(ward_id: str):
    ward = wards_by_id.get(ward_id)
    if ward is None:
        raise HTTPException(status_code=404, detail="Ward not found")

    return ward_with_prediction(ward)


@app.get("/api/premises")
def list_premises(
    focus: Optional[str] = None,
    ward_id: Optional[str] = None,
    risk_band: Optional[str] = None,
):
    return filter_premises(
        focus=focus,
        ward_id=ward_id,
        risk_band_filter=risk_band,
    )


@app.get("/api/premises/{premises_id}")
def get_premises(premises_id: str):
    item = premises_by_id.get(premises_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Premises not found")

    return item


@app.get("/api/explain")
def explain(
    mode: str,
    record_id: str = Query(..., alias="id"),
):
    if mode == "ward":
        record = wards_by_id.get(record_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Ward not found")
        fallback = fallback_ward_explanation(record)
    elif mode == "premises":
        record = premises_by_id.get(record_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Premises not found")
        fallback = fallback_premises_explanation(record)
    else:
        raise HTTPException(status_code=400, detail="Mode must be 'ward' or 'premises'")

    live_text = openai_explanation(mode, record)
    return {
        "id": record_id,
        "mode": mode,
        "source": "live" if live_text else "fallback",
        "text": live_text or fallback,
    }


@app.get("/api/wards")
def list_wards():
    return list_strategic_wards()


@app.get("/api/wards.geojson")
def get_wards_geojson():
    return get_strategic_wards_geojson()


@app.get("/api/wards/{ward_id}")
def get_ward(ward_id: str):
    return get_strategic_ward(ward_id)


@app.get("/api/wards/{ward_id}/prediction")
def get_ward_prediction(ward_id: str):
    ward = wards_by_id.get(ward_id)
    if ward is None:
        raise HTTPException(status_code=404, detail="Ward not found")

    return {
        "ward_id": ward["properties"]["ward_id"],
        "ward_name": ward["properties"]["ward_name"],
        "prediction": prediction_for(ward),
    }


# ---------------------------------------------------------------------------
# DataZone endpoints — powered by data-pipeline/output/glasgowzones.csv
# The notebook produces this file; the API serves precomputed results only.
# ---------------------------------------------------------------------------

@app.get("/api/zones")
def list_zones(top: Optional[int] = None):
    """
    Return all 746 Glasgow DataZones with risk scores, drivers, and forecasts.
    Optional ?top=N filters to the N highest-risk zones (by riskrank).
    """
    if not zones:
        raise HTTPException(status_code=503, detail="Zone data not loaded — run the data pipeline first")

    result = sorted(zones, key=lambda z: z.get("riskrank") or 9999)
    if top is not None:
        result = result[:top]
    return result


@app.get("/api/zones/top")
def top_zones(n: int = 20):
    """Return the N highest-risk DataZones (default 20)."""
    if not zones:
        raise HTTPException(status_code=503, detail="Zone data not loaded — run the data pipeline first")

    return sorted(zones, key=lambda z: z.get("riskrank") or 9999)[:n]


@app.get("/api/zones/{zoneid}")
def get_zone(zoneid: str):
    """Return a single DataZone by its S01xxxxxx identifier."""
    zone = zones_by_id.get(zoneid)
    if zone is None:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone
