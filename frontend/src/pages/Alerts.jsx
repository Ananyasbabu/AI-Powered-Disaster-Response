import { useEffect, useState, useRef } from 'react';
import API from '../api/axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const customBluePinIcon = L.divIcon({
  className: 'custom-pin-marker',
  html: `
    <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        width: 18px;
        height: 18px;
        background-color: #2563eb;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(37, 99, 235, 0.8);
        z-index: 2;
      "></div>
      <div style="
        position: absolute;
        width: 32px;
        height: 32px;
        background-color: rgba(37, 99, 235, 0.35);
        border-radius: 50%;
        animation: pulsePin 1.5s infinite ease-in-out;
        z-index: 1;
      "></div>
    </div>
    <style>
      @keyframes pulsePin {
        0% { transform: scale(0.8); opacity: 0.8; }
        100% { transform: scale(1.6); opacity: 0; }
      }
    </style>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export default function Alerts() {
  const [incidents, setIncidents] = useState([]);
  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('Fetching live location...');
  const [addressMap, setAddressMap] = useState({});
  const [showAll, setShowAll] = useState(false);

  const [resolvingId, setResolvingId] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [resolvingLoading, setResolvingLoading] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const centerMarkerRef = useRef(null);
  const incidentMarkersMapRef = useRef(new Map());

  const BACKEND_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

  const fetchIncidents = () => {
    setLoading(true);
    API.get('/incidents/verified')
      .then((res) => {
        const data = res.data?.data || res.data?.incidents || res.data || [];
        const incidentList = Array.isArray(data) ? data : [];
        setIncidents(incidentList);
        incidentList.forEach((inc) => fetchAddressName(inc));
      })
      .catch((err) => {
        console.error('Failed to load incidents:', err);
      })
      .finally(() => setLoading(false));
  };

  const fetchAddressName = async (incident) => {
    const id = incident._id || incident.id;
    const coords = incident.location?.coordinates;
    if (!coords || coords.length < 2) return;

    const lat = coords[1];
    const lon = coords[0];

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      if (data && data.address) {
        const { city, town, village, suburb, neighbourhood, county, state_district } = data.address;
        const placeName = suburb || neighbourhood || city || town || village || county || state_district || 'Unknown Area';
        const cityName = city || town || village || state_district || '';
        const fullDisplay = cityName && placeName !== cityName ? `${placeName}, ${cityName}` : placeName;

        setAddressMap((prev) => ({ ...prev, [id]: fullDisplay }));
      }
    } catch (err) {
      console.warn('Reverse geocoding failed:', err);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported. Click on map to select spot.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setLocationStatus('Showing incidents within 15 km of your location.');
      },
      (err) => {
        console.warn('Geolocation denied/failed:', err);
        setLocationStatus('Location access denied. Click anywhere on the map to filter area.');
      }
    );
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialLat = userLocation?.lat || 12.3712;
    const initialLng = userLocation?.lng || 76.5851;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setUserLocation({
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
        });
        setLocationStatus('Showing incidents within 15 km of pinned spot.');
      });

      mapRef.current = map;
    }

    if (userLocation && mapRef.current) {
      const pos = [userLocation.lat, userLocation.lng];
      if (centerMarkerRef.current) {
        centerMarkerRef.current.setLatLng(pos);
      } else {
        centerMarkerRef.current = L.marker(pos, {
          icon: customBluePinIcon,
          draggable: true,
        }).addTo(mapRef.current);

        centerMarkerRef.current.bindPopup('<b>Selected Search Spot</b>').openPopup();

        centerMarkerRef.current.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          setUserLocation({
            lat: parseFloat(newPos.lat.toFixed(6)),
            lng: parseFloat(newPos.lng.toFixed(6)),
          });
          setLocationStatus('Showing incidents within 15 km of pinned spot.');
        });
      }
    }
  }, [userLocation]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!incidents.length) {
      setNearbyIncidents([]);
      if (mapRef.current) {
        incidentMarkersMapRef.current.forEach((m) => m.remove());
        incidentMarkersMapRef.current.clear();
      }
      return;
    }

    let filtered = [];

    if (!userLocation || showAll) {
      filtered = incidents.map((inc) => {
        const coords = inc.location?.coordinates;
        const distance = (coords && coords.length >= 2 && userLocation)
          ? getDistanceKm(userLocation.lat, userLocation.lng, coords[1], coords[0])
          : undefined;
        return { ...inc, distanceKm: distance };
      });
    } else {
      filtered = incidents
        .map((inc) => {
          const coords = inc.location?.coordinates;
          if (!coords || coords.length < 2) return null;
          const distance = getDistanceKm(userLocation.lat, userLocation.lng, coords[1], coords[0]);
          return { ...inc, distanceKm: distance };
        })
        .filter((inc) => inc && inc.distanceKm <= 15)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    setNearbyIncidents(filtered);

    if (mapRef.current) {
      incidentMarkersMapRef.current.forEach((m) => m.remove());
      incidentMarkersMapRef.current.clear();

      filtered.forEach((inc) => {
        const incId = inc._id || inc.id;
        const coords = inc.location?.coordinates;

        if (coords && coords.length >= 2) {
          const marker = L.circleMarker([coords[1], coords[0]], {
            radius: 9,
            fillColor: selectedIncidentId === incId ? '#3b82f6' : '#ef4444',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          }).addTo(mapRef.current);

          const distText = inc.distanceKm !== undefined ? `${inc.distanceKm.toFixed(1)} km away` : 'Verified Alert';
          marker.bindPopup(`<b>${inc.title || inc.type || 'Hazard Report'}</b><br/>${distText}`);
          incidentMarkersMapRef.current.set(incId, marker);
        }
      });
    }
  }, [incidents, userLocation, selectedIncidentId, showAll]);

  const handleSelectIncidentOnMap = (incident) => {
    const incId = incident._id || incident.id;
    const coords = incident.location?.coordinates;

    if (!coords || coords.length < 2 || !mapRef.current) return;

    setSelectedIncidentId(incId);
    mapRef.current.flyTo([coords[1], coords[0]], 15, { duration: 1.2 });

    const marker = incidentMarkersMapRef.current.get(incId);
    if (marker) marker.openPopup();
  };

  const handleResolveIncident = async (incidentId) => {
    if (!proofFile) {
      alert('Please select a proof image showing the resolved incident.');
      return;
    }

    const formData = new FormData();
    formData.append('proof_image', proofFile);

    try {
      setResolvingLoading(true);
      const response = await API.post(`/incidents/resolve/${incidentId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const resData = response.data;
      if (resData && (resData.verified || resData.success || resData.status === 'success')) {
        alert(resData.message || '✓ Proof verified by CV model! Incident resolved and deleted.');
        
        // Remove existing map marker cleanly
        const existingMarker = incidentMarkersMapRef.current.get(incidentId);
        if (existingMarker) {
          existingMarker.remove();
          incidentMarkersMapRef.current.delete(incidentId);
        }

        setResolvingId(null);
        setProofFile(null);

        // Remove deleted incident from React state
        setIncidents((prev) => prev.filter((item) => (item._id || item.id) !== incidentId));
      } else {
        alert(`⚠️ Resolution Failed: ${resData?.message || 'CV Confidence threshold not met.'}`);
      }
    } catch (err) {
      console.error('Failed to verify resolution proof:', err);
      alert(`⚠️ Resolution Failed: ${err.response?.data?.message || 'Proof verification failed.'}`);
    } finally {
      setResolvingLoading(false);
    }
  };

  const formatDateTime = (rawDate) => {
    if (!rawDate) return 'Recently';
    const dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) return 'Recently';

    return `${dateObj.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })} at ${dateObj.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`;
  };

  return (
    <div className="dashboard-page" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
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
        <small style={{ color: '#9ca3af', display: 'block', marginTop: '0.5rem' }}>
          {locationStatus}
        </small>
      </section>

      <section
        style={{
          backgroundColor: '#111827',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid #1f2937',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <label style={{ color: '#fff', fontWeight: '600', fontSize: '0.95rem' }}>
            📍 Interactive Map Filter:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowAll((prev) => !prev)}
              style={{
                backgroundColor: showAll ? '#2563eb' : '#374151',
                color: '#fff',
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {showAll ? 'Showing All Reports' : 'Filter by 15 km Radius'}
            </button>
            {userLocation && (
              <button
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      setLocationStatus('Showing incidents within 15 km of your location.');
                    });
                  }
                }}
                style={{
                  backgroundColor: '#374151',
                  color: '#e5e7eb',
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                Reset Location
              </button>
            )}
          </div>
        </div>
        <div
          ref={mapContainerRef}
          style={{ height: '350px', width: '100%', borderRadius: '6px', overflow: 'hidden' }}
        />
      </section>

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
          <div>
            <p style={{ color: '#f59e0b' }}>
              No severe incidents found within 15 km of your selected pin.
            </p>
            <button
              onClick={() => setShowAll(true)}
              style={{
                marginTop: '0.5rem',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              View All Global/District Incidents ({incidents.length})
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {nearbyIncidents.map((incident) => {
              const incidentId = incident._id || incident.id;
              const isSelected = selectedIncidentId === incidentId;
              const borderLeftColor =
                incident.severity === 'high' || incident.type?.toLowerCase().includes('flood')
                  ? '#ef6a55'
                  : incident.severity === 'medium'
                  ? '#e6b84b'
                  : '#2574e8';

              let imageSrc = null;
              if (incident.image_url) {
                imageSrc = incident.image_url.startsWith('http')
                  ? incident.image_url
                  : `${BACKEND_BASE_URL}/${incident.image_url}`;
              }

              const placeName = addressMap[incidentId];
              const locationDisplay = placeName || incident.address || 'Mysuru District';

              return (
                <div
                  key={incidentId}
                  style={{
                    backgroundColor: isSelected ? '#1e293b' : '#1f2937',
                    padding: '1.25rem',
                    borderRadius: '8px',
                    borderLeft: `5px solid ${borderLeftColor}`,
                    border: isSelected ? '2px solid #3b82f6' : '1px solid #374151',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    {imageSrc && (
                      <div
                        style={{
                          width: '180px',
                          height: '120px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          backgroundColor: '#111827',
                          flexShrink: 0,
                          border: '1px solid #374151',
                        }}
                      >
                        <img
                          src={imageSrc}
                          alt={incident.type || 'Incident'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: '240px' }}>
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
                        {incident.description || 'Verified citizen incident report.'}
                      </p>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '0.5rem',
                          marginTop: '0.75rem',
                          fontSize: '0.85rem',
                          color: '#9ca3af',
                          borderTop: '1px solid #374151',
                          paddingTop: '0.5rem',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#e5e7eb' }}>📍 Location:</strong> {locationDisplay}
                        </div>
                        <div>
                          <strong style={{ color: '#e5e7eb' }}>📅 Date & Time:</strong>{' '}
                          {formatDateTime(incident.created_at || incident.createdAt)}
                        </div>
                        <div>
                          <strong style={{ color: '#e5e7eb' }}>⚡ Status:</strong>{' '}
                          <span style={{ color: '#f59e0b', fontWeight: '600' }}>Active / Unresolved</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #2d3748', paddingTop: '0.75rem' }}>
                    <button
                      onClick={() => handleSelectIncidentOnMap(incident)}
                      style={{
                        backgroundColor: '#374151',
                        color: '#60a5fa',
                        border: '1px solid #4b5563',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.825rem',
                      }}
                    >
                      🎯 View & Focus on Map
                    </button>

                    {resolvingId === incidentId ? (
                      <div
                        style={{
                          backgroundColor: '#111827',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #374151',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          width: '100%',
                          maxWidth: '380px',
                        }}
                      >
                        <label style={{ color: '#d1d5db', fontSize: '0.85rem', fontWeight: '500' }}>
                          Upload Proof Photo (Analyzed by CV):
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProofFile(e.target.files[0])}
                          style={{ color: '#9ca3af', fontSize: '0.8rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setResolvingId(null);
                              setProofFile(null);
                            }}
                            style={{
                              padding: '0.35rem 0.75rem',
                              backgroundColor: '#4b5563',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleResolveIncident(incidentId)}
                            disabled={resolvingLoading}
                            style={{
                              padding: '0.35rem 0.75rem',
                              backgroundColor: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              opacity: resolvingLoading ? 0.6 : 1,
                            }}
                          >
                            {resolvingLoading ? 'Analyzing CV Proof...' : 'Verify & Resolve'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setResolvingId(incidentId)}
                        style={{
                          backgroundColor: '#059669',
                          color: '#fff',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                        }}
                      >
                        ✓ Mark as Resolved & Upload Proof
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}