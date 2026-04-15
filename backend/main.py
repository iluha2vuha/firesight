import json
import math
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
WARDS_FILE = DATA_DIR / "glasgow_wards.geojson"

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


wards_geojson = load_wards()
wards_by_id = {
    feature["properties"]["ward_id"]: feature
    for feature in wards_geojson.get("features", [])
}

app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")


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
        "ward_id": props["ward_id"],
        "ward_name": props["ward_name"],
        "risk_score": props["risk_score"],
        "drivers": props["drivers"],
        "prediction": prediction_for(feature),
    }


def ward_with_prediction(feature):
    return {
        **feature,
        "properties": {
            **feature["properties"],
            "prediction": prediction_for(feature),
        },
    }


@app.get("/")
def read_root():
    return {"message": "FireSight backend is running"}


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "wards_loaded": len(wards_by_id),
        "prediction_model": "linear_trend_forecast",
    }


@app.get("/api/wards")
def list_wards():
    return [ward_summary(feature) for feature in wards_geojson.get("features", [])]


@app.get("/api/wards.geojson")
def get_wards_geojson():
    return {
        **wards_geojson,
        "features": [
            ward_with_prediction(feature)
            for feature in wards_geojson.get("features", [])
        ],
    }


@app.get("/api/wards/{ward_id}")
def get_ward(ward_id: str):
    ward = wards_by_id.get(ward_id)
    if ward is None:
        raise HTTPException(status_code=404, detail="Ward not found")

    return ward_with_prediction(ward)


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
