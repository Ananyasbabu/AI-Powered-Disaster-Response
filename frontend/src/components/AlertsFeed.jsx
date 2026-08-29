import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function AlertsFeed() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const res = await API.get('/alerts/active');
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Auto-poll alerts every 15 seconds for real-time updates
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>🚨 Live Emergency Alerts</h2>
        <button onClick={fetchAlerts} style={{ padding: '5px 10px' }}>Refresh</button>
      </div>

      {loading ? (
        <p>Loading active alerts...</p>
      ) : alerts.length === 0 ? (
        <p>No active emergency alerts at this time.</p>
      ) : (
        alerts.map((alert) => (
          <div 
            key={alert._id} 
            style={{
              border: alert.severity === 'High' ? '2px solid red' : '1px solid #ccc',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '10px',
              backgroundColor: alert.severity === 'High' ? '#fff0f0' : '#f9f9f9'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', color: '#d9534f' }}>
                [{alert.severity.toUpperCase()}] {alert.type}
              </span>
              <span style={{ fontSize: '12px', color: '#666' }}>
                {new Date(alert.created_at).toLocaleTimeString()}
              </span>
            </div>

            <p style={{ margin: '8px 0' }}>{alert.description}</p>

            <div style={{ fontSize: '12px', display: 'flex', gap: '15px', color: '#444' }}>
              <span>CV Status: <strong>{alert.cv_verification?.status || 'Pending'}</strong></span>
              <span>Weather Verification: <strong>{alert.weather_verification?.verified ? 'Confirmed ✅' : 'Unverified ⚠️'}</strong></span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}