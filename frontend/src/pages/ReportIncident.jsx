import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function ReportIncident() {
  const [file, setFile] = useState(null);
  const [incidentType, setIncidentType] = useState('Flood');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');
  const [reporterId, setReporterId] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fetch browser GPS coordinates on load
  const getLocation = () => {
    if (navigator.geolocation) {
      setLocationStatus('Fetching live GPS coordinates...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toFixed(6));
          setLng(position.coords.longitude.toFixed(6));
          setLocationStatus('GPS Location captured!');
        },
        (error) => {
          console.error('Location fetch failed:', error);
          setLocationStatus('Unable to retrieve automatic location. Please enter manually.');
        }
      );
    } else {
      setLocationStatus('Geolocation is not supported by your browser.');
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select an incident image to upload.');
      return;
    }
    if (!lat || !lng) {
      alert('Location coordinates (Latitude & Longitude) are required.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('latitude', lat);
    formData.append('longitude', lng);
    formData.append('type', incidentType);
    formData.append('severity', severity);
    formData.append('description', description);
    formData.append('reporter_id', reporterId || 'anonymous');

    try {
      const res = await API.post('/incidents/report', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, 
      });

      const { verification } = res.data;
      const weatherVerified = verification?.weather?.verified ? 'Verified' : 'Flagged';
      
      alert(
        `Report Submitted Successfully!\n\n` +
        `Overall Status: ${verification?.overall_status || 'Submitted'}\n` +
        `CV Verification: ${verification?.cv?.status || 'N/A'}\n` +
        `Weather Verification: ${weatherVerified}`
      );

      // Reset optional form fields
      setFile(null);
      setDescription('');
    } catch (err) {
      console.error('Submission failed:', err);
      alert(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '450px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Report Emergency Incident</h2>
      <form onSubmit={handleSubmit}>
        
        {/* Reporter Info */}
        <div style={{ marginBottom: '12px' }}>
          <label><strong>Contact / Reporter ID:</strong></label>
          <input 
            type="text" 
            placeholder="Enter your name or phone number" 
            value={reporterId} 
            onChange={(e) => setReporterId(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>

        {/* Incident Type */}
        <div style={{ marginBottom: '12px' }}>
          <label><strong>Incident Type:</strong></label>
          <select 
            value={incidentType} 
            onChange={(e) => setIncidentType(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          >
            <option value="Flood">Flood / Waterlogging</option>
            <option value="Storm">Storm / Severe Weather</option>
            <option value="Blocked Road">Blocked Road</option>
            <option value="Structural Damage">Structural Damage / Landslide</option>
            <option value="Fire">Fire / Explosion</option>
          </select>
        </div>

        {/* Severity */}
        <div style={{ marginBottom: '12px' }}>
          <label><strong>Severity Level:</strong></label>
          <select 
            value={severity} 
            onChange={(e) => setSeverity(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          >
            <option value="Low">Low (Minor Hazard)</option>
            <option value="Medium">Medium (Property Damage / Obstruction)</option>
            <option value="High">High (Life Threatening Emergency)</option>
          </select>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '12px' }}>
          <label><strong>Description:</strong></label>
          <textarea 
            placeholder="Describe what is happening at the scene..." 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            required
          />
        </div>

        {/* Location Coordinates */}
        <div style={{ marginBottom: '12px' }}>
          <label><strong>Location Coordinates:</strong></label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input 
              type="text" 
              placeholder="Latitude" 
              value={lat} 
              onChange={(e) => setLat(e.target.value)}
              style={{ width: '50%', padding: '8px' }}
              required
            />
            <input 
              type="text" 
              placeholder="Longitude" 
              value={lng} 
              onChange={(e) => setLng(e.target.value)}
              style={{ width: '50%', padding: '8px' }}
              required
            />
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{locationStatus}</p>
          <button type="button" onClick={getLocation} style={{ fontSize: '12px', padding: '4px 8px' }}>
            Refresh GPS Coordinates
          </button>
        </div>

        {/* Image Upload */}
        <div style={{ marginBottom: '16px' }}>
          <label><strong>Upload Incident Image:</strong></label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setFile(e.target.files[0])} 
            style={{ marginTop: '4px', display: 'block' }}
            required 
          />
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '10px', 
            backgroundColor: loading ? '#ccc' : '#d9534f', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Validating with AI & Live Weather...' : 'Submit Incident Report'}
        </button>
      </form>
    </div>
  );
}