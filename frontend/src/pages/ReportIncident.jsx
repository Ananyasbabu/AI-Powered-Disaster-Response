import { useState } from 'react';
import API from '../api/axios';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export default function ReportIncident() {
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [incidentType, setIncidentType] = useState('Flood');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE) {
      alert('Image size must be less than 5 MB.');
      event.target.value = '';
      return;
    }

    setFile(selectedFile);
    setImagePreview(URL.createObjectURL(selectedFile));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Location is not supported by this browser.');
      return;
    }

    setGettingLocation(true);
    setLocationMessage('Getting your current location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        setLocationMessage('Location added successfully.');
        setGettingLocation(false);
      },
      () => {
        setLocation(null);
        setLocationMessage(
          'Unable to get your location. Please allow location permission and try again.'
        );
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      alert('Please select an incident image to upload.');
      return;
    }

    if (!location) {
      alert('Please click "Use My Current Location" before submitting the report.');
      return;
    }

    setLoading(true);

    const formData = new FormData();

    formData.append('image', file);
    formData.append('type', incidentType);
    formData.append('severity', severity);
    formData.append('description', description.trim());
    formData.append('latitude', location.latitude);
    formData.append('longitude', location.longitude);

    try {
      const response = await API.post('/incidents/report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      const predictedType =
        response.data.verification?.cv?.detected_labels?.[0] || 'Pending';

      alert(
        `Report submitted successfully!\n\n` +
        `Report ID: ${response.data.incident_id}\n` +
        `AI prediction: ${predictedType}\n` +
        `Status: PENDING — waiting for admin approval.`
      );

      setFile(null);
      setImagePreview(null);
      setIncidentType('Flood');
      setSeverity('Medium');
      setDescription('');
      setLocation(null);
      setLocationMessage('');
    } catch (error) {
      console.error('Submission failed:', error);
      alert(error.response?.data?.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto' }}>
      <h2>Report Emergency Incident</h2>
      <p>Share an incident image and your location to help emergency responders.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label>Incident Type:</label>

          <select
            value={incidentType}
            onChange={(event) => setIncidentType(event.target.value)}
            required
          >
            <option value="Flood">Flood / Waterlogging</option>
            <option value="Blocked Road">Blocked Road</option>
            <option value="Structural Damage">Structural Damage</option>
            <option value="Landslide">Landslide</option>
            <option value="Fire">Fire</option>
            <option value="Fallen Tree">Fallen Tree</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label>Severity Level:</label>

          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label>Description:</label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Briefly describe the emergency situation..."
            maxLength={500}
            rows="4"
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label>Upload Image:</label>

          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleImageChange}
            required
          />

          <small>Accepted: JPG, PNG, WEBP. Maximum size: 5 MB.</small>
        </div>

        {imagePreview && (
          <div style={{ marginBottom: '16px' }}>
            <p>Image Preview:</p>

            <img
              src={imagePreview}
              alt="Selected incident"
              style={{
                width: '100%',
                maxHeight: '280px',
                objectFit: 'cover',
                borderRadius: '8px',
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label>Incident Location:</label>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={gettingLocation}
            style={{ display: 'block', marginTop: '8px' }}
          >
            {gettingLocation ? 'Getting Location...' : 'Use My Current Location'}
          </button>

          {locationMessage && (
            <p
              style={{
                color: location ? '#22c55e' : '#f59e0b',
                marginTop: '8px',
              }}
            >
              {locationMessage}
            </p>
          )}
        </div>

        <button type="submit" disabled={loading || gettingLocation}>
          {loading ? 'Submitting Report...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}