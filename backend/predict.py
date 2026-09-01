import os
import logging
import joblib
import pandas as pd

# Set up logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------------------------------------
# Safe ML Component Loader (Includes LabelEncoder)
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "models", "flood_risk_xgb_model.pkl")
PREPROCESSOR_PATH = os.path.join(BASE_DIR, "models", "flood_risk_preprocessor.pkl")
LABEL_ENCODER_PATH = os.path.join(BASE_DIR, "models", "flood_risk_label_encoder.pkl")
THRESHOLD_PATH = os.path.join(BASE_DIR, "models", "high_risk_threshold.pkl")

model = None
preprocessor = None
label_encoder = None
HIGH_THRESHOLD = 0.5
MODEL_LOADED = False

try:
    if (
        os.path.exists(MODEL_PATH)
        and os.path.exists(PREPROCESSOR_PATH)
        and os.path.exists(LABEL_ENCODER_PATH)
    ):
        model = joblib.load(MODEL_PATH)
        preprocessor = joblib.load(PREPROCESSOR_PATH)
        label_encoder = joblib.load(LABEL_ENCODER_PATH)

        if os.path.exists(THRESHOLD_PATH):
            HIGH_THRESHOLD = joblib.load(THRESHOLD_PATH)

        MODEL_LOADED = True
        logger.info(
            f"Flood risk ML model, preprocessor, and label encoder loaded successfully. Target classes: {list(label_encoder.classes_)}"
        )
    else:
        logger.warning("ML model components missing in models/. Using rule-based fallback mode.")
except Exception as e:
    logger.warning(f"ML components failed to load: {e}")
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
    score = 0.0

    # 1. Historical Rainfall Intensity
    rainfall = float(historical_rainfall_intensity_mm_hr or 0)
    if rainfall >= 75:
        score += 0.35
    elif rainfall >= 45:
        score += 0.25
    elif rainfall >= 25:
        score += 0.15
    elif rainfall >= 10:
        score += 0.05

    # 2. Elevation / Topography
    elevation = float(elevation_m or 100)
    if elevation <= 10:
        score += 0.25
    elif elevation <= 25:
        score += 0.18
    elif elevation <= 50:
        score += 0.10
    elif elevation <= 100:
        score += 0.03

    # 3. Land Use / Surface Runoff Potential
    land_use_str = str(land_use).lower() if land_use else ""
    if any(k in land_use_str for k in ["urban", "built-up", "built_up", "commercial", "industrial", "paved"]):
        score += 0.15
    elif any(k in land_use_str for k in ["residential", "suburban"]):
        score += 0.10
    elif any(k in land_use_str for k in ["agriculture", "farmland"]):
        score += 0.05

    # 4. Soil Hydrologic Group & Infiltration
    soil_str = str(soil_group).upper() if soil_group else ""
    if "D" in soil_str or "CLAY" in soil_str:
        score += 0.10
    elif "C" in soil_str or "SILT" in soil_str:
        score += 0.07
    elif "B" in soil_str or "LOAM" in soil_str:
        score += 0.03

    # 5. Drainage Density
    drainage_density = float(drainage_density_km_per_km2 or 0)
    if drainage_density < 0.5:
        score += 0.08
    elif drainage_density < 1.5:
        score += 0.04

    # 6. Storm Drain Proximity
    proximity = float(storm_drain_proximity_m or 500)
    if proximity > 300:
        score += 0.07
    elif proximity > 100:
        score += 0.03

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
    Uses XGBoost ML model with LabelEncoder if available; falls back to heuristic engine if unavailable.
    """

    if MODEL_LOADED:
        try:
            input_df = pd.DataFrame([{
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

            # Feature Engineering
            input_df["runoff_index"] = input_df["historical_rainfall_intensity_mm_hr"] / (input_df["elevation_m"] + 1.0)
            input_df["drainage_inefficiency"] = input_df["storm_drain_proximity_m"] / (input_df["drainage_density_km_per_km2"] + 0.1)

            processed_data = preprocessor.transform(input_df)
            raw_pred = model.predict(processed_data)[0]
            probabilities = model.predict_proba(processed_data)[0]

            # Decode numeric target prediction to string ('High', 'Low', 'Medium')
            risk_label = label_encoder.inverse_transform([raw_pred])[0]

            # Map probabilities using LabelEncoder's fitted classes
            prob_dict = {
                str(cls): round(float(prob), 4)
                for cls, prob in zip(label_encoder.classes_, probabilities)
            }

            low_prob = prob_dict.get("Low", 0.0)
            med_prob = prob_dict.get("Medium", 0.0)
            high_prob = prob_dict.get("High", 0.0)

            # High risk threshold override check
            if high_prob >= HIGH_THRESHOLD:
                risk_label = "High"

            return {
                "risk": risk_label,
                "low_probability": low_prob,
                "medium_probability": med_prob,
                "high_probability": high_prob,
                "mode": "ML_XGBoost"
            }
        except Exception as e:
            logger.error(f"Error during ML inference, defaulting to enhanced fallback: {e}")

    # Heuristic Fallback Path
    return _evaluate_heuristic_flood_risk(
        elevation_m=elevation_m,
        land_use=land_use,
        soil_group=soil_group,
        drainage_density_km_per_km2=drainage_density_km_per_km2,
        storm_drain_proximity_m=storm_drain_proximity_m,
        historical_rainfall_intensity_mm_hr=historical_rainfall_intensity_mm_hr
    )