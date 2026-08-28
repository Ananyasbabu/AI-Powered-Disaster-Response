import { useState } from 'react';
import API from '../api/axios';

export default function ReportIncident() {
  const [file, setFile] = useState(null);
  const [incidentType, setIncidentType] = useState('Flood');
  const [lat, setLat] = useState('12.9716');
  const [lng, setLng] = useState('77.5946');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select an incident image to upload.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('latitude', lat);
    formData.append('longitude', lng);
    formData.append('type', incidentType); // Matches backend request.form.get('type')

    try {
      const res = await API.post('/incidents/report', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, 
      });
      alert(`Report submitted! Status: ${res.data.verification.status}`);
    } catch (err) {
      console.error('Submission failed:', err);
      alert(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '20px auto' }}>
      <h2>Report Emergency Incident</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Incident Type:</label>
          <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
            <option value="Flood">Flood</option>
            <option value="Blocked Road">Blocked Road</option>
            <option value="Structural Damage">Structural Damage</option>
          </select>
        </div>
        <br />
        <div>
          <label>Upload Image:</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required />
        </div>
        <br />
        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing with CV...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}