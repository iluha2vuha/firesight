import ast
import json
import math
import os
from collections import defaultdict
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
ZONES_CSV          = BASE_DIR.parent / "data-pipeline" / "output" / "glasgowzones.csv"
WARD_FORECASTS_CSV = BASE_DIR.parent / "data-pipeline" / "output" / "glasgow_ward_forecasts.csv"

if load_dotenv is not None:
    load_dotenv(BASE_DIR / ".env")

# TODO: Restrict origins to the frontend domain in production (e.g. ["http://localhost:5173"])
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


def sanitize_json_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Replace NaN/Infinity values with None so FastAPI can serialize CSV rows safely."""
    cleaned_records: List[Dict[str, Any]] = []
    for row in records:
        cleaned_records.append({
            key: None if isinstance(value, float) and (math.isnan(value) or math.isinf(value)) else value
            for key, value in row.items()
        })
    return cleaned_records


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
    return sanitize_json_records(df.to_dict(orient="records"))


wards_geojson = load_wards()
wards_by_id = {
    feature["properties"]["ward_id"]: feature
    for feature in wards_geojson.get("features", [])
}
premises = load_premises()
premises_by_id = {item["id"]: item for item in premises}

def load_ward_forecasts() -> Dict[str, Dict[str, Any]]:
    """Load real ward-level fire forecasts generated from 14 years of SFRS dwelling fire data."""
    if not WARD_FORECASTS_CSV.exists():
        return {}
    try:
        import pandas as pd
    except ImportError:
        return {}
    df = pd.read_csv(WARD_FORECASTS_CSV)
    records = sanitize_json_records(df.to_dict(orient="records"))
    return {row["ward_id"]: row for row in records if row["ward_id"] in wards_by_id}


zones: List[Dict[str, Any]] = load_zones()
zones_by_id: Dict[str, Dict[str, Any]] = {z["zoneid"]: z for z in zones}
ward_forecasts: Dict[str, Dict[str, Any]] = load_ward_forecasts()


def build_decile_lookup(zone_list: List[Dict[str, Any]]) -> Dict[int, int]:
    """Map each SIMD decile (1-10) to the mean model risk score for zones in that decile."""
    groups: Dict[int, List[int]] = defaultdict(list)
    for z in zone_list:
        d = z.get("simddecile")
        r = z.get("riskscore")
        if d is not None and r is not None:
            groups[int(d)].append(int(r))
    return {d: round(sum(v) / len(v)) for d, v in groups.items()}


decile_to_model_score: Dict[int, int] = build_decile_lookup(zones)

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


def ward_with_prediction(feature, use_model: bool = False):
    props = feature["properties"]

    if use_model and decile_to_model_score:
        decile = props.get("simd_decile")
        model_score = (
            decile_to_model_score.get(int(decile), props["risk_score"])
            if decile is not None
            else props["risk_score"]
        )
        wf = ward_forecasts.get(props["ward_id"], {})
        if wf and wf.get("forecast_6mo") is not None:
            model_prediction = {
                "forecast_6mo":   round(float(wf["forecast_6mo"]), 1),
                "forecast_12mo":  round(float(wf["forecast_12mo"]), 1) if wf.get("forecast_12mo") is not None else None,
                "forecast_18mo":  round(float(wf["forecast_18mo"]), 1) if wf.get("forecast_18mo") is not None else None,
                "forecast_lower": round(float(wf["forecast_lower"]), 1) if wf.get("forecast_lower") is not None else None,
                "forecast_upper": round(float(wf["forecast_upper"]), 1) if wf.get("forecast_upper") is not None else None,
                "trend_pct":      wf.get("trend_pct"),
                "data_quality":   wf.get("data_quality", "sufficient"),
                "note":           "Based on 14 years of SFRS accidental dwelling fire data (2009–2023).",
            }
        else:
            model_prediction = {
                "forecast_6mo": None, "forecast_12mo": None, "forecast_18mo": None,
                "forecast_lower": None, "forecast_upper": None, "trend_pct": None,
                "note": "Forecast unavailable — ward data pending",
            }
        return {
            **feature,
            "properties": {
                **props,
                "id": props["ward_id"],
                "name": props["ward_name"],
                "mode": "ward",
                "risk_score": model_score,
                "risk_band": risk_band(model_score),
                "prediction": model_prediction,
                "data_source": "model",
                "model_components": 5,
            },
        }

    return {
        **feature,
        "properties": {
            **props,
            "id": props["ward_id"],
            "name": props["ward_name"],
            "mode": "ward",
            "risk_band": risk_band(props["risk_score"]),
            "prediction": prediction_for(feature),
            "data_source": "mock",
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
    driver1 = drivers[0] if drivers else "high deprivation"
    driver2 = drivers[1] if len(drivers) > 1 else "housing risk factors"
    forecast = prediction_for(feature)
    f6 = forecast["forecast_6mo"]
    fl = forecast.get("forecast_lower", f6)
    fu = forecast.get("forecast_upper", f6)
    trend = forecast.get("trend_pct", 0) or 0
    trend_word = "rising" if trend > 0 else "falling" if trend < 0 else "stable"
    band = risk_band(props["risk_score"])
    priority = "high" if band == "high" else "near-term" if band == "medium" else "routine"
    return (
        f"• Prevention targeting: {props['ward_name']} is a {priority} prevention priority — deploy "
        f"community fire safety visits focused on {driver1} and {driver2}, prioritising Safe and Well "
        f"referrals for households flagged by social care and housing registers.\n"
        f"• Capacity planning: Forecast {f6} incidents over the next 6 months (range {fl}–{fu}); "
        f"trend is {trend_word} ({'+' if trend >= 0 else ''}{trend}%). Plan prevention team visits "
        f"proportionally and review station response capacity for any demand increase.\n"
        f"• Key intervention: Prioritise smoke alarm installation and Home Fire Safety Check campaigns "
        f"targeting the highest-risk households in this ward. Re-assess quarterly as new incident and "
        f"housing data becomes available — this is a planning signal, not a prediction of specific incidents."
    )


def fallback_ward_explanation_model(feature):
    props = feature["properties"]
    decile = props.get("simd_decile")
    model_score = (
        decile_to_model_score.get(int(decile), props["risk_score"])
        if decile is not None
        else props["risk_score"]
    )
    band = risk_band(model_score)
    drivers = props.get("drivers", [])
    driver1 = drivers[0] if drivers else "high area deprivation"
    priority = "high" if band == "high" else "near-term" if band == "medium" else "routine"

    wf = ward_forecasts.get(props["ward_id"], {})
    if wf and wf.get("forecast_6mo") is not None:
        f6 = round(float(wf["forecast_6mo"]), 1)
        fl = round(float(wf["forecast_lower"]), 1) if wf.get("forecast_lower") is not None else f6
        fu = round(float(wf["forecast_upper"]), 1) if wf.get("forecast_upper") is not None else f6
        trend = wf.get("trend_pct") or 0
        trend_word = "rising" if trend > 0 else "falling" if trend < 0 else "stable"
        n_years = int(wf["n_years"]) if wf.get("n_years") is not None else 14
        capacity_line = (
            f"SFRS dwelling fire data ({n_years} years, 2009–2023) forecasts {f6} incidents "
            f"in Year 1 (one annual period) (range {fl}–{fu}); demand trend is {trend_word} "
            f"({'+' if trend >= 0 else ''}{trend}%) — plan prevention staffing and response capacity "
            f"proportionally and flag to station commanders."
        )
        key_line = (
            f"Prioritise smoke alarm installation and Home Fire Safety Check campaigns in this ward; "
            f"risk score ({model_score}/100) is driven by SIMD 2020 deprivation (decile {decile}) — "
            f"re-assess quarterly as additional Census 2022 and EPC data are loaded."
        )
    else:
        capacity_line = (
            f"Allocate prevention capacity proportional to deprivation level (SIMD decile {decile}); "
            f"coordinate with housing, health, and social care partners to maximise Safe and Well "
            f"referral volume."
        )
        key_line = (
            f"Target smoke detector installation and Home Fire Safety Checks in private rented and "
            f"social housing stock; score uses SIMD 2020 deprivation — incident forecast will be "
            f"available once SFRS ward data is matched."
        )

    return (
        f"• Prevention targeting: {props['ward_name']} scores {model_score}/100 ({priority} priority) "
        f"based on SIMD 2020 deprivation data (decile {decile}) — prioritise proactive community safety "
        f"outreach here, focusing on {driver1} as the primary modifiable risk factor.\n"
        f"• Capacity planning: {capacity_line}\n"
        f"• Key intervention: {key_line}"
    )


def fallback_premises_explanation(item):
    drivers = item.get("drivers", [])
    driver_text = ", ".join(drivers[:3]) if drivers else "the available premises risk indicators"
    pressure = item.get("future_pressure", {})
    pressure_reason = pressure.get("reason", "future demand pressure in the city centre")
    timeframe = pressure.get("timeframe", "the next planning period")
    intervention = item.get("recommended_intervention") or "conduct a full fire risk assessment review"
    return (
        f"• Protection action: {item['name']} is flagged as {item['inspection_priority']} inspection "
        f"priority — schedule a protection visit within the next planning cycle to address {driver_text}.\n"
        f"• Capacity planning: Account for {pressure_reason} over {timeframe} when allocating protection "
        f"officer resource; re-inspect before any significant occupancy or structural change occurs.\n"
        f"• Key intervention: {intervention[:1].upper() + intervention[1:]} and verify fire safety "
        f"management plans are current. Flag for partnership working with building control if changes "
        f"are planned. This is an inspection-prioritisation signal, not an official safety judgement."
    )


def fallback_zone_explanation(zone: Dict[str, Any]) -> str:
    name = zone.get("zonename") or zone.get("zoneid", "This zone")
    score = zone.get("riskscore") or 0
    band = risk_band(score)
    drivers = zone.get("drivers") or []
    driver1 = drivers[0] if drivers else "high area deprivation"
    driver2 = drivers[1] if len(drivers) > 1 else "housing risk factors"
    f6 = zone.get("forecast6mo")
    trend = zone.get("trendpct") or 0
    trend_word = "rising" if trend > 0 else "falling" if trend < 0 else "stable"
    priority = "high" if band == "high" else "near-term" if band == "medium" else "routine"
    quality = zone.get("data_quality", "sufficient")

    forecast_line = (
        f"Forecast {round(f6, 1)} incidents over the next 6 months (trend {trend_word}, {'+' if trend >= 0 else ''}{trend}%)."
        if f6 is not None
        else "Incident forecast unavailable — additional data required."
    )
    quality_note = " Forecast uses pooled Glasgow trend (limited local data)." if quality == "pooled" else ""

    return (
        f"• Prevention targeting: {name} is a {priority} prevention priority (risk score {score}/100) — "
        f"deploy community fire safety visits focused on {driver1} and {driver2}, prioritising Safe and Well "
        f"referrals for households flagged by social care and housing registers.\n"
        f"• Capacity planning: {forecast_line}{quality_note} "
        f"Allocate prevention team capacity proportionally and review Safe and Well referral pathways.\n"
        f"• Key intervention: Prioritise smoke alarm installation and Home Fire Safety Checks targeting "
        f"the highest-risk households. Re-assess this zone as Census 2022, SFRS incident, and EPC data "
        f"are added to the model pipeline."
    )


def build_explain_payload(mode, record, source: str = "mock"):
    if mode == "ward":
        props = record["properties"]
        if source == "model":
            decile = props.get("simd_decile")
            model_score = (
                decile_to_model_score.get(int(decile), props["risk_score"])
                if decile is not None
                else props["risk_score"]
            )
            wf = ward_forecasts.get(props["ward_id"], {})
            forecast_available = bool(wf and wf.get("forecast_6mo") is not None)
            return {
                "mode": "ward",
                "data_source": "linear_model",
                "name": props["ward_name"],
                "risk_score": model_score,
                "risk_band": risk_band(model_score),
                "simd_decile": decile,
                "drivers": props.get("drivers", []),
                "active_model_components": 1,
                "total_model_components": 5,
                "forecast_available": forecast_available,
                "forecast_year_1": round(float(wf["forecast_6mo"]), 1) if forecast_available else None,
                "forecast_year_2": round(float(wf["forecast_12mo"]), 1) if forecast_available and wf.get("forecast_12mo") is not None else None,
                "forecast_year_3": round(float(wf["forecast_18mo"]), 1) if forecast_available and wf.get("forecast_18mo") is not None else None,
                "forecast_period_unit": "year",
                "forecast_lower": round(float(wf["forecast_lower"]), 1) if forecast_available and wf.get("forecast_lower") is not None else None,
                "forecast_upper": round(float(wf["forecast_upper"]), 1) if forecast_available and wf.get("forecast_upper") is not None else None,
                "trend_pct": wf.get("trend_pct") if forecast_available else None,
                "data_quality": wf.get("data_quality", "sufficient") if forecast_available else None,
                "n_years": int(wf["n_years"]) if forecast_available and wf.get("n_years") is not None else None,
                "latest_annual": wf.get("latest_annual") if forecast_available else None,
                "data_basis": (
                    "Risk score: SIMD 2020 deprivation index. "
                    "Forecast: OLS linear model on 14 years of SFRS accidental dwelling fire data (2009–2023), "
                    "recency-weighted. Values are annual incident counts in Years 1, 2 and 3, not cumulative totals. "
                    "The interval and trend apply to Year 1 only."
                ),
            }
        return {
            "mode": "ward",
            "data_source": "mock",
            "name": props["ward_name"],
            "risk_score": props["risk_score"],
            "risk_band": risk_band(props["risk_score"]),
            "drivers": props.get("drivers", []),
            "planned_homes": props.get("planned_homes"),
            "planning_applications": props.get("planning_applications"),
            "prediction": prediction_for(record),
        }

    if mode == "zone":
        return {
            "mode": "zone",
            "name": record.get("zonename") or record.get("zoneid"),
            "risk_score": record.get("riskscore"),
            "risk_band": risk_band(record.get("riskscore") or 0),
            "simd_decile": record.get("simddecile"),
            "drivers": record.get("drivers", []),
            "forecast_6mo": record.get("forecast6mo"),
            "trend_pct": record.get("trendpct"),
            "data_quality": record.get("data_quality"),
            "population": record.get("population"),
            "pct_over_65": record.get("pctover65"),
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


def _ai_context(mode, record, source: str = "mock") -> str:
    """Build the minimal one-line context string sent to OpenAI."""
    if mode == "ward":
        props = record["properties"]
        drivers = props.get("drivers", [])
        d = ", ".join(drivers[:2]) or "deprivation"
        if source == "model":
            decile = props.get("simd_decile", "?")
            wf = ward_forecasts.get(props["ward_id"], {})
            score = decile_to_model_score.get(int(decile), props["risk_score"]) if decile != "?" else props["risk_score"]
            band = risk_band(score)
            if wf and wf.get("forecast_6mo") is not None:
                f6 = round(float(wf["forecast_6mo"]), 1)
                fl = round(float(wf["forecast_lower"]), 1) if wf.get("forecast_lower") is not None else f6
                fu = round(float(wf["forecast_upper"]), 1) if wf.get("forecast_upper") is not None else f6
                trend = wf.get("trend_pct") or 0
                return (
                    f"Ward: {props['ward_name']} | Risk: {score}/100 ({band}) | SIMD decile: {decile} "
                    f"| Drivers: {d} | Forecast: {f6} in Year 1 (annual count; CI {fl}–{fu}) | Trend: {trend:+}%"
                )
            return f"Ward: {props['ward_name']} | Risk: {score}/100 ({band}) | SIMD decile: {decile} | Drivers: {d}"
        pred = prediction_for(record)
        f6 = pred.get("forecast_6mo")
        trend = pred.get("trend_pct", 0) or 0
        score = props["risk_score"]
        band = risk_band(score)
        forecast_part = f" | Forecast: {f6}/6mo | Trend: {trend:+}%" if f6 is not None else ""
        return f"Ward: {props['ward_name']} | Risk: {score}/100 ({band}) | Drivers: {d}{forecast_part}"

    if mode == "zone":
        name = record.get("zonename") or record.get("zoneid", "zone")
        score = record.get("riskscore") or 0
        band = risk_band(score)
        decile = record.get("simddecile", "?")
        drivers = record.get("drivers") or []
        d = ", ".join(drivers[:2]) or "deprivation"
        f6_raw = record.get("forecast6mo")
        trend_raw = record.get("trendpct")
        try:
            f6 = round(float(f6_raw), 1) if f6_raw is not None and not math.isnan(float(f6_raw)) else None
        except (TypeError, ValueError):
            f6 = None
        try:
            trend = float(trend_raw) if trend_raw is not None and not math.isnan(float(trend_raw)) else None
        except (TypeError, ValueError):
            trend = None
        forecast_part = f" | Forecast: {f6}/6mo | Trend: {trend:+}%" if f6 is not None and trend is not None else ""
        return f"Zone: {name} | Risk: {score}/100 ({band}) | SIMD decile: {decile} | Drivers: {d}{forecast_part}"

    # premises
    d = ", ".join(record.get("drivers", [])[:2]) or "premises risk factors"
    return (
        f"Premises: {record['name']} | Type: {record.get('premises_type','?')} "
        f"| Risk: {record['risk_band']} | Priority: {record['inspection_priority']} | Drivers: {d}"
    )


def openai_explanation(mode, record, source: str = "mock"):
    if not os.getenv("OPENAI_API_KEY"):
        return None

    try:
        from openai import OpenAI
    except ImportError:
        return None

    context = _ai_context(mode, record, source)
    system_prompt = (
        "UK fire service analyst. Given area risk data, write exactly 3 bullet points (•) covering: "
        "(1) where to target prevention activity, (2) how to plan capacity from the forecast, "
        "(3) the single most impactful intervention. One sentence each. No incident predictions."
    )

    try:
        client = OpenAI(timeout=15.0)
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": context},
            ],
            temperature=0.3,
            max_tokens=160,
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


@app.get("/api/status")
def api_status():
    n_components = max((z.get("n_score_components") or 0 for z in zones), default=0)
    return {
        "model_loaded": len(zones) > 0,
        "zones_count": len(zones),
        "forecast_available": len(ward_forecasts) > 0,
        "ward_forecasts_count": len(ward_forecasts),
        "model_components_active": n_components,
        "model_components_total": 5,
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
def get_strategic_wards_geojson(source: str = "mock"):
    use_model = source == "model" and bool(decile_to_model_score)
    return {
        **wards_geojson,
        "features": [
            ward_with_prediction(feature, use_model=use_model)
            for feature in wards_geojson.get("features", [])
        ],
    }


@app.get("/api/strategic/wards/{ward_id}")
def get_strategic_ward(ward_id: str, source: str = "mock"):
    ward = wards_by_id.get(ward_id)
    if ward is None:
        raise HTTPException(status_code=404, detail="Ward not found")
    use_model = source == "model" and bool(decile_to_model_score)
    return ward_with_prediction(ward, use_model=use_model)


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
    source: str = "mock",
):
    if mode == "ward":
        record = wards_by_id.get(record_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Ward not found")
        fallback = (
            fallback_ward_explanation_model(record)
            if source == "model"
            else fallback_ward_explanation(record)
        )
    elif mode == "zone":
        record = zones_by_id.get(record_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Zone not found")
        fallback = fallback_zone_explanation(record)
    elif mode == "premises":
        record = premises_by_id.get(record_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Premises not found")
        fallback = fallback_premises_explanation(record)
    else:
        raise HTTPException(status_code=400, detail="Mode must be 'ward', 'zone', or 'premises'")

    live_text = openai_explanation(mode, record, source=source)
    return {
        "id": record_id,
        "mode": mode,
        "data_source": source,
        "source": "live" if live_text else "fallback",
        "text": live_text or fallback,
    }


@app.get("/api/wards")
def list_wards():
    return list_strategic_wards()


@app.get("/api/wards.geojson")
def get_wards_geojson(source: str = "mock"):
    return get_strategic_wards_geojson(source=source)


@app.get("/api/wards/{ward_id}")
def get_ward(ward_id: str, source: str = "mock"):
    return get_strategic_ward(ward_id, source=source)


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
