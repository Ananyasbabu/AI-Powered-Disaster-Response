import os
import joblib
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler, LabelEncoder
from sklearn.compose import ColumnTransformer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "flood_test_data.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")

os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODELS_DIR, "flood_risk_xgb_model.pkl")
PREPROCESSOR_PATH = os.path.join(MODELS_DIR, "flood_risk_preprocessor.pkl")
LABEL_ENCODER_PATH = os.path.join(MODELS_DIR, "flood_risk_label_encoder.pkl")

def train():
    if not os.path.exists(DATA_PATH):
        print(f"Dataset not found at {DATA_PATH}")
        return

    df = pd.read_csv(DATA_PATH)

    # 1. Feature Engineering
    df["runoff_index"] = df["historical_rainfall_intensity_mm_hr"] / (df["elevation_m"] + 1.0)
    df["drainage_inefficiency"] = df["storm_drain_proximity_m"] / (df["drainage_density_km_per_km2"] + 0.1)

    X = df.drop(columns=["risk"])
    
    # 2. Encode string targets ('High', 'Low', 'Medium') -> integers (0, 1, 2)
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(df["risk"])

    numeric_features = [
        "latitude", "longitude", "elevation_m",
        "drainage_density_km_per_km2", "storm_drain_proximity_m",
        "historical_rainfall_intensity_mm_hr", "runoff_index", "drainage_inefficiency"
    ]
    categorical_features = ["land_use", "soil_group", "storm_drain_type"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
        ]
    )

    X_processed = preprocessor.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_processed, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    # 3. Fit XGBoost Model
    model = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="mlogloss",
        random_state=42
    )

    model.fit(X_train, y_train)

    # 4. Save model, preprocessor, and label encoder
    joblib.dump(model, MODEL_PATH)
    joblib.dump(preprocessor, PREPROCESSOR_PATH)
    joblib.dump(label_encoder, LABEL_ENCODER_PATH)
    
    print("SUCCESS: Retrained XGBoost model, preprocessor, and label encoder saved to models/")

if __name__ == "__main__":
    train()