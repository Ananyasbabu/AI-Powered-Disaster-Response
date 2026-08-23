import React, { useState, useEffect } from 'react';
import API from '../api/axios'; // Centralized Axios instance with base URL http://127.0.0.1:5000/api

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ total_incidents: 0, pending_incidents: 0, verified_incidents: 0, total_shelters: 0 });
  const [incidents, setIncidents] = useState([]);
  const [shelters, setShelters] = useState([]);
  
  // New Shelter Form State
  const [newShelter, setNewShelter] = useState({ name: '', lat: '', lng: '', total_capacity: '', contact: '' });
  
  // Emergency Alert Form State
  const [alertForm, setAlertForm] = useState({ region: '', severity: 'CRITICAL', message: '' });

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchIncidents();
      fetchShelters();
    }
  }, [isAuthenticated]);

  const handleVerify = (e) => {
    e.preventDefault();
    if (passcode === 'admin123') { // Admin passcode check
      setIsAuthenticated(true);
    } else {
      alert('Invalid Passcode!');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await API.get('/admin/stats');
      setStats(res.data);
    } catch (err) { console.error('Error fetching stats:', err); }
  };

  const fetchIncidents = async () => {
    try {
      const res = await API.get('/admin/incidents');
      setIncidents(res.data);
    } catch (err) { console.error('Error fetching incidents:', err); }
  };

  const fetchShelters = async () => {
    try {
      const res = await API.get('/admin/shelters');
      setShelters(res.data);
    } catch (err) { console.error('Error fetching shelters:', err); }
  };

  const handleVerifyIncident = async (id, status) => {
    try {
      await API.patch(`/admin/incidents/${id}/verify`, { status });
      fetchIncidents();
      fetchStats();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleAddShelter = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/shelters', {
        ...newShelter,
        lat: parseFloat(newShelter.lat),
        lng: parseFloat(newShelter.lng),
        total_capacity: parseInt(newShelter.total_capacity)
      });
      setNewShelter({ name: '', lat: '', lng: '', total_capacity: '', contact: '' });
      fetchShelters();
      fetchStats();
    } catch (err) {
      console.error('Error adding shelter:', err);
    }
  };

  const handleSendAlert = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/alerts/broadcast', alertForm);
      alert('Emergency alert broadcasted!');
      setAlertForm({ region: '', severity: 'CRITICAL', message: '' });
    } catch (err) {
      console.error('Error broadcasting alert:', err);
    }
  };

  // Passcode Lock View
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '30px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' }}>
        <h2>🔒 Admin Access</h2>
        <p>Please enter the admin passcode to view the control panel.</p>
        <form onSubmit={handleVerify}>
          <input
            type="password"
            placeholder="Enter passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            style={{ width: '100%', padding: '10px', margin: '15px 0', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Verify Access
          </button>
        </form>
      </div>
    );
  }

  // Full Admin Dashboard View
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🚨 Admin Control Tower</h2>
      
      {/* Navigation Tabs */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button onClick={() => setActiveTab('incidents')}>Verify Incidents</button>
        <button onClick={() => setActiveTab('shelters')}>Manage Shelters</button>
        <button onClick={() => setActiveTab('alerts')}>Emergency Broadcast</button>
      </div>

      <hr />

      {/* Tab 1: Stats Overview */}
      {activeTab === 'dashboard' && (
        <div>
          <h3>Overview Stats</h3>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={cardStyle}><h4>Total Incidents</h4><p>{stats.total_incidents}</p></div>
            <div style={cardStyle}><h4>Pending Verification</h4><p>{stats.pending_incidents}</p></div>
            <div style={cardStyle}><h4>Verified Incidents</h4><p>{stats.verified_incidents}</p></div>
            <div style={cardStyle}><h4>Active Shelters</h4><p>{stats.total_shelters}</p></div>
          </div>
        </div>
      )}

      {/* Tab 2: Incident Verification */}
      {activeTab === 'incidents' && (
        <div>
          <h3>Incident Verification & AI Image Checks</h3>
          <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Image</th>
                <th>Location (Lat, Lng)</th>
                <th>AI Detection</th>
                <th>AI Confidence Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => {
                // Parse coordinates from GeoJSON [lng, lat] format
                const coords = inc.location?.coordinates || [];
                const lat = coords[1] !== undefined ? coords[1] : inc.location?.lat || 'N/A';
                const lng = coords[0] !== undefined ? coords[0] : inc.location?.lng || 'N/A';
                const imgUrl = inc.image_url ? `http://127.0.0.1:5000/${inc.image_url}` : null;

                return (
                  <tr key={inc._id}>
                    <td>
                      {imgUrl ? (
                        <img src={imgUrl} alt="Incident" width="80" height="60" style={{ objectFit: 'cover' }} />
                      ) : 'No Image'}
                    </td>
                    <td>{lat}, {lng}</td>
                    <td>{inc.cv_verification?.detected_labels?.join(', ') || inc.cv_verification?.detected_disaster || 'N/A'}</td>
                    <td>
                      <strong>
                        {inc.cv_verification?.confidence_score !== undefined 
                          ? `${(inc.cv_verification.confidence_score * 100).toFixed(1)}%` 
                          : 'N/A'}
                      </strong>
                    </td>
                    <td>{inc.status}</td>
                    <td>
                      {(inc.status === 'PENDING' || inc.status === 'pending_review') && (
                        <>
                          <button onClick={() => handleVerifyIncident(inc._id, 'VERIFIED')} style={{ backgroundColor: 'green', color: 'white', marginRight: '5px', padding: '5px 10px', cursor: 'pointer' }}>Approve</button>
                          <button onClick={() => handleVerifyIncident(inc._id, 'REJECTED')} style={{ backgroundColor: 'red', color: 'white', padding: '5px 10px', cursor: 'pointer' }}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Shelter Management */}
      {activeTab === 'shelters' && (
        <div>
          <h3>Add & Manage Shelters</h3>
          <form onSubmit={handleAddShelter} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            <input placeholder="Shelter Name" value={newShelter.name} onChange={e => setNewShelter({...newShelter, name: e.target.value})} required />
            <input placeholder="Latitude" value={newShelter.lat} onChange={e => setNewShelter({...newShelter, lat: e.target.value})} required />
            <input placeholder="Longitude" value={newShelter.lng} onChange={e => setNewShelter({...newShelter, lng: e.target.value})} required />
            <input placeholder="Total Capacity" type="number" value={newShelter.total_capacity} onChange={e => setNewShelter({...newShelter, total_capacity: e.target.value})} required />
            <button type="submit">Add Shelter</button>
          </form>

          <ul>
            {shelters.map((s) => (
              <li key={s._id} style={{ marginBottom: '10px' }}>
                <strong>{s.name}</strong> - Lat: {s.location?.lat}, Lng: {s.location?.lng} | Capacity: {s.total_capacity} beds
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab 4: Emergency Alert Broadcast */}
      {activeTab === 'alerts' && (
        <div>
          <h3>Broadcast Emergency Alert</h3>
          <form onSubmit={handleSendAlert} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
            <input placeholder="Target Region (e.g., Mysuru)" value={alertForm.region} onChange={e => setAlertForm({...alertForm, region: e.target.value})} required />
            <select value={alertForm.severity} onChange={e => setAlertForm({...alertForm, severity: e.target.value})}>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High Risk</option>
              <option value="MODERATE">Moderate Risk</option>
            </select>
            <textarea placeholder="Alert Message for Citizens" value={alertForm.message} onChange={e => setAlertForm({...alertForm, message: e.target.value})} required />
            <button type="submit" style={{ backgroundColor: 'red', color: 'white', padding: '10px', cursor: 'pointer' }}>Broadcast Alert</button>
          </form>
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  border: '1px solid #ccc',
  padding: '15px',
  borderRadius: '8px',
  width: '180px',
  textAlign: 'center'
};