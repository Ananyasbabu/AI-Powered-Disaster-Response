import { useState } from 'react';
import API from '../api/axios';

export default function ReportIncident() {
  const [file, setFile] = useState(null);
  const [lat, setLat] = useState('12.9716');
  const [lng, setLng] = useState('77.5946');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    if (file) formData.append('image', file);
    formData.append('latitude', lat);
    formData.append('longitude', lng);
    formData.append('title', 'Emergency Incident');
    formData.append('category', 'flood');

    try {
      // Connects to Flask incident report endpoint with YOLOv8 processing
      const res = await API.post('/incidents/report', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Report submitted successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button type="submit">Submit Report</button>
    </form>
  );
}