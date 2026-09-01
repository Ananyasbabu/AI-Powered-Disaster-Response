import os
import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "flood_risk_xgb_model.pkl")
PREPROCESSOR_PATH = os.path.join(BASE_DIR, "models", "flood_risk_preprocessor.pkl")
TEST_CSV_PATH = os.path.join(BASE_DIR, "data", "flood_test_data.csv")


def evaluate_xgboost_model():
    """Evaluates the trained XGBoost model using actual dataset files."""
    if not os.path.exists(MODEL_PATH) or not os.path.exists(PREPROCESSOR_PATH):
        print("Error: Model or preprocessor file missing from models/ folder.")
        return

    if not os.path.exists(TEST_CSV_PATH):
        print(f"\nPlease place your actual dataset CSV file at:\n{TEST_CSV_PATH}\nthen run this script again.")
        return

    print(f"Loading dataset from: {TEST_CSV_PATH}")
    df_test = pd.read_csv(TEST_CSV_PATH)

    # Ensure target column exists
    target_col = "risk" if "risk" in df_test.columns else df_test.columns[-1]

    X_test = df_test.drop(columns=[target_col])
    y_test = df_test[target_col]

    # Load trained ML pipeline components
    model = joblib.load(MODEL_PATH)
    preprocessor = joblib.load(PREPROCESSOR_PATH)

    # Preprocess features and run inference
    X_test_processed = preprocessor.transform(X_test)
    raw_preds = model.predict(X_test_processed)

    # Determine class mappings dynamically
    if hasattr(model, "classes_"):
        classes = list(model.classes_)
        y_pred = [classes[int(p)] if isinstance(p, (int, float)) else p for p in raw_preds]
    else:
        # Fallback mapping based on standard sorted class names
        default_map = {0: "Low", 1: "Medium", 2: "High"}
        y_pred = [default_map.get(int(p), str(p)) for p in raw_preds]

    acc = accuracy_score(y_test, y_pred)
    
    print("\n==========================================")
    print(f"  Real Dataset XGBoost Accuracy: {acc * 100:.2f}%")
    print("==========================================")
    print("\nClassification Report:\n")
    print(classification_report(y_test, y_pred))
    print("\nConfusion Matrix:\n")
    print(confusion_matrix(y_test, y_pred))


if __name__ == "__main__":
    evaluate_xgboost_model()