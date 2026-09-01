import os
import logging
import pandas as pd

# Set up logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------------------------------------
# Safe ML Component Loader (Bypasses AppLocker DLL Blocks)
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "models", "flood_risk_xgb_model.pkl")
PREPROCESSOR_PATH = os.path.join(BASE_DIR, "models", "flood_risk_preprocessor.pkl")
THRESHOLD_PATH = os.path.join(BASE_DIR, "models", "high_risk_threshold.pkl")

model = None
preprocessor = None
HIGH_THRESHOLD = 0.5
MODEL_LOADED = False

try:
    import joblib
    if os.path.exists(MODEL_PATH) and os.path.exists(PREPROCESSOR_PATH):
        model = joblib.load(MODEL_PATH)
        preprocessor = joblib.load(PREPROCESSOR_PATH)
        if os.path.exists(THRESHOLD_PATH):
            HIGH_THRESHOLD = joblib.load(THRESHOLD_PATH)
        MODEL_LOADED = True
        logger.info("Flood risk ML model and preprocessor loaded successfully.")
    else:
        logger.warning("ML model files missing. Using rule-based fallback mode.")
except Exception as e:
    logger.warning(f"ML components failed to load due to security policy (AppLocker/DLL block): {e}")
    logger.info("Activating rule-based fallback mechanism.")
    MODEL_LOADED = False


# --------------------------------------------------
# Comprehensive Multi-Factor Heuristic Fallback Engine
# --------------------------------------------------

def _evaluate_heuristic_flood_risk(
    elevation_m,
    land_use,
    soil_group,
    drainage_density_km_per_km2,
    storm_drain_proximity_m,
    historical_rainfall_intensity_mm_hr
):
    """
    Weighted environmental scoring algorithm when ML binaries are blocked.
    Evaluates rainfall, elevation, soil permeability, land surface type,
    drainage density, and proximity to storm drains.
    """
    score = 0.0

    # 1. Historical Rainfall Intensity (Weight: up to 0.35)
    rainfall = float(historical_rainfall_intensity_mm_hr or 0)
    if rainfall >= 75:
        score += 0.35
    elif rainfall >= 45:
        score += 0.25
    elif rainfall >= 25:
        score += 0.15
    elif rainfall >= 10:
        score += 0.05

    # 2. Elevation / Topography (Weight: up to 0.25)
    elevation = float(elevation_m or 100)
    if elevation <= 10:
        score += 0.25
    elif elevation <= 25:
        score += 0.18
    elif elevation <= 50:
        score += 0.10
    elif elevation <= 100:
        score += 0.03

    # 3. Land Use / Surface Runoff Potential (Weight: up to 0.15)
    land_use_str = str(land_use).lower() if land_use else ""
    if any(k in land_use_str for k in ["urban", "built-up", "built_up", "commercial", "industrial", "paved"]):
        score += 0.15
    elif any(k in land_use_str for k in ["residential", "suburban"]):
        score += 0.10
    elif any(k in land_use_str for k in ["agriculture", "farmland"]):
        score += 0.05

    # 4. Soil Hydrologic Group & Infiltration (Weight: up to 0.10)
    soil_str = str(soil_group).upper() if soil_group else ""
    if "D" in soil_str or "CLAY" in soil_str:
        score += 0.10  # Very low infiltration rate
    elif "C" in soil_str or "SILT" in soil_str:
        score += 0.07  # Moderate-to-low infiltration
    elif "B" in soil_str or "LOAM" in soil_str:
        score += 0.03  # Moderate infiltration
    # Group A (Sand/Gravel) adds 0.0 (High infiltration)

    # 5. Drainage Density (Weight: up to 0.08)
    drainage_density = float(drainage_density_km_per_km2 or 0)
    if drainage_density < 0.5:
        score += 0.08  # Poor natural stream/channel network
    elif drainage_density < 1.5:
        score += 0.04

    # 6. Storm Drain Proximity (Weight: up to 0.07)
    proximity = float(storm_drain_proximity_m or 500)
    if proximity > 300:
        score += 0.07  # Far from municipal storm infrastructure
    elif proximity > 100:
        score += 0.03

    # Dynamic Probability & Class Assignment
    if score >= 0.55:
        risk = "High"
        high_p = round(min(0.95, 0.65 + (score - 0.55)), 4)
        med_p = round((1.0 - high_p) * 0.7, 4)
        low_p = round(1.0 - high_p - med_p, 4)
    elif score >= 0.30:
        risk = "Medium"
        med_p = round(min(0.85, 0.55 + (score - 0.30)), 4)
        high_p = round((1.0 - med_p) * 0.5, 4)
        low_p = round(1.0 - med_p - high_p, 4)
    else:
        risk = "Low"
        low_p = round(max(0.60, 0.90 - score), 4)
        med_p = round((1.0 - low_p) * 0.7, 4)
        high_p = round(1.0 - low_p - med_p, 4)

    return {
        "risk": risk,
        "low_probability": low_p,
        "medium_probability": med_p,
        "high_probability": high_p,
        "mode": "Enhanced_Rule_Based_Fallback",
        "heuristic_score": round(score, 4)
    }


# --------------------------------------------------
# Unified Prediction Function
# --------------------------------------------------

def predict_flood_risk(
    latitude,
    longitude,
    elevation_m,
    land_use,
    soil_group,
    drainage_density_km_per_km2,
    storm_drain_proximity_m,
    storm_drain_type,
    historical_rainfall_intensity_mm_hr
):
    """
    Predict flood risk for a geographical location.
    Uses XGBoost ML model if available; otherwise uses a multi-factor environmental heuristic engine.
    """

    # --- Option 1: ML Model Path (Runs when SciPy/XGBoost DLLs are allowed) ---
    if MODEL_LOADED:
        try:
            input_data = pd.DataFrame([{
                "latitude": latitude,
                "longitude": longitude,
                "elevation_m": elevation_m,
                "land_use": land_use,
                "soil_group": soil_group,
                "drainage_density_km_per_km2": drainage_density_km_per_km2,
                "storm_drain_proximity_m": storm_drain_proximity_m,
                "storm_drain_type": storm_drain_type,
                "historical_rainfall_intensity_mm_hr": historical_rainfall_intensity_mm_hr
            }])

            processed_data = preprocessor.transform(input_data)
            probabilities = model.predict_proba(processed_data)[0]

            low_prob = float(probabilities[0])
            med_prob = float(probabilities[1])
            high_prob = float(probabilities[2])

            if high_prob >= HIGH_THRESHOLD:
                risk = "High"
            elif low_prob >= med_prob:
                risk = "Low"
            else:
                risk = "Medium"

            return {
                "risk": risk,
                "low_probability": round(low_prob, 4),
                "medium_probability": round(med_prob, 4),
                "high_probability": round(high_prob, 4),
                "mode": "ML_XGBoost"
            }
        except Exception as e:
            logger.error(f"Error during ML inference, defaulting to enhanced fallback: {e}")

    # --- Option 2: Multi-Factor Heuristic Fallback Path ---
    return _evaluate_heuristic_flood_risk(
        elevation_m=elevation_m,
        land_use=land_use,
        soil_group=soil_group,
        drainage_density_km_per_km2=drainage_density_km_per_km2,
        storm_drain_proximity_m=storm_drain_proximity_m,
        historical_rainfall_intensity_mm_hr=historical_rainfall_intensity_mm_hr
    )