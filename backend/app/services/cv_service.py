import os
from ultralytics import YOLO

# Load model weights
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'yolov8n.pt')
cv_model = YOLO(MODEL_PATH)

TARGET_CLASSES = ['flooded_road', 'waterlogging', 'fallen_tree', 'flood', 'fire']

# app/services/cv_service.py
def verify_incident_image(image_path, confidence_threshold=0.25):
    try:
        results = cv_model(image_path, conf=confidence_threshold)
        if not results:
            return {"verified": False, "confidence": 0.0, "detections": []}
        
        result = results[0]
        # Rest of your detection parsing logic...
        detections = []
        if hasattr(result, 'boxes') and result.boxes:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                label = cv_model.names[cls_id]
                detections.append({"label": label, "confidence": conf})

        return {
            "verified": len(detections) > 0,
            "confidence": max([d["confidence"] for d in detections], default=0.0),
            "detections": detections
        }
    except Exception as e:
        # Fallback for non-image / corrupted files
        return {"verified": False, "confidence": 0.0, "detections": [], "error": str(e)}
    """Runs YOLOv8 object detection on uploaded incident images."""
    results = cv_model(image_path, conf=confidence_threshold)[0]
    
    detected_labels = []
    max_confidence = 0.0
    is_verified = False

    for box in results.boxes:
        class_id = int(box.cls[0])
        label = cv_model.names[class_id]
        conf = float(box.conf[0])

        detected_labels.append(label)
        if conf > max_confidence:
            max_confidence = conf

        if label.lower() in TARGET_CLASSES or conf >= 0.50:
            is_verified = True

    return {
        "status": "verified" if is_verified else "rejected",
        "confidence_score": round(max_confidence, 3),
        "detected_labels": detected_labels
    }