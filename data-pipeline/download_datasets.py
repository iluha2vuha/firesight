"""
FireSight — Dataset Downloader
Run this script from inside data-pipeline/ with the venv active:
    python download_datasets.py
"""

import io
import os
import shutil
import zipfile
from pathlib import Path

import requests

RAW = Path("raw")
RAW.mkdir(exist_ok=True)

HEADERS = {"User-Agent": "Mozilla/5.0 (FireSight hackathon data pipeline)"}


def download(url: str, dest: Path, label: str) -> bool:
    if dest.exists():
        print(f"  [skip] {label} already exists ({dest.name})")
        return True
    print(f"  Downloading {label} ...")
    try:
        r = requests.get(url, headers=HEADERS, timeout=120)
        r.raise_for_status()
        dest.write_bytes(r.content)
        print(f"  Saved {len(r.content) / 1024:.0f} KB  ->  {dest}")
        return True
    except Exception as e:
        print(f"  FAILED: {e}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# 1.  SIMD 2020v2  —  FULL INDICATOR FILE  (Excel, 2.5 MB)
#     Contains Housing, Crime, Health, Employment sub-domain scores
#     per DataZone.  This is separate from the rank/decile CSV you already have.
# ─────────────────────────────────────────────────────────────────────────────
print("\n[1] SIMD 2020v2 full indicator data")
SIMD_XLSX_URL = (
    "https://www.gov.scot/binaries/content/documents/govscot/publications/"
    "statistics/2020/01/scottish-index-of-multiple-deprivation-2020-indicator-data/"
    "documents/simd_2020_indicators/simd_2020_indicators/"
    "govscot%3Adocument/SIMD%2B2020v2%2B-%2Bindicators.xlsx"
)
simd_xlsx = RAW / "simd2020_indicators.xlsx"
simd_csv  = RAW / "simd2020_indicators.csv"

if not simd_csv.exists():
    if download(SIMD_XLSX_URL, simd_xlsx, "SIMD 2020v2 indicators (xlsx)"):
        import pandas as pd
        print("  Converting Excel -> CSV ...")
        xls = pd.ExcelFile(simd_xlsx)
        print(f"  Sheets in file: {xls.sheet_names}")
        # The indicator data is typically on the first sheet
        df = pd.read_excel(simd_xlsx, sheet_name=0)
        print(f"  Shape: {df.shape}")
        print(f"  Columns: {df.columns.tolist()}")
        df.to_csv(simd_csv, index=False)
        print(f"  Saved CSV  ->  {simd_csv}")
        simd_xlsx.unlink()  # remove xlsx to save space
else:
    print(f"  [skip] {simd_csv.name} already exists")


# ─────────────────────────────────────────────────────────────────────────────
# 2.  DataZone 2011 Boundaries  (Shapefile -> GeoJSON)
#     All-Scotland DataZone polygons.  We filter to Glasgow in the notebook.
# ─────────────────────────────────────────────────────────────────────────────
print("\n[2] DataZone 2011 boundaries")
DZ_ZIP_URL = "https://maps.gov.scot/ATOM/shapefiles/SG_DataZoneBdry_2011.zip"
dz_geojson = RAW / "scotland_datazones.geojson"
dz_tmp     = RAW / "_dz_tmp"

if not dz_geojson.exists():
    try:
        import geopandas as gpd

        print("  Downloading shapefile ZIP ...")
        r = requests.get(DZ_ZIP_URL, headers=HEADERS, timeout=180)
        r.raise_for_status()
        print(f"  Downloaded {len(r.content) / 1024:.0f} KB — extracting ...")

        z = zipfile.ZipFile(io.BytesIO(r.content))
        z.extractall(dz_tmp)

        shp_files = list(dz_tmp.rglob("*.shp"))
        if not shp_files:
            raise FileNotFoundError("No .shp file found in ZIP")

        gdf = gpd.read_file(shp_files[0])
        print(f"  Loaded {len(gdf)} zones  —  columns: {gdf.columns.tolist()}")

        # Reproject to WGS84 (standard for GeoJSON / web maps)
        gdf = gdf.to_crs("EPSG:4326")
        gdf.to_file(dz_geojson, driver="GeoJSON")
        print(f"  Saved GeoJSON  ->  {dz_geojson}")

    except ImportError:
        print("  geopandas not installed — run: pip install geopandas")
    except Exception as e:
        print(f"  FAILED: {e}")
    finally:
        if dz_tmp.exists():
            shutil.rmtree(dz_tmp)
else:
    print(f"  [skip] {dz_geojson.name} already exists")


# ─────────────────────────────────────────────────────────────────────────────
# 3.  Scottish Fire Statistics  (Council Area level, from statistics.gov.scot)
#     NOTE: This is aggregated at Council Area level — NOT DataZone level.
#     It provides total dwelling fire counts per council area per year (2009–2023).
#     Useful for Glasgow-wide trend context but cannot be used for per-zone
#     forecasting.  For DataZone-level incident data you would need SFRS
#     operational data which is not publicly available at that resolution.
# ─────────────────────────────────────────────────────────────────────────────
print("\n[3] Scottish Fire Statistics (Council Area level)")
FIRE_URL = (
    "https://statistics.gov.scot/downloads/cube-table"
    "?uri=http%3A%2F%2Fstatistics.gov.scot%2Fdata%2Ffire---type-of-incident"
)
download(FIRE_URL, RAW / "fire_statistics_scotland.csv",
         "Fire type-of-incident statistics")


# ─────────────────────────────────────────────────────────────────────────────
# 4.  Census 2022  —  MANUAL STEP REQUIRED
#     NRS has not published bulk DataZone-level Census 2022 CSVs via direct URL.
#     Download these two tables manually from scotlandscensus.gov.uk:
#
#     Table needed — Population by age:
#       https://www.scotlandscensus.gov.uk/search-the-census
#       Select: Geography = Data Zone, Variable = Age (5-year groups)
#       Download as CSV  ->  save as  raw/census2022_age_datazone.csv
#
#     Table needed — Household composition:
#       Select: Geography = Data Zone, Variable = Household composition
#       Download as CSV  ->  save as  raw/census2022_household_datazone.csv
#
#     Expected columns (adjust CENSUS_* constants in notebook Section 3):
#       DataZone, total_population, age65plus,
#       single_occ_households, total_households
# ─────────────────────────────────────────────────────────────────────────────
print("\n[4] Census 2022 — MANUAL DOWNLOAD REQUIRED")
print("    Visit: https://www.scotlandscensus.gov.uk/search-the-census")
print("    Download two tables at DataZone level:")
print("    - Age (5-year groups)  ->  save as raw/census2022_age_datazone.csv")
print("    - Household composition  ->  save as raw/census2022_household_datazone.csv")


# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("FILES IN raw/:")
for f in sorted(RAW.iterdir()):
    size = f.stat().st_size / 1024
    print(f"  {f.name:45s}  {size:>8.0f} KB")
