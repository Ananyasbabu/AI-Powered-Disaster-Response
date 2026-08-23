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
        
        if not results or len(results) == 0:
            return {
                "status": "pending_review",
                "confidence_score": 0.0,
                "detected_labels": []
            }
        
        result = results[0]
        detected_labels = []
        confidences = []
        
        if hasattr(result, 'boxes') and result.boxes:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                label = cv_model.names[cls_id]
                detected_labels.append(label)
                confidences.append(conf)

        is_verified = len(detected_labels) > 0
        max_conf = max(confidences) if confidences else 0.0

        return {
            "status": "verified" if is_verified else "pending_review",
            "confidence_score": max_conf,
            "detected_labels": detected_labels
        }
    except Exception as e:
        return {
            "status": "pending_review",
            "confidence_score": 0.0,
            "detected_labels": [],
            "error": str(e)
        }
    try:
        results = cv_model(image_path, conf=confidence_threshold)
        
        if not results or len(results) == 0:
            return {
                "status": "UNVERIFIED",
                "verified": False,
                "confidence": 0.0,
                "detections": []
            }
        
        result = results[0]
        detections = []
        
        if hasattr(result, 'boxes') and result.boxes:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                label = cv_model.names[cls_id]
                detections.append({"label": label, "confidence": conf})

        is_verified = len(detections) > 0
        return {
            "status": "VERIFIED" if is_verified else "PENDING",
            "verified": is_verified,
            "confidence": max([d["confidence"] for d in detections], default=0.0),
            "detections": detections
        }
    except Exception as e:
        return {
            "status": "PENDING",
            "verified": False,
            "confidence": 0.0,
            "detections": [],
            "error": str(e)
        }
    try:
        results = cv_model(image_path, conf=confidence_threshold)
        
        if not results or len(results) == 0:
            return {"verified": False, "confidence": 0.0, "detections": []}
        
        result = results[0]
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
        return {"verified": False, "confidence": 0.0, "detections": [], "error": str(e)}
    try:
        results = cv_model(image_path, conf=confidence_threshold)
        
        # Guard against empty prediction results
        if not results or len(results) == 0:
            return {"verified": False, "confidence": 0.0, "detections": []}
        
        result = results[0]
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
        return {"verified": False, "confidence": 0.0, "detections": [], "error": str(e)}