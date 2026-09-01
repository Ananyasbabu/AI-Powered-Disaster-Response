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
# Unified Prediction Function with Rule-Based Fallback
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
    Uses XGBoost ML model if available; otherwise uses deterministic environmental heuristics.
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
            logger.error(f"Error during ML inference, defaulting to fallback: {e}")

    # --- Option 2: Heuristic Fallback Path (Runs when C-extensions are blocked) ---
    rainfall = float(historical_rainfall_intensity_mm_hr or 0)
    elevation = float(elevation_m or 100)

    # Risk heuristic score calculation
    risk_score = 0.0
    if rainfall > 40:
        risk_score += 0.5
    elif rainfall > 20:
        risk_score += 0.3
    
    if elevation < 15:
        risk_score += 0.4
    elif elevation < 40:
        risk_score += 0.2

    if risk_score >= 0.6:
        risk = "High"
        h_prob, m_prob, l_prob = 0.80, 0.15, 0.05
    elif risk_score >= 0.3:
        risk = "Medium"
        h_prob, m_prob, l_prob = 0.20, 0.65, 0.15
    else:
        risk = "Low"
        h_prob, m_prob, l_prob = 0.05, 0.15, 0.80

    return {
        "risk": risk,
        "low_probability": l_prob,
        "medium_probability": m_prob,
        "high_probability": h_prob,
        "mode": "Rule_Based_Fallback"
    }