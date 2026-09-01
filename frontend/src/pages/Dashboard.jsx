import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import API from '../api/axios';

// Utility: Calculate Haversine distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

function LiveMap({ activeLayer, incidents, shelters, selectedShelter, onShelterSelect, userCoords, onLocationChange }) {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const locationMarker = useRef(null);
  const tappedMarker = useRef(null);

  useEffect(() => {
    if (!mapElement.current) return undefined;

    if (!mapRef.current) {
      const initialLat = userCoords ? userCoords.lat : 14.2798;
      const initialLng = userCoords ? userCoords.lng : 74.4441;

      const map = L.map(mapElement.current).setView([initialLat, initialLng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    }

    const map = mapRef.current;

    const updateLocationPoint = (lat, lng, accuracy) => {
      if (!map || !map.getContainer()) return;

      const point = [lat, lng];

      if (locationMarker.current) {
        locationMarker.current.setLatLng(point);
      } else {
        locationMarker.current = L.marker(point, {
          draggable: true,
          title: 'Your Location',
        })
          .addTo(map)
          .bindPopup('<b>Your Location</b><br/>Drag pin to adjust.');

        locationMarker.current.on('dragend', (event) => {
          const newPos = event.target.getLatLng();
          onLocationChange(newPos.lat, newPos.lng, `Exact location pinned: ${newPos.lat.toFixed(5)}, ${newPos.lng.toFixed(5)}`, true);
        });
      }

      if (!tappedMarker.current) {
        map.setView(point, 13);
      }

      onLocationChange(lat, lng, `GPS position updated (${lat.toFixed(4)}, ${lng.toFixed(4)})`, false);
    };

    const handleLocationSuccess = (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      updateLocationPoint(latitude, longitude, accuracy);
    };

    const handleLocationError = () => {
      const fallbackLat = userCoords ? userCoords.lat : 14.2798;
      const fallbackLng = userCoords ? userCoords.lng : 74.4441;
      onLocationChange(fallbackLat, fallbackLng, 'GPS unavailable. Tap map to select manual location.', false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, { enableHighAccuracy: true, timeout: 10000 });
    } else {
      handleLocationError();
    }

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (tappedMarker.current) tappedMarker.current.remove();

      tappedMarker.current = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`Selected spot: ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        .openPopup();

      onLocationChange(lat, lng, `Selected point: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      locationMarker.current = null;
      tappedMarker.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const layers = [];

    if (activeLayer !== 'risk') {
      shelters.forEach((shelter) => {
        const isSelected = selectedShelter?.id === shelter.id;
        const markerColor = shelter.is_safe ? '#53b889' : '#d94a5f';

        const circle = L.circleMarker([shelter.lat, shelter.lon || shelter.lng], {
          radius: isSelected ? 12 : 8,
          color: isSelected ? '#333' : '#fff',
          weight: 2,
          fillColor: markerColor,
          fillOpacity: 0.9,
        })
          .bindTooltip(`<b>${shelter.name}</b><br/>ML Safety: <b>${shelter.is_safe ? 'Safe' : 'Unsafe'}</b><br/>Distance: ${shelter.distance}`)
          .on('click', () => onShelterSelect(shelter))
          .addTo(map);

        layers.push(circle);
      });
    }

    if (activeLayer !== 'shelters') {
      incidents.forEach((incident) => {
        const coordinates = incident.location?.coordinates;
        if (Array.isArray(coordinates) && coordinates.length === 2) {
          layers.push(
            L.circleMarker([coordinates[1], coordinates[0]], {
              radius: 8,
              color: '#fff',
              weight: 2,
              fillColor: '#ef6a55',
              fillOpacity: 1,
            })
              .bindTooltip(incident.type || 'Verified Incident')
              .addTo(map)
          );
        }
      });
    }

    return () => layers.forEach((layer) => layer.remove());
  }, [activeLayer, incidents, shelters, selectedShelter, onShelterSelect]);

  return <div ref={mapElement} className="leaflet-map" style={{ height: '450px', width: '100%' }} />;
}

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [userCoords, setUserCoords] = useState({ lat: 14.2798, lng: 74.4441 });
  const [shelters, setShelters] = useState([]);
  const [loadingShelters, setLoadingShelters] = useState(true);
  const [activeLayer, setActiveLayer] = useState('all');
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [locationMessage, setLocationMessage] = useState('Acquiring location...');

  const activeAbortController = useRef(null);
  const lastFetchedCoords = useRef({ lat: null, lng: null });

  useEffect(() => {
    API.get('/incidents/verified')
      .then((res) => setIncidents(res.data.data || []))
      .catch((err) => console.error('Error loading incidents:', err));
  }, []);

  const fetchNearbyInstitutions = useCallback(async (lat, lng, force = false) => {
    if (
      !force &&
      lastFetchedCoords.current.lat &&
      calculateDistance(lastFetchedCoords.current.lat, lastFetchedCoords.current.lng, lat, lng) < 0.5
    ) {
      return;
    }

    if (activeAbortController.current) {
      activeAbortController.current.abort();
    }
    const controller = new AbortController();
    activeAbortController.current = controller;

    lastFetchedCoords.current = { lat, lng };
    setLoadingShelters(true);

    try {
      const response = await API.post('/predict-shelters-risk', { lat, lng }, { signal: controller.signal });
      const rawShelters = response.data.data || [];

      const formattedShelters = rawShelters.map((s) => ({
        ...s,
        lng: s.lon,
        distance: `${calculateDistance(lat, lng, s.lat, s.lon)} km`,
        facilities: 'Water, Emergency Shelter, Power',
        capacity: 300,
        occupied: Math.floor(Math.random() * 150),
      }));

      setShelters(formattedShelters);
      if (formattedShelters.length > 0) {
        setSelectedShelter(formattedShelters[0]);
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('Failed to fetch nearby shelters:', err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoadingShelters(false);
      }
    }
  }, []);

  const handleLocationChange = (lat, lng, message, isManual = false) => {
    setUserCoords({ lat, lng });
    setLocationMessage(message);
    fetchNearbyInstitutions(lat, lng, isManual);
  };

  return (
    <div className="dashboard-page">
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">CITIZEN RESPONSE CENTER</p>
          <h1>Know the ground. Move with confidence.</h1>
        </div>
      </section>

      {/* Map Section */}
      <section className="dashboard-section map-section">
        <div className="section-heading">
          <div>
            <h2>Interactive Map</h2>
          </div>
          <div className="layer-controls">
            {['all', 'incidents', 'shelters', 'risk'].map((layer) => (
              <button
                className={activeLayer === layer ? 'layer-button active' : 'layer-button'}
                key={layer}
                onClick={() => setActiveLayer(layer)}
              >
                {layer[0].toUpperCase() + layer.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <LiveMap
          activeLayer={activeLayer}
          incidents={incidents}
          shelters={shelters}
          selectedShelter={selectedShelter}
          onShelterSelect={setSelectedShelter}
          userCoords={userCoords}
          onLocationChange={handleLocationChange}
        />

        <div className="map-selection" style={{ marginTop: '1rem' }}>
          {selectedShelter ? (
            <>
              <strong>{selectedShelter.name}</strong>
              <span style={{ margin: '0 0.5rem' }}>{selectedShelter.distance} away</span>
              <span style={{ color: selectedShelter.is_safe ? '#53b889' : '#d94a5f', fontWeight: 'bold' }}>
                {selectedShelter.is_safe ? 'Safe Shelter' : 'Unsafe Shelter'} (ML Risk: {selectedShelter.risk_level})
              </span>
            </>
          ) : (
            <span>{loadingShelters ? 'Analyzing risk levels for local shelters...' : 'Searching 10km radius'}</span>
          )}
          <span className="location-status" style={{ display: 'block', marginTop: '0.25rem' }}>{locationMessage}</span>
        </div>
      </section>

      {/* Shelters Grid */}
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Nearby Relief Shelters (10 km)</h2>
          </div>
          <span className="section-count">{loadingShelters ? 'Evaluating ML Safety...' : `${shelters.length} centers found`}</span>
        </div>

        <div className="shelter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {shelters.map((shelter) => {
            const isSelected = selectedShelter?.id === shelter.id;
            return (
              <button
                className={`shelter-card ${isSelected ? 'selected' : ''}`}
                key={shelter.id}
                onClick={() => setSelectedShelter(shelter)}
                style={{ textAlign: 'left', border: isSelected ? '2px solid #2574e8' : '1px solid #ccc', padding: '1rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold' }}>{shelter.name}</span>
                  <span style={{ color: shelter.is_safe ? '#53b889' : '#d94a5f', fontWeight: 'bold' }}>
                    {shelter.is_safe ? 'Safe' : 'Unsafe'}
                  </span>
                </div>
                <p>{shelter.distance} away</p>
                <div>
                  <small>ML Risk Assessment: <strong>{shelter.risk_level} Risk</strong></small>
                </div>
                <small>Facilities: {shelter.facilities}</small>
              </button>
            );
          })}
        </div>
      </section>

      {/* ML Risk Evaluation Table */}
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>ML Model Safety Assessment for Nearby Shelters</h2>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.05)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Shelter Name</th>
                <th style={{ padding: '0.75rem' }}>Distance</th>
                <th style={{ padding: '0.75rem' }}>ML Risk Level</th>
                <th style={{ padding: '0.75rem' }}>High Flood Probability</th>
                <th style={{ padding: '0.75rem' }}>Safety Status</th>
              </tr>
            </thead>
            <tbody>
              {shelters.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '0.75rem' }}>{s.name}</td>
                  <td style={{ padding: '0.75rem' }}>{s.distance}</td>
                  <td style={{ padding: '0.75rem' }}>{s.risk_level}</td>
                  <td style={{ padding: '0.75rem' }}>{(s.high_probability * 100).toFixed(2)}%</td>
                  <td style={{ padding: '0.75rem', color: s.is_safe ? '#53b889' : '#d94a5f', fontWeight: 'bold' }}>
                    {s.is_safe ? '✓ Safe Shelter' : '⚠️ Unsafe (Avoid)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}