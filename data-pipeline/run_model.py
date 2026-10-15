"""
FireSight — Data Pipeline Runner
=================================
Computes 5-component DataZone risk scores and ward-level fire forecasts.

Run from inside data-pipeline/ with the venv active:
    python run_model.py

Outputs
-------
  output/glasgowzones.csv          — 746 Glasgow DataZones with risk scores
  output/glasgow_ward_forecasts.csv — 23 Glasgow wards with real fire forecasts

Data sources used
-----------------
  raw/simd2020.csv               — SIMD 2020 decile per DataZone  (REQUIRED)
  raw/simd2020_indicators.xlsx   — Full SIMD indicators per DataZone (REQUIRED)
  raw/fire_statistics_scotland.csv — Dwelling fire counts per ward 2009-2023 (REQUIRED)
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
RAW    = BASE_DIR / "raw"
OUTPUT = BASE_DIR / "output"
OUTPUT.mkdir(exist_ok=True)

GLASGOW_CA   = "S12000049"
# Ward IDs are not a contiguous prefix (North East is S13003133).
WARDS_FILE = BASE_DIR.parent / "backend" / "data" / "glasgow_wards.geojson"
with WARDS_FILE.open() as file:
    GLASGOW_WARD_IDS = {
        feature["properties"]["ward_id"] for feature in json.load(file)["features"]
    }

# ---------------------------------------------------------------------------
# Risk score weights — 5 real components, all from official SIMD data
# ---------------------------------------------------------------------------
RISK_WEIGHTS = {
    "simddecile_inv":    0.25,   # area deprivation (SIMD 2020 decile, inverted)
    "overcrowded_rate":  0.20,   # housing overcrowding rate (SIMD indicators)
    "cif_rate":          0.20,   # comparative illness factor per 1 000 pop (health vulnerability)
    "nocentralheat_rate": 0.20,  # no central heating rate (housing condition)
    "crime_rate_norm":   0.15,   # crime rate per 10 000 pop (disorder / arson proxy)
}

DRIVER_LABELS = {
    "simddecile_inv":     "High area deprivation",
    "overcrowded_rate":   "High housing overcrowding",
    "cif_rate":           "High proportion of health-vulnerable residents",
    "nocentralheat_rate": "Poor housing condition (no central heating)",
    "crime_rate_norm":    "Elevated crime rate",
}

# ---------------------------------------------------------------------------
# 1. Load SIMD 2020 — DataZone → decile
# ---------------------------------------------------------------------------
print("Loading SIMD 2020 ...")
simd_raw = pd.read_csv(RAW / "simd2020.csv")
simd_gla = simd_raw[simd_raw["CA"] == GLASGOW_CA].copy()
simd_clean = simd_gla[["DataZone", "IntZone", "SIMD2020V2CountryDecile"]].copy()
simd_clean.columns = ["zoneid", "intermediatezoneid", "simddecile"]
# IntZone identifies a larger area shared by several DataZones, not a zone name.
simd_clean["zonename"] = simd_clean["zoneid"]
GLASGOW_ZONES = set(simd_clean["zoneid"])
print(f"  Glasgow DataZones: {len(GLASGOW_ZONES)}")

# ---------------------------------------------------------------------------
# 2. Load SIMD 2020 Indicators — housing, health, crime
# ---------------------------------------------------------------------------
print("Loading SIMD 2020 indicators ...")
try:
    ind_df = pd.read_excel(RAW / "simd2020_indicators.xlsx", sheet_name="Data")
except ImportError:
    sys.exit("ERROR: openpyxl is required — run: pip install openpyxl")

ind_gla = ind_df[ind_df["Council_area"] == "Glasgow City"].copy()

# Normalise CIF to per-1 000 population
ind_gla = ind_gla.copy()
ind_gla["cif_rate"] = (
    ind_gla["CIF"] / ind_gla["Total_population"].replace(0, np.nan) * 1000
)

indicators = ind_gla[[
    "Data_Zone", "Total_population", "overcrowded_rate",
    "nocentralheat_rate", "crime_rate", "cif_rate"
]].copy()
indicators.columns = [
    "zoneid", "population", "overcrowded_rate",
    "nocentralheat_rate", "crime_rate", "cif_rate"
]

# crime_rate is per 10 000 pop; rename to make units explicit
# We'll normalise it with the same percentile-clip approach as other components
indicators = indicators.rename(columns={"crime_rate": "crime_rate_norm"})

print(f"  Indicator zones: {len(indicators)}  nulls: {indicators.isnull().sum().sum()}")

# ---------------------------------------------------------------------------
# 3. Build feature table
# ---------------------------------------------------------------------------
print("Building feature table ...")
features = simd_clean.copy()
features["simddecile_inv"] = 11 - features["simddecile"]

features = features.merge(indicators, on="zoneid", how="left")

print(f"  Features shape: {features.shape}")
print("  Null counts per component:")
for col in RISK_WEIGHTS:
    print(f"    {col}: {features[col].isnull().sum()}")

# ---------------------------------------------------------------------------
# 4. Normalise components (percentile clip → min-max → [0, 1])
# ---------------------------------------------------------------------------
def normalise_component(series: pd.Series) -> pd.Series:
    series = pd.to_numeric(series, errors="coerce")
    valid = series.dropna()
    if len(valid) == 0:
        return series
    lo = float(valid.quantile(0.02))
    hi = float(valid.quantile(0.98))
    if hi == lo:
        return series.where(series.isna(), 0.5)
    return (series.clip(lo, hi) - lo) / (hi - lo)

for col in RISK_WEIGHTS:
    features[f"{col}_norm"] = normalise_component(features[col])

# ---------------------------------------------------------------------------
# 5. Weighted risk score
# ---------------------------------------------------------------------------
print("Computing risk scores ...")

def compute_riskscore(row):
    total_w = total_s = n = 0.0
    for col, w in RISK_WEIGHTS.items():
        val = row.get(f"{col}_norm", np.nan)
        if pd.notna(val):
            total_w += w
            total_s += w * val
            n += 1
    if total_w == 0:
        return pd.Series({"riskscore": np.nan, "n_score_components": 0})
    return pd.Series({"riskscore": int(round(total_s / total_w * 100)),
                      "n_score_components": int(n)})

score_result = features.apply(compute_riskscore, axis=1)
features["riskscore"]          = score_result["riskscore"]
features["n_score_components"] = score_result["n_score_components"]

n_scored = features["riskscore"].notna().sum()
print(f"  Zones scored: {n_scored}/746")
print(f"  Components per zone (mode): {int(features['n_score_components'].mode().iloc[0])}/5")
print(f"  Score range: {features['riskscore'].min():.0f} – {features['riskscore'].max():.0f}")
print(f"  Score mean:  {features['riskscore'].mean():.1f}")

# ---------------------------------------------------------------------------
# 6. Drivers — top 3 contributing components
# ---------------------------------------------------------------------------
def extract_drivers(row):
    contributions = {
        col: row.get(f"{col}_norm", np.nan) * w
        for col, w in RISK_WEIGHTS.items()
        if pd.notna(row.get(f"{col}_norm", np.nan))
    }
    if not contributions:
        return None
    top3 = sorted(contributions, key=contributions.get, reverse=True)[:3]
    return [DRIVER_LABELS[c] for c in top3]

features["drivers"] = features.apply(extract_drivers, axis=1)
print(f"  Zones with drivers: {features['drivers'].notna().sum()}/746")

# ---------------------------------------------------------------------------
# 7. Ward-level fire forecasts from fire_statistics_scotland.csv
# ---------------------------------------------------------------------------
print("\nBuilding ward-level fire forecasts ...")

fire_raw = pd.read_csv(RAW / "fire_statistics_scotland.csv")
gla_fires = fire_raw[
    (fire_raw["FeatureCode"].isin(GLASGOW_WARD_IDS)) &
    (fire_raw["Type of Fire"] == "Dwelling Fire") &
    (fire_raw["Accident Status"] == "All")
].copy()

# Pivot to ward × year matrix
pivot = (
    gla_fires
    .pivot_table(index="FeatureCode", columns="DateCode",
                 values="Value", fill_value=0)
)
missing_wards = GLASGOW_WARD_IDS - set(pivot.index)
if missing_wards:
    raise ValueError(f"Missing Glasgow ward fire data: {sorted(missing_wards)}")
pivot = pivot.reindex(sorted(pivot.columns), axis=1)
ward_names = gla_fires.drop_duplicates("FeatureCode").set_index("FeatureCode")["FeatureName"]
print(f"  Glasgow wards with fire data: {len(pivot)}")
print(f"  Years: {pivot.columns.tolist()}")


def forecast_ward(counts, n_periods=(1, 2, 3)):
    """Recency-weighted linear forecast with 95% CI."""
    counts = np.asarray(counts, dtype=float)
    n = len(counts)
    if n < 2:
        last = float(counts[-1]) if n else 0.0
        return {h: {"forecast": round(last), "lower": round(last), "upper": round(last)}
                for h in n_periods} | {"trendpct": 0.0, "data_quality": "insufficient"}

    x = np.arange(n, dtype=float)
    weights = np.exp(np.linspace(0.0, 1.0, n))
    slope, intercept = np.polyfit(x, counts, 1, w=weights)

    fitted    = slope * x + intercept
    residuals = counts - fitted
    res_std   = float(np.std(residuals, ddof=1)) if n > 2 else float(np.abs(residuals).mean())

    results = {}
    for h in n_periods:
        pt = max(0.0, slope * (n - 1 + h) + intercept)
        results[h] = {
            "forecast": round(pt),
            "lower":    round(max(0.0, pt - 1.96 * res_std)),
            "upper":    round(max(0.0, pt + 1.96 * res_std)),
        }

    latest   = float(counts[-1])
    trendpct = round((results[1]["forecast"] - latest) / latest * 100, 1) if latest else 0.0
    return results | {"trendpct": trendpct,
                      "slope": round(float(slope), 3),
                      "data_quality": "sufficient" if n >= 6 else "limited"}


# Legacy output column names are retained for API compatibility. Each forecast
# period below is one year; the UI labels these projections Years 1, 2 and 3.
ward_forecast_rows = []
for ward_code, row in pivot.iterrows():
    counts = row.values.astype(float)
    r = forecast_ward(counts)
    ward_forecast_rows.append({
        "ward_id":        ward_code,
        "ward_name":      ward_names.get(ward_code, ward_code),
        "history_6mo":    counts[-6:].tolist(),   # last six annual observations (legacy field name)
        "forecast_6mo":   r[1]["forecast"],
        "forecast_lower": r[1]["lower"],
        "forecast_upper": r[1]["upper"],
        "forecast_12mo":  r[2]["forecast"],
        "forecast_18mo":  r[3]["forecast"],
        "trend_pct":      r["trendpct"],
        "slope":          r.get("slope", 0.0),
        "data_quality":   r["data_quality"],
        "years_of_data":  len(counts),
    })

ward_forecasts_df = pd.DataFrame(ward_forecast_rows)
print(f"  Wards forecast: {len(ward_forecasts_df)}")
print(f"  Data quality breakdown:\n{ward_forecasts_df['data_quality'].value_counts().to_string()}")

# ---------------------------------------------------------------------------
# 8. Assemble zones output
# ---------------------------------------------------------------------------
print("\nAssembling final output ...")

SCHEMA_COLS = [
    "zoneid", "zonename", "riskscore", "drivers",
    "population", "overcrowded_rate", "nocentralheat_rate",
    "cif_rate", "crime_rate_norm", "simddecile",
    # forecast columns — NaN at DataZone level (ward-level forecasts stored separately)
    "riskrank", "n_score_components", "data_quality",
]

zones = features[[
    "zoneid", "zonename", "intermediatezoneid", "simddecile", "riskscore", "drivers",
    "population", "overcrowded_rate", "nocentralheat_rate",
    "cif_rate", "crime_rate_norm", "n_score_components",
]].copy()

zones["riskrank"]     = zones["riskscore"].rank(ascending=False, method="min").astype("Int64")
zones["data_quality"] = zones["n_score_components"].apply(
    lambda n: "sufficient" if n == 5 else ("limited" if n >= 3 else "insufficient")
)

# Forecast columns kept as NaN — DataZone forecasts need per-zone incident data
for col in ["forecast6mo", "forecastlower", "forecastupper",
            "forecast12mo", "forecast18mo", "trendpct", "seasonalitywinterpct"]:
    zones[col] = np.nan

# ---------------------------------------------------------------------------
# 9. Export
# ---------------------------------------------------------------------------
zones_path = OUTPUT / "glasgowzones.csv"
zones.to_csv(zones_path, index=False)
print(f"\nSaved {len(zones)} zones  ->  {zones_path.resolve()}")

wf_path = OUTPUT / "glasgow_ward_forecasts.csv"
ward_forecasts_df.to_csv(wf_path, index=False)
print(f"Saved {len(ward_forecasts_df)} ward forecasts  ->  {wf_path.resolve()}")

# ---------------------------------------------------------------------------
# Summary report
# ---------------------------------------------------------------------------
print("\n" + "=" * 60)
print("FIRESIGHT MODEL RUN COMPLETE")
print("=" * 60)
print(f"  DataZones scored:       {n_scored}/746")
print(f"  Components per zone:    {int(features['n_score_components'].mode().iloc[0])}/5")
print(f"  Data quality (5/5):     {(zones['data_quality']=='sufficient').sum()}/746")
print(f"  Ward forecasts:         {len(ward_forecasts_df)}/23")
print(f"  Score range:            {zones['riskscore'].min()}-{zones['riskscore'].max()}")
print(f"  Score mean:             {zones['riskscore'].mean():.1f}")
print(f"  Score std dev:          {zones['riskscore'].std():.1f}")
print()
print("Top 10 highest-risk DataZones:")
top10 = zones.nsmallest(10, "riskrank")[["zoneid", "zonename", "riskscore", "riskrank"]]
print(top10.to_string(index=False))
print()
print("Ward forecast sample (top 5 by forecast_6mo):")
wf_top = ward_forecasts_df.nlargest(5, "forecast_6mo")[
    ["ward_name", "forecast_6mo", "trend_pct", "data_quality"]
]
print(wf_top.to_string(index=False))
