import os
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_CSV = os.path.join(DATA_DIR, "flood_test_data.csv")

os.makedirs(DATA_DIR, exist_ok=True)


def generate_hydrological_dataset(num_samples=500):
    np.random.seed(42)

    land_uses = ["Urban", "Residential", "Agricultural", "Forest"]
    soil_groups = ["Group A", "Group B", "Group C", "Group D"]
    drain_types = ["Open Ditch", "Concrete Pipe", "Curb Inlet"]

    data = []
    for _ in range(num_samples):
        elevation = np.random.uniform(2, 120)
        rainfall = np.random.uniform(5, 120)
        drainage_density = np.random.uniform(0.2, 3.5)
        storm_proximity = np.random.uniform(10, 800)
        land_use = np.random.choice(land_uses)
        soil_group = np.random.choice(soil_groups)

        # Hydrological scoring heuristic to establish realistic ground truth
        score = 0.0

        # 1. Rainfall intensity
        if rainfall > 70:
            score += 0.35
        elif rainfall > 40:
            score += 0.20
        elif rainfall > 20:
            score += 0.10

        # 2. Elevation
        if elevation < 15:
            score += 0.30
        elif elevation < 40:
            score += 0.15

        # 3. Land use & Soil absorption
        if land_use in ["Urban"]:
            score += 0.15
        if soil_group in ["Group D"]:
            score += 0.10

        # 4. Infrastructure proximity
        if storm_proximity > 400:
            score += 0.10

        # Assign multi-class labels based on realistic environmental risk thresholds
        if score >= 0.55:
            risk = "High"
        elif score >= 0.30:
            risk = "Medium"
        else:
            risk = "Low"

        data.append(
            {
                "latitude": round(np.random.uniform(12.2, 12.4), 6),
                "longitude": round(np.random.uniform(76.5, 76.7), 6),
                "elevation_m": round(elevation, 2),
                "land_use": land_use,
                "soil_group": soil_group,
                "drainage_density_km_per_km2": round(drainage_density, 2),
                "storm_drain_proximity_m": round(storm_proximity, 2),
                "storm_drain_type": np.random.choice(drain_types),
                "historical_rainfall_intensity_mm_hr": round(rainfall, 2),
                "risk": risk,
            }
        )

    df = pd.DataFrame(data)
    df.to_csv(OUTPUT_CSV, index=False)
    print(
        f"Successfully generated {num_samples} realistic hydrological records at:"
    )
    print(OUTPUT_CSV)
    print("\nClass Distribution:")
    print(df["risk"].value_counts())


if __name__ == "__main__":
    generate_hydrological_dataset()