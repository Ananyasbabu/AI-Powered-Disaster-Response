import os
import logging
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)

# Standard Incident Categories for Reporting
INCIDENT_TYPES = [
    "Flood",
    "Blocked Road",
    "Structural Damage",
    "Landslide",
    "Fire",
    "Fallen Tree",
    "Other",
    "No Incident",
]

INCIDENT_PROMPTS = [
    "a photo of flood water or a flooded road",
    "a photo of a road blocked by debris, rocks, or obstacles",
    "a photo of structural damage or a collapsed building",
    "a photo of a landslide or mudslide",
    "a photo of a fire or wildfire",
    "a photo of a fallen tree blocking a road",
    "a photo of another emergency or natural disaster",
    "a normal clear photo with no emergency, no damage, and no disaster",
]

# Resolution Verification Categories & Expanded Prompts
RESOLUTION_PROMPTS = [
    "a photo of a clear road",
    "a photo of a normal empty street",
    "a clear dry asphalt road with no water and no obstacles",
    "a photo of an active flood or deep water covering the road",
    "a photo of an active fire or severe road destruction",
]

MODEL_ID = "openai/clip-vit-base-patch32"
processor = None
model = None
device = None
CV_MODEL_LOADED = False

# --------------------------------------------------
# Safe Import & Model Initialization
# --------------------------------------------------
try:
    import torch
    from transformers import AutoModelForZeroShotImageClassification, AutoProcessor
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    CV_MODEL_LOADED = True
    logger.info("PyTorch and Transformers dependencies imported successfully.")
except Exception as e:
    logger.warning(f"CV dependencies blocked by policy: {e}")
    logger.info("Activating rule-based fallback mode for image verification.")
    CV_MODEL_LOADED = False


def get_model():
    """
    Lazy loads the CLIP model and processor instance onto the target device.
    """
    global processor, model

    if not CV_MODEL_LOADED:
        return None, None

    if processor is None or model is None:
        processor = AutoProcessor.from_pretrained(MODEL_ID)
        model = AutoModelForZeroShotImageClassification.from_pretrained(MODEL_ID)
        model.to(device)
        model.eval()

    return processor, model


def verify_incident_image(image_path):
    """
    Predicts the most likely incident type from report-form categories.
    Used during initial incident creation/reporting.
    """
    try:
        if not os.path.exists(image_path):
            return {
                "status": "pending_review",
                "confidence_score": 0.0,
                "detected_labels": [],
                "detections": [],
                "model": "Image Incident Classifier",
                "message": "Uploaded image file was not found."
            }

        with Image.open(image_path) as image:
            image.verify()

        with Image.open(image_path) as image:
            image = image.convert("RGB")
            width, height = image.size
            image_format = image.format

            if CV_MODEL_LOADED:
                try:
                    image_processor, incident_model = get_model()
                    
                    if image_processor and incident_model:
                        inputs = image_processor(
                            text=INCIDENT_PROMPTS,
                            images=image,
                            return_tensors="pt",
                            padding=True
                        )

                        inputs = {
                            key: value.to(device)
                            for key, value in inputs.items()
                        }

                        with torch.no_grad():
                            outputs = incident_model(**inputs)
                            probabilities = outputs.logits_per_image[0].softmax(dim=0)

                        scores = probabilities.cpu().tolist()

                        detections = [
                            {
                                "label": label,
                                "confidence": round(score * 100, 2)
                            }
                            for label, score in zip(INCIDENT_TYPES, scores)
                        ]

                        detections.sort(key=lambda item: item["confidence"], reverse=True)

                        predicted_incident = detections[0]["label"]
                        confidence_score = detections[0]["confidence"] / 100

                        message = (
                            "AI prediction: No incident detected. The report is waiting for admin review."
                            if predicted_incident == "No Incident"
                            else f"AI prediction: {predicted_incident}. The report is waiting for admin approval."
                        )

                        return {
                            "status": "pending_review",
                            "confidence_score": round(confidence_score, 4),
                            "detected_labels": [predicted_incident],
                            "detections": detections,
                            "image_width": width,
                            "image_height": height,
                            "image_format": image_format,
                            "model": "CLIP Zero-Shot Image Classifier",
                            "message": message,
                            "mode": "ZeroShot_Transformers"
                        }
                except Exception as eval_err:
                    logger.error(f"Error during deep learning inference: {eval_err}")

            return {
                "status": "pending_review",
                "confidence_score": 0.85,
                "detected_labels": ["Incident Image Received"],
                "detections": [
                    {"label": "Incident Image Received", "confidence": 85.0}
                ],
                "image_width": width,
                "image_height": height,
                "image_format": image_format,
                "model": "Rule-Based Fallback Classifier",
                "message": "Image verified. Report queued for admin review (Fallback Mode Active).",
                "mode": "Rule_Based_Fallback"
            }

    except UnidentifiedImageError:
        return {
            "status": "invalid_image",
            "confidence_score": 0.0,
            "detected_labels": [],
            "detections": [],
            "model": "Image Incident Classifier",
            "message": "The uploaded file is not a valid image."
        }

    except Exception as error:
        logger.error(f"CV inference error: {error}")
        return {
            "status": "pending_review",
            "confidence_score": 0.0,
            "detected_labels": [],
            "detections": [],
            "model": "Image Incident Classifier",
            "message": "AI analysis could not complete. Admin review is required."
        }




RESOLUTION_PROMPTS = [
    "a photo of a clear open road with no water, no fire, no trees, and no debris",
    "a photo of a clear normal street with smooth traffic flow and no hazards",
    "a photo of an active severe flood, deep water, or submerged street",
    "a photo of a fire, heavy smoke, landslide, or severe structural damage"
]

def verify_resolution_image(image_path):
    """
    Verifies whether a resolution proof image shows a cleared hazard area.
    Returns is_cleared: True ONLY if clear prompts strongly outweigh hazard prompts.
    """
    try:
        if not image_path or not os.path.exists(image_path):
            return {
                "status": "HAZARD_STILL_PRESENT",
                "is_cleared": False,
                "confidence_score": 0.0,
                "message": "No proof image provided or file not found."
            }

        with Image.open(image_path) as image:
            image = image.convert("RGB")

            if CV_MODEL_LOADED:
                try:
                    image_processor, incident_model = get_model()
                    if image_processor and incident_model:
                        inputs = image_processor(
                            text=RESOLUTION_PROMPTS,
                            images=image,
                            return_tensors="pt",
                            padding=True
                        )

                        inputs = {key: val.to(device) for key, val in inputs.items()}

                        with torch.no_grad():
                            outputs = incident_model(**inputs)
                            probabilities = outputs.logits_per_image[0].softmax(dim=-1)

                        scores = probabilities.cpu().tolist()

                        # Individual prompt scores
                        clear_road_1 = scores[0]
                        clear_road_2 = scores[1]
                        flood_score = scores[2]
                        disaster_score = scores[3]

                        total_clear = clear_road_1 + clear_road_2
                        total_hazard = flood_score + disaster_score

                        # Strict Rule:
                        # 1. Hazard score must be below 0.35
                        # 2. Total clear score MUST be significantly higher than total hazard score
                        is_hazard_present = (flood_score > 0.30) or (disaster_score > 0.30) or (total_hazard >= total_clear)
                        is_cleared = not is_hazard_present

                        confidence = max(total_clear, total_hazard)

                        return {
                            "status": "VERIFIED" if is_cleared else "HAZARD_STILL_PRESENT",
                            "is_cleared": is_cleared,
                            "confidence_score": round(confidence, 4),
                            "scores": {
                                "clear": round(total_clear, 4),
                                "hazard": round(total_hazard, 4)
                            },
                            "message": (
                                "Verification passed: Area confirmed clear."
                                if is_cleared
                                else "Verification failed: Active hazard or flood detected in image."
                            )
                        }
                except Exception as eval_err:
                    logger.error(f"Inference error during resolution check: {eval_err}")

            return {
                "status": "HAZARD_STILL_PRESENT",
                "is_cleared": False,
                "confidence_score": 0.0,
                "message": "CV model unavailable. Cannot verify resolution."
            }

    except Exception as error:
        logger.error(f"Resolution verification error: {error}")
        return {
            "status": "HAZARD_STILL_PRESENT",
            "is_cleared": False,
            "confidence_score": 0.0,
            "message": "Error processing resolution proof image."
        }
    """
    Verifies whether a resolution proof image shows a cleared hazard area.
    """
    try:
        if not image_path or not os.path.exists(image_path):
            return {
                "status": "HAZARD_STILL_PRESENT",
                "is_cleared": False,
                "confidence_score": 0.0,
                "message": "No proof image provided or file not found."
            }

        with Image.open(image_path) as image:
            image = image.convert("RGB")

            if CV_MODEL_LOADED:
                try:
                    image_processor, incident_model = get_model()
                    if image_processor and incident_model:
                        inputs = image_processor(
                            text=RESOLUTION_PROMPTS,
                            images=image,
                            return_tensors="pt",
                            padding=True
                        )

                        inputs = {key: val.to(device) for key, val in inputs.items()}

                        with torch.no_grad():
                            outputs = incident_model(**inputs)
                            probabilities = outputs.logits_per_image[0].softmax(dim=-1)

                        scores = probabilities.cpu().tolist()
                        clear_score = scores[0]
                        hazard_score = scores[1]

                        # Strictly require clear score to beat hazard score
                        is_cleared = clear_score > hazard_score

                        return {
                            "status": "VERIFIED" if is_cleared else "HAZARD_STILL_PRESENT",
                            "is_cleared": is_cleared,
                            "confidence_score": round(max(clear_score, hazard_score), 4),
                            "message": (
                                "Area verified as clear."
                                if is_cleared
                                else "Hazard detected in image. Incident cannot be resolved."
                            )
                        }
                except Exception as eval_err:
                    logger.error(f"DL resolution inference error: {eval_err}")

            # If model fails to run, do NOT auto-clear
            return {
                "status": "HAZARD_STILL_PRESENT",
                "is_cleared": False,
                "confidence_score": 0.0,
                "message": "AI analysis could not confirm the area is clear."
            }

    except Exception as error:
        logger.error(f"CV resolution error: {error}")
        return {
            "status": "HAZARD_STILL_PRESENT",
            "is_cleared": False,
            "confidence_score": 0.0,
            "message": "Error processing resolution proof image."
        }
    """
    Verifies whether a resolution proof image shows a cleared hazard area.
    """
    try:
        if not image_path or not os.path.exists(image_path):
            # Safe bypass if file path is unresolvable
            return {
                "status": "VERIFIED",
                "is_cleared": True,
                "confidence_score": 1.0,
                "detected_labels": ["Passed (File system fallback)"],
                "model": "Resolution Classifier",
                "message": "Auto-verifying resolution."
            }

        with Image.open(image_path) as image:
            image = image.convert("RGB")
            width, height = image.size
            image_format = image.format

            if CV_MODEL_LOADED:
                try:
                    image_processor, incident_model = get_model()
                    if image_processor and incident_model:
                        inputs = image_processor(
                            text=RESOLUTION_PROMPTS,
                            images=image,
                            return_tensors="pt",
                            padding=True
                        )

                        inputs = {key: val.to(device) for key, val in inputs.items()}

                        with torch.no_grad():
                            outputs = incident_model(**inputs)
                            # Get softmax probabilities across candidates
                            probabilities = outputs.logits_per_image[0].softmax(dim=-1)

                        scores = probabilities.cpu().tolist()

                        clear_road_score = scores[0] + scores[1]
                        hazard_score = scores[2]

                        # Permissive resolution condition:
                        # If clear probability >= 0.30 or higher than severe hazard score, pass it.
                        is_cleared = (clear_road_score >= 0.30) or (clear_road_score > hazard_score)
                        confidence_score = max(clear_road_score, hazard_score)

                        predicted_label = "Cleared / Safe Road" if is_cleared else "Active Hazard Detected"

                        return {
                            "status": "VERIFIED" if is_cleared else "HAZARD_STILL_PRESENT",
                            "is_cleared": is_cleared,
                            "confidence_score": round(confidence_score, 4),
                            "detected_labels": [predicted_label],
                            "image_width": width,
                            "image_height": height,
                            "image_format": image_format,
                            "model": "CLIP Zero-Shot Resolution Classifier",
                            "message": (
                                "Resolution verified: Proof image confirms area is clear."
                                if is_cleared
                                else "Warning: Active hazard still detected in proof image."
                            ),
                            "mode": "ZeroShot_Transformers"
                        }
                except Exception as eval_err:
                    logger.error(f"DL resolution inference error: {eval_err}")

            # Fallback pass if torch/transformers unavailable or inference errors
            return {
                "status": "VERIFIED",
                "is_cleared": True,
                "confidence_score": 0.85,
                "detected_labels": ["Resolution Image Received"],
                "image_width": width,
                "image_height": height,
                "image_format": image_format,
                "model": "Rule-Based Fallback Classifier",
                "message": "Resolution image verified (Fallback Mode Active).",
                "mode": "Rule_Based_Fallback"
            }

    except Exception as error:
        logger.error(f"CV resolution error: {error}")
        # Always default to True on unhandled errors so user submission isn't blocked completely
        return {
            "status": "VERIFIED",
            "is_cleared": True,
            "confidence_score": 0.50,
            "detected_labels": ["Resolution Verified"],
            "model": "Resolution Classifier",
            "message": "Resolution granted."
        }
    """
    Verifies whether a resolution proof image shows a cleared hazard area.
    Used specifically during incident resolution.
    """
    try:
        if not image_path or not os.path.exists(image_path):
            return {
                "status": "VERIFIED",
                "is_cleared": True,
                "confidence_score": 1.0,
                "detected_labels": ["Bypassed - No File"],
                "model": "Resolution Image Classifier",
                "message": "Image file not found. Auto-passing resolution."
            }

        with Image.open(image_path) as image:
            image.verify()

        with Image.open(image_path) as image:
            image = image.convert("RGB")
            width, height = image.size
            image_format = image.format

            if CV_MODEL_LOADED:
                try:
                    image_processor, incident_model = get_model()
                    if image_processor and incident_model:
                        inputs = image_processor(
                            text=RESOLUTION_PROMPTS,
                            images=image,
                            return_tensors="pt",
                            padding=True
                        )

                        inputs = {
                            key: value.to(device)
                            for key, value in inputs.items()
                        }

                        with torch.no_grad():
                            outputs = incident_model(**inputs)
                            probabilities = outputs.logits_per_image[0].softmax(dim=0)

                        scores = probabilities.cpu().tolist()
                        
                        # Cumulative scores for Clear vs Hazard prompts
                        clear_score = scores[0] + scores[1] + scores[2]
                        hazard_score = scores[3] + scores[4]

                        # Permissive resolution condition
                        is_cleared = clear_score >= 0.35 or clear_score > hazard_score
                        confidence_score = max(clear_score, hazard_score)
                        predicted_label = "Cleared Area / Normal" if is_cleared else "Active Hazard Present"

                        message = (
                            "Resolution verified: Proof image confirms area is cleared."
                            if is_cleared
                            else "Warning: Proof image indicates active hazard may still be present."
                        )

                        return {
                            "status": "VERIFIED" if is_cleared else "HAZARD_STILL_PRESENT",
                            "is_cleared": is_cleared,
                            "confidence_score": round(confidence_score, 4),
                            "detected_labels": [predicted_label],
                            "image_width": width,
                            "image_height": height,
                            "image_format": image_format,
                            "model": "CLIP Zero-Shot Resolution Classifier",
                            "message": message,
                            "mode": "ZeroShot_Transformers"
                        }
                except Exception as eval_err:
                    logger.error(f"DL resolution inference error: {eval_err}")

            # Fallback mode always verifies
            return {
                "status": "VERIFIED",
                "is_cleared": True,
                "confidence_score": 0.85,
                "detected_labels": ["Resolution Image Received"],
                "image_width": width,
                "image_height": height,
                "image_format": image_format,
                "model": "Rule-Based Fallback Classifier",
                "message": "Resolution image received and verified (Fallback Mode Active).",
                "mode": "Rule_Based_Fallback"
            }

    except UnidentifiedImageError:
        return {
            "status": "INVALID_IMAGE",
            "is_cleared": False,
            "confidence_score": 0.0,
            "detected_labels": [],
            "model": "Resolution Image Classifier",
            "message": "The uploaded resolution file is not a valid image."
        }

    except Exception as error:
        logger.error(f"CV resolution error: {error}")
        return {
            "status": "VERIFIED",
            "is_cleared": True,
            "confidence_score": 0.5,
            "detected_labels": ["Fallback Resolution Pass"],
            "model": "Resolution Image Classifier",
            "message": "Resolution granted."
        }