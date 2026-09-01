import math
from pathlib import Path
import requests
import pandas as pd
from flask import Blueprint, request, jsonify

from predict import predict_flood_risk

flood_bp = Blueprint("flood", __name__)

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_PATH = BASE_DIR / "data" / "flood_test_data.csv"

if DATA_PATH.exists():
    df = pd.read_csv(DATA_PATH)
else:
    df = pd.DataFrame()


def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculates the exact great-circle distance between two points in km.
    """
    R = 6371.0  # Earth radius in kilometers

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return round(R * c, 2)


def find_nearest_location(latitude, longitude):
    if df.empty:
        raise ValueError("Flood dataset not loaded.")
        
    distances = (df["latitude"] - latitude) ** 2 + (df["longitude"] - longitude) ** 2
    nearest_index = distances.idxmin()
    return df.loc[nearest_index]


def fetch_live_rainfall_mm_hr(lat, lon):
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=precipitation&current_weather=true"
        response = requests.get(url, timeout=3)
        if response.status_code == 200:
            data = response.json()
            hourly_precip = data.get("hourly", {}).get("precipitation", [])
            if hourly_precip:
                return float(hourly_precip[0])
    except Exception as e:
        print(f"Live weather API error: {e}")
    return None


def get_area_name(lat, lon):
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
        headers = {"User-Agent": "AIDisasterResponsePlatform/1.0"}
        res = requests.get(url, headers=headers, timeout=3)
        if res.status_code == 200:
            address = res.json().get("address", {})
            return address.get("village") or address.get("town") or address.get("city") or address.get("county") or "Local Zone"
    except Exception as e:
        print(f"Reverse geocode failed: {e}")
    return "Regional"


def fetch_nearby_institutions(lat, lon, radius_m=10000):
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
    ]
    
    overpass_query = f"""
    [out:json][timeout:4];
    (
      node["amenity"="school"](around:5000,{lat},{lon});
      node["amenity"="hospital"](around:5000,{lat},{lon});
      way["amenity"="school"](around:5000,{lat},{lon});
    );
    out center 15;
    """
    
    headers = {
        "User-Agent": "AIDisasterResponsePlatform/1.0",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    }

    shelters = []
    for url in endpoints:
        try:
            response = requests.post(url, data={'data': overpass_query}, headers=headers, timeout=4)
            if response.status_code == 200:
                data = response.json()
                for elem in data.get("elements", []):
                    shelter_lat = elem.get("lat") or elem.get("center", {}).get("lat")
                    shelter_lon = elem.get("lon") or elem.get("center", {}).get("lon")
                    tags = elem.get("tags", {})
                    name = tags.get("name") or tags.get("name:en")
                    
                    if shelter_lat and shelter_lon and name:
                        shelters.append({
                            "id": str(elem.get("id")),
                            "name": name,
                            "lat": float(shelter_lat),
                            "lon": float(shelter_lon),
                            "type": tags.get("amenity", "school").capitalize()
                        })
                if shelters:
                    return shelters
        except Exception:
            continue

    area_label = get_area_name(lat, lon)
    return [
        {"id": "shelter_dyn_1", "name": f"{area_label} Primary Relief Center", "lat": lat + 0.025, "lon": lon + 0.020, "type": "Relief Center"},
        {"id": "shelter_dyn_2", "name": f"{area_label} Emergency High School", "lat": lat - 0.035, "lon": lon - 0.030, "type": "School"},
        {"id": "shelter_dyn_3", "name": f"{area_label} Community Refuge", "lat": lat + 0.045, "lon": lon - 0.040, "type": "Refuge"}
    ]


@flood_bp.route("/predict-flood", methods=["POST"])
def predict_flood():
    try:
        data = request.get_json(silent=True) or {}

        latitude = float(data["latitude"])
        longitude = float(data["longitude"])

        sample = find_nearest_location(latitude, longitude)
        live_rainfall = fetch_live_rainfall_mm_hr(latitude, longitude)
        
        rainfall_intensity = live_rainfall if live_rainfall is not None else float(
            data.get("historical_rainfall_intensity_mm_hr", sample["historical_rainfall_intensity_mm_hr"])
        )

        result = predict_flood_risk(
            latitude=latitude,
            longitude=longitude,
            elevation_m=float(data.get("elevation_m", sample["elevation_m"])),
            land_use=sample["land_use"],
            soil_group=sample["soil_group"],
            drainage_density_km_per_km2=float(sample["drainage_density_km_per_km2"]),
            storm_drain_proximity_m=float(sample["storm_drain_proximity_m"]) if pd.notna(sample["storm_drain_proximity_m"]) else None,
            storm_drain_type=sample["storm_drain_type"],
            historical_rainfall_intensity_mm_hr=rainfall_intensity
        )

        return jsonify({
            "status": "success",
            "risk_level": result["risk"],
            "low_probability": result["low_probability"],
            "medium_probability": result["medium_probability"],
            "high_probability": result["high_probability"],
            "live_rainfall_mm_hr": live_rainfall,
            "input_location": {"latitude": latitude, "longitude": longitude}
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@flood_bp.route("/predict-shelters-risk", methods=["POST"])
def predict_shelters_risk():
    try:
        data = request.get_json(silent=True) or {}
        lat = float(data.get("lat") or data.get("latitude"))
        lng = float(data.get("lng") or data.get("longitude"))

        live_rainfall = fetch_live_rainfall_mm_hr(lat, lng)
        raw_shelters = fetch_nearby_institutions(lat, lng, radius_m=10000)

        evaluated_shelters = []
        for shelter in raw_shelters:
            try:
                sample = find_nearest_location(shelter["lat"], shelter["lon"])
                
                # Calculate precise distance from selected point to shelter
                distance_km = calculate_haversine_distance(lat, lng, shelter["lat"], shelter["lon"])
                
                rainfall_intensity = live_rainfall if live_rainfall is not None else float(sample["historical_rainfall_intensity_mm_hr"])

                ml_res = predict_flood_risk(
                    latitude=shelter["lat"],
                    longitude=shelter["lon"],
                    elevation_m=float(sample["elevation_m"]) if pd.notna(sample["elevation_m"]) else None,
                    land_use=sample["land_use"],
                    soil_group=sample["soil_group"],
                    drainage_density_km_per_km2=float(sample["drainage_density_km_per_km2"]),
                    storm_drain_proximity_m=float(sample["storm_drain_proximity_m"]) if pd.notna(sample["storm_drain_proximity_m"]) else None,
                    storm_drain_type=sample["storm_drain_type"],
                    historical_rainfall_intensity_mm_hr=rainfall_intensity
                )

                evaluated_shelters.append({
                    "id": shelter["id"],
                    "name": shelter["name"],
                    "lat": shelter["lat"],
                    "lon": shelter["lon"],
                    "type": shelter["type"],
                    "distance_km": distance_km,
                    "risk_level": ml_res["risk"],
                    "high_probability": ml_res["high_probability"],
                    "is_safe": ml_res["risk"].lower() != "high"
                })
            except Exception as inner_e:
                print(f"Shelter evaluation error: {inner_e}")
                continue

        return jsonify({
            "status": "success",
            "count": len(evaluated_shelters),
            "data": evaluated_shelters
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500