import os
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from app.models import Shelter  # Imports MongoEngine Shelter model

shelter_bp = Blueprint('shelter_bp', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@shelter_bp.route('/shelters/report', methods=['POST'])
def report_shelter():
    """Report/Add a new shelter place."""
    try:
        # Extract form text parameters
        name = request.form.get('name')
        lat = request.form.get('lat') or request.form.get('latitude')
        lng = request.form.get('lng') or request.form.get('lon') or request.form.get('longitude')
        location_name = request.form.get('address') or request.form.get('location_name', '')
        facilities = request.form.get('facilities', 'Water, Emergency Shelter, Power')

        # Validate required fields
        if not name or lat is None or lng is None:
            return jsonify({'message': 'Shelter name, latitude, and longitude are required.'}), 400

        try:
            latitude = float(lat)
            longitude = float(lng)
            total_beds = int(request.form.get('total_beds', 100))
            available_beds = int(request.form.get('available_beds', 100))
        except ValueError:
            return jsonify({'message': 'Latitude, Longitude, and Bed counts must be valid numbers.'}), 400

        # Handle file upload if image is provided
        image_url = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '' and allowed_file(file.filename):
                original_filename = secure_filename(file.filename)
                filename = f"shelter_{uuid.uuid4().hex}_{original_filename}"
                upload_folder = current_app.config.get('UPLOAD_FOLDER', os.path.join(current_app.root_path, '..', 'uploads'))
                os.makedirs(upload_folder, exist_ok=True)
                
                save_path = os.path.join(upload_folder, filename)
                file.save(save_path)
                image_url = f"/uploads/{filename}"

        # Explicitly pass created_at timestamp during document instantiation
        created_timestamp = datetime.now(timezone.utc)
        new_shelter = Shelter(
            name=name.strip(),
            location_name=location_name.strip(),
            latitude=latitude,
            longitude=longitude,
            location={
                "type": "Point",
                "coordinates": [longitude, latitude]
            },
            total_beds=total_beds,
            available_beds=available_beds,
            facilities=facilities.strip(),
            image_url=image_url,
            created_by_role='user',
            created_at=created_timestamp
        )
        new_shelter.save()

        # Format dictionary payload with ISO string for the timestamp
        res_data = new_shelter.to_dict() if hasattr(new_shelter, 'to_dict') else {}
        res_data['created_at'] = created_timestamp.isoformat()

        return jsonify({
            'status': 'success',
            'message': 'Shelter registered successfully',
            'data': res_data
        }), 201

    except Exception as e:
        print(f"Error in /shelters/report: {e}")
        return jsonify({'message': f'Failed to process shelter report: {str(e)}'}), 500


@shelter_bp.route('/shelters', methods=['GET'])
def get_shelters():
    """Fetch all reported shelters with formatted ISO creation timestamps."""
    try:
        shelters = Shelter.objects()
        results = []
        for shelter in shelters:
            data = shelter.to_dict() if hasattr(shelter, 'to_dict') else {}
            
            # Format explicit created_at or fallback to Mongo ObjectId timestamp
            if hasattr(shelter, 'created_at') and shelter.created_at:
                data['created_at'] = shelter.created_at.isoformat()
            elif hasattr(shelter, 'id') and hasattr(shelter.id, 'generation_time'):
                data['created_at'] = shelter.id.generation_time.isoformat()
            else:
                data['created_at'] = None

            results.append(data)

        return jsonify(results), 200
    except Exception as e:
        print(f"MongoDB query error when fetching shelters: {e}")
        return jsonify({'message': str(e)}), 500


@shelter_bp.route('/shelters/<shelter_id>', methods=['GET'])
def get_shelter_by_id(shelter_id):
    """Fetch a single shelter by ID."""
    try:
        shelter = Shelter.objects.get(id=shelter_id)
        data = shelter.to_dict() if hasattr(shelter, 'to_dict') else {}
        
        if hasattr(shelter, 'created_at') and shelter.created_at:
            data['created_at'] = shelter.created_at.isoformat()
        elif hasattr(shelter, 'id') and hasattr(shelter.id, 'generation_time'):
            data['created_at'] = shelter.id.generation_time.isoformat()
            
        return jsonify(data), 200
    except Shelter.DoesNotExist:
        return jsonify({'message': 'Shelter not found.'}), 404
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@shelter_bp.route('/shelters/<shelter_id>/risk', methods=['PATCH', 'PUT'])
def update_shelter_risk(shelter_id):
    """Update risk level and status of a shelter."""
    try:
        data = request.get_json() or {}
        shelter = Shelter.objects.get(id=shelter_id)

        if 'risk_level' in data:
            shelter.risk_level = data['risk_level']
        if 'status' in data:
            shelter.status = data['status']
        if 'available_beds' in data:
            shelter.available_beds = int(data['available_beds'])

        shelter.save()
        
        res_data = shelter.to_dict() if hasattr(shelter, 'to_dict') else {}
        if hasattr(shelter, 'created_at') and shelter.created_at:
            res_data['created_at'] = shelter.created_at.isoformat()

        return jsonify({'status': 'success', 'data': res_data}), 200
    except Shelter.DoesNotExist:
        return jsonify({'message': 'Shelter not found.'}), 404
    except Exception as e:
        return jsonify({'message': str(e)}), 500


@shelter_bp.route('/shelters/<shelter_id>', methods=['DELETE'])
def delete_shelter(shelter_id):
    """Delete a shelter by ID."""
    try:
        shelter = Shelter.objects.get(id=shelter_id)
        shelter.delete()
        return jsonify({'status': 'success', 'message': 'Shelter deleted successfully.'}), 200
    except Shelter.DoesNotExist:
        return jsonify({'message': 'Shelter not found.'}), 404
    except Exception as e:
        return jsonify({'message': str(e)}), 500