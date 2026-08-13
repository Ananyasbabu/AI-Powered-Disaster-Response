import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000/api/admin';
const ADMIN_GATE_PASSCODE = 'admin123';

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ total_incidents: 0, pending_incidents: 0, verified_incidents: 0, total_shelters: 0 });
  const [incidents, setIncidents] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [passcode, setPasscode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  
  // New Shelter Form State
  const [newShelter, setNewShelter] = useState({ name: '', lat: '', lng: '', total_capacity: '', contact: '' });
  
  // Emergency Alert Form State
  const [alertForm, setAlertForm] = useState({ region: '', severity: 'CRITICAL', message: '' });

  useEffect(() => {
    if (!isVerified) return;
    fetchStats();
    fetchIncidents();
    fetchShelters();
  }, [isVerified]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) { console.error(err); }
  };

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_BASE}/incidents`);
      const data = await res.json();
      setIncidents(data);
    } catch (err) { console.error(err); }
  };

  const fetchShelters = async () => {
    try {
      const res = await fetch(`${API_BASE}/shelters`);
      const data = await res.json();
      setShelters(data);
    } catch (err) { console.error(err); }
  };

  const handleVerifyIncident = async (id, status) => {
    await fetch(`${API_BASE}/incidents/${id}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchIncidents();
    fetchStats();
  };

  const handleAddShelter = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/shelters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newShelter)
    });
    setNewShelter({ name: '', lat: '', lng: '', total_capacity: '', contact: '' });
    fetchShelters();
    fetchStats();
  };

  const handleSendAlert = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE}/alerts/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertForm)
    });
    alert('Emergency alert broadcasted!');
    setAlertForm({ region: '', severity: 'CRITICAL', message: '' });
  };

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (passcode === ADMIN_GATE_PASSCODE) {
      setIsVerified(true);
      setVerificationError('');
    } else {
      setVerificationError('Invalid admin passcode. Please try again.');
    }
  };

  if (!isVerified) {
    return (
      <div style={{ maxWidth: '420px', margin: '80px auto', padding: '32px', textAlign: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.12)', borderRadius: '10px', backgroundColor: '#ffffff' }}>
        <h2>🔒 Admin Verification</h2>
        <p>Enter the admin passcode to unlock the control tower.</p>
        {verificationError && <div style={{ margin: '16px 0', color: '#b00020' }}>{verificationError}</div>}
        <form onSubmit={handlePasscodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Admin passcode"
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}
            required
          />
          <button type="submit" style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Unlock Admin Dashboard
          </button>
        </form>
      </div>
    );
  }

  // Full Admin Dashboard View
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🚨 Admin Control Tower</h2>
      <p style={{ marginTop: '8px', color: '#333' }}>Welcome back, {user?.name || 'Admin'}.</p>
      
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
                <th>Location</th>
                <th>AI Detection</th>
                <th>AI Confidence Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc._id}>
                  <td>
                    {inc.image_url ? (
                      <img src={inc.image_url} alt="Incident" width="80" height="60" />
                    ) : 'No Image'}
                  </td>
                  <td>{inc.location?.lat}, {inc.location?.lng}</td>
                  <td>{inc.cv_verification?.detected_disaster || 'N/A'}</td>
                  <td>
                    <strong>
                      {inc.cv_verification?.confidence_score 
                        ? `${(inc.cv_verification.confidence_score * 100).toFixed(1)}%` 
                        : 'N/A'}
                    </strong>
                  </td>
                  <td>{inc.status}</td>
                  <td>
                    {inc.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleVerifyIncident(inc._id, 'VERIFIED')} style={{ backgroundColor: 'green', color: 'white', marginRight: '5px' }}>Approve</button>
                        <button onClick={() => handleVerifyIncident(inc._id, 'REJECTED')} style={{ backgroundColor: 'red', color: 'white' }}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
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
            <input placeholder="Target Region (e.g., District 4 / Mysore)" value={alertForm.region} onChange={e => setAlertForm({...alertForm, region: e.target.value})} required />
            <select value={alertForm.severity} onChange={e => setAlertForm({...alertForm, severity: e.target.value})}>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High Risk</option>
              <option value="MODERATE">Moderate Risk</option>
            </select>
            <textarea placeholder="Alert Message for Citizens" value={alertForm.message} onChange={e => setAlertForm({...alertForm, message: e.target.value})} required />
            <button type="submit" style={{ backgroundColor: 'red', color: 'white', padding: '10px' }}>Broadcast Alert</button>
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