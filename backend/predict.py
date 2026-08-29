import os
import joblib
import pandas as pd


# --------------------------------------------------
# Load saved ML components
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "flood_risk_xgb_model.pkl"
)

PREPROCESSOR_PATH = os.path.join(
    BASE_DIR,
    "models",
    "flood_risk_preprocessor.pkl"
)

THRESHOLD_PATH = os.path.join(
    BASE_DIR,
    "models",
    "high_risk_threshold.pkl"
)


model = joblib.load(MODEL_PATH)
preprocessor = joblib.load(PREPROCESSOR_PATH)
HIGH_THRESHOLD = joblib.load(THRESHOLD_PATH)


# --------------------------------------------------
# Prediction function
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
    """

    # Create input DataFrame
    input_data = pd.DataFrame([{
        "latitude": latitude,
        "longitude": longitude,
        "elevation_m": elevation_m,
        "land_use": land_use,
        "soil_group": soil_group,
        "drainage_density_km_per_km2": drainage_density_km_per_km2,
        "storm_drain_proximity_m": storm_drain_proximity_m,
        "storm_drain_type": storm_drain_type,
        "historical_rainfall_intensity_mm_hr":
            historical_rainfall_intensity_mm_hr
    }])

    # Apply the same preprocessing used during training
    processed_data = preprocessor.transform(input_data)

    # Get probabilities
    probabilities = model.predict_proba(processed_data)[0]

    low_probability = float(probabilities[0])
    medium_probability = float(probabilities[1])
    high_probability = float(probabilities[2])

    # Apply selected High-risk threshold
    if high_probability >= HIGH_THRESHOLD:
        risk = "High"

    elif low_probability >= medium_probability:
        risk = "Low"

    else:
        risk = "Medium"

    return {
        "risk": risk,
        "low_probability": round(low_probability, 4),
        "medium_probability": round(medium_probability, 4),
        "high_probability": round(high_probability, 4)
    }