import os

import torch
from PIL import Image, UnidentifiedImageError
from transformers import AutoModelForZeroShotImageClassification, AutoProcessor


MODEL_ID = "openai/clip-vit-base-patch32"

# These match the incident types in your report form.
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
    "a normal photo with no emergency, no damage, and no disaster",
]

processor = None
model = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def get_model():
    global processor, model

    if processor is None or model is None:
        processor = AutoProcessor.from_pretrained(MODEL_ID)
        model = AutoModelForZeroShotImageClassification.from_pretrained(MODEL_ID)
        model.to(device)
        model.eval()

    return processor, model


def verify_incident_image(image_path):
    """
    Predicts the most likely incident type from all report-form categories.

    Important:
    This is an AI prediction only. Every report remains PENDING
    until the admin approves or rejects it.
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

        # Confirm that the uploaded file is a real image.
        with Image.open(image_path) as image:
            image.verify()

        # Open again because image.verify() closes the image.
        with Image.open(image_path) as image:
            image = image.convert("RGB")
            width, height = image.size
            image_format = image.format

            image_processor, incident_model = get_model()

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

        if predicted_incident == "No Incident":
            message = (
                "AI prediction: No incident detected. "
                "The report is waiting for admin review."
            )
        else:
            message = (
                f"AI prediction: {predicted_incident}. "
                "The report is waiting for admin approval."
            )

        return {
            "status": "pending_review",
            "confidence_score": round(confidence_score, 4),
            "detected_labels": [predicted_incident],
            "detections": detections,
            "image_width": width,
            "image_height": height,
            "image_format": image_format,
            "model": "Image Incident Classifier",
            "message": message
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
        print(f"CV inference error: {error}")

        return {
            "status": "pending_review",
            "confidence_score": 0.0,
            "detected_labels": [],
            "detections": [],
            "model": "Image Incident Classifier",
            "message": "AI analysis could not complete. Admin review is required."
        }