import os
import requests

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")

def verify_with_weather(lat, lon, incident_type):
    if not WEATHER_API_KEY:
        return {"verified": False, "reason": "API key missing", "confidence": "Medium"}
    
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric"
    
    try:
        response = requests.get(url, timeout=5)
        if response.status_code != 200:
            return {"verified": False, "reason": "Weather API unavailable"}
            
        data = response.json()
        weather_condition = data.get("weather", [{}])[0].get("main", "").lower()
        rain_1h = data.get("rain", {}).get("1h", 0)
        
        if incident_type.lower() in ["flood", "waterlogging", "storm"]:
            if "rain" in weather_condition or "thunderstorm" in weather_condition or rain_1h > 1.0:
                return {"verified": True, "condition": weather_condition, "rain_1h": rain_1h}
            else:
                return {"verified": False, "condition": weather_condition, "reason": "No current rain detected"}
                
        return {"verified": True, "condition": weather_condition}

    except Exception as e:
        return {"verified": False, "reason": str(e)}