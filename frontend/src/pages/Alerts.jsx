import { useEffect, useState } from 'react';
import API from '../api/axios';

// Haversine distance helper function (returns distance in km)
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Alerts() {
  const [incidents, setIncidents] = useState([]);
  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('Fetching location...');

  // 1. Fetch Verified Incidents from Backend
  useEffect(() => {
    API.get('/incidents/verified')
      .then((res) => {
        setIncidents(res.data.data || []);
      })
      .catch((err) => {
        console.error('Failed to load incidents:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // 2. Get User's Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setLocationStatus(`Showing incidents within 10 km of your location.`);
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err);
        setLocationStatus('Location access denied. Showing all reported incidents.');
      }
    );
  }, []);

  // 3. Filter Incidents by Distance when Location or Incidents update
  useEffect(() => {
    if (!incidents.length) return;

    if (!userLocation) {
      // If location is disabled, default to showing all verified incidents
      setNearbyIncidents(incidents);
      return;
    }

    const filtered = incidents
      .map((inc) => {
        const coords = inc.location?.coordinates; // Format: [longitude, latitude]
        if (!coords || coords.length < 2) return null;

        const distance = getDistanceKm(
          userLocation.lat,
          userLocation.lng,
          coords[1], // Latitude
          coords[0]  // Longitude
        );

        return { ...inc, distanceKm: distance };
      })
      .filter((inc) => inc && inc.distanceKm <= 10) // Filter to 10 km radius
      .sort((a, b) => a.distanceKm - b.distanceKm);

    setNearbyIncidents(filtered);
  }, [incidents, userLocation]);

  return (
    <div className="dashboard-page" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header Banner */}
      <section
        className="dashboard-intro"
        style={{
          backgroundColor: '#111827',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid #1f2937',
        }}
      >
        <h1 style={{ color: '#fff', margin: '0.5rem 0' }}>Emergency Alerts</h1>
        <small style={{ color: '#6b7280', display: 'block', marginTop: '0.5rem' }}>
          {locationStatus}
        </small>
      </section>

      {/* Dynamic Nearby Incidents Section */}
      <section
        className="dashboard-section"
        style={{
          backgroundColor: '#111827',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #1f2937',
        }}
      >
        <h2 style={{ color: '#fff', marginBottom: '1rem' }}>
          Nearby Reported Incidents ({nearbyIncidents.length})
        </h2>

        {loading ? (
          <p style={{ color: '#9ca3af' }}>Loading live incident reports...</p>
        ) : nearbyIncidents.length === 0 ? (
          <p style={{ color: '#53b889' }}>No severe incidents reported within 10 km of your current location.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {nearbyIncidents.map((incident) => {
              const borderLeftColor =
                incident.severity === 'high' || incident.type?.toLowerCase().includes('flood')
                  ? '#ef6a55'
                  : incident.severity === 'medium'
                  ? '#e6b84b'
                  : '#2574e8';

              return (
                <div
                  key={incident._id || incident.id}
                  style={{
                    backgroundColor: '#1f2937',
                    padding: '1rem 1.25rem',
                    borderRadius: '6px',
                    borderLeft: `5px solid ${borderLeftColor}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: '#fff', margin: 0 }}>
                      {incident.title || incident.type || 'Hazard Report'}
                    </h3>
                    {incident.distanceKm !== undefined && (
                      <span
                        style={{
                          backgroundColor: '#374151',
                          color: '#67d5c7',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                        }}
                      >
                        {incident.distanceKm.toFixed(1)} km away
                      </span>
                    )}
                  </div>

                  <p style={{ color: '#d1d5db', margin: '0.5rem 0' }}>
                    {incident.description || 'Verified citizen incident report near your area.'}
                  </p>

                  <small style={{ color: '#9ca3af' }}>
                    Reported: {incident.createdAt ? new Date(incident.createdAt).toLocaleTimeString() : 'Recently'}
                  </small>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}