from pathlib import Path

import pandas as pd
from flask import Blueprint, request, jsonify

from predict import predict_flood_risk


flood_bp = Blueprint("flood", __name__)

# Project root
BASE_DIR = Path(__file__).resolve().parents[3]

DATA_PATH = BASE_DIR / "data" / "flood_dataset.csv"

df = pd.read_csv(DATA_PATH)


def find_nearest_location(latitude, longitude):
    """
    Find the dataset location geographically closest
    to the requested latitude and longitude.
    """

    distances = (
        (df["latitude"] - latitude) ** 2
        + (df["longitude"] - longitude) ** 2
    )

    nearest_index = distances.idxmin()

    return df.loc[nearest_index]


@flood_bp.route("/predict-flood", methods=["POST"])
def predict_flood():

    try:
        data = request.get_json(silent=True) or {}

        latitude = float(data["latitude"])
        longitude = float(data["longitude"])

        # Find nearest location in dataset
        sample = find_nearest_location(
            latitude,
            longitude
        )

        # Run YOUR trained ML model
        result = predict_flood_risk(
            latitude=float(sample["latitude"]),
            longitude=float(sample["longitude"]),
            elevation_m=float(sample["elevation_m"])
                if pd.notna(sample["elevation_m"]) else None,
            land_use=sample["land_use"],
            soil_group=sample["soil_group"],
            drainage_density_km_per_km2=float(
                sample["drainage_density_km_per_km2"]
            ),
            storm_drain_proximity_m=float(
                sample["storm_drain_proximity_m"]
            ) if pd.notna(sample["storm_drain_proximity_m"]) else None,
            storm_drain_type=sample["storm_drain_type"],
            historical_rainfall_intensity_mm_hr=float(
                sample["historical_rainfall_intensity_mm_hr"]
            )
        )

        return jsonify({
    "status": "success",
    "risk_level": result["risk"],

    # ML probabilities
    "low_probability": result["low_probability"],
    "medium_probability": result["medium_probability"],
    "high_probability": result["high_probability"],

    "input_location": {
        "latitude": latitude,
        "longitude": longitude
    },

    "dataset_location": {
        "latitude": float(sample["latitude"]),
        "longitude": float(sample["longitude"])
    }
}), 200

    except KeyError as e:
        return jsonify({
            "error": f"Missing required field: {str(e)}"
        }), 400

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 400