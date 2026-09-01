import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "flood_test_data.csv")
MODEL_PATH = os.path.join(BASE_DIR, "models", "flood_risk_xgb_model.pkl")
PREPROCESSOR_PATH = os.path.join(BASE_DIR, "models", "flood_risk_preprocessor.pkl")
LABEL_ENCODER_PATH = os.path.join(BASE_DIR, "models", "flood_risk_label_encoder.pkl")

def evaluate_xgboost_model():
    if not os.path.exists(DATA_PATH):
        print(f"Dataset not found at: {DATA_PATH}")
        return

    df = pd.read_csv(DATA_PATH)

    # Feature Engineering
    df["runoff_index"] = df["historical_rainfall_intensity_mm_hr"] / (df["elevation_m"] + 1.0)
    df["drainage_inefficiency"] = df["storm_drain_proximity_m"] / (df["drainage_density_km_per_km2"] + 0.1)

    X = df.drop(columns=["risk"])
    y_raw = df["risk"]

    if not (os.path.exists(MODEL_PATH) and os.path.exists(PREPROCESSOR_PATH) and os.path.exists(LABEL_ENCODER_PATH)):
        print("Missing required binary model files in models/. Please run train_model.py first.")
        return

    model = joblib.load(MODEL_PATH)
    preprocessor = joblib.load(PREPROCESSOR_PATH)
    label_encoder = joblib.load(LABEL_ENCODER_PATH)

    X_processed = preprocessor.transform(X)
    y_encoded = label_encoder.transform(y_raw)

    X_train, X_test, y_train, y_test = train_test_split(
        X_processed, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    # Predict raw integer class indexes
    raw_preds = model.predict(X_test)

    # Decode target integer predictions back to string labels ('High', 'Low', 'Medium')
    y_test_labels = label_encoder.inverse_transform(y_test)
    y_pred_labels = label_encoder.inverse_transform(raw_preds)

    # Evaluate Accuracy
    acc = accuracy_score(y_test_labels, y_pred_labels)
    print("\n" + "="*50)
    print(f" XGBoost Model Test Accuracy: {acc * 100:.2f}%")
    print("="*50 + "\n")

    print("Classification Report:")
    print(classification_report(y_test_labels, y_pred_labels))

    print("Confusion Matrix:")
    labels = list(label_encoder.classes_)
    cm = confusion_matrix(y_test_labels, y_pred_labels, labels=labels)
    cm_df = pd.DataFrame(cm, index=[f"Actual {l}" for l in labels], columns=[f"Pred {l}" for l in labels])
    print(cm_df)

if __name__ == "__main__":
    evaluate_xgboost_model()