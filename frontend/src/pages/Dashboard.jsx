import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
    if (!mapElement.current || mapRef.current) return undefined;

    const initialLat = userCoords ? userCoords.lat : 14.2798;
    const initialLng = userCoords ? userCoords.lng : 74.4441;

    const map = L.map(mapElement.current).setView([initialLat, initialLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    const updateLocationPoint = (lat, lng, accuracy, isManual = false) => {
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
          onLocationChange(newPos.lat, newPos.lng, `Exact location pinned: ${newPos.lat.toFixed(5)}, ${newPos.lng.toFixed(5)}`);
        });
      }

      if (!tappedMarker.current) {
        map.setView(point, 13);
      }

      onLocationChange(lat, lng, `GPS position updated (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    };

    const handleLocationSuccess = (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      updateLocationPoint(latitude, longitude, accuracy);
    };

    const handleLocationError = () => {
      onLocationChange(initialLat, initialLng, 'GPS unavailable. Tap map to select manual location.');
    };

    let watchId;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, { enableHighAccuracy: true });
      watchId = navigator.geolocation.watchPosition(handleLocationSuccess, handleLocationError, { enableHighAccuracy: true });
    }

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (tappedMarker.current) tappedMarker.current.remove();

      tappedMarker.current = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`Selected spot: ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        .openPopup();

      onLocationChange(lat, lng, `Selected point: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    });

    return () => {
      if (watchId !== undefined) navigator.geolocation?.clearWatch(watchId);
      map.remove();
      mapRef.current = null;
      locationMarker.current = null;
      tappedMarker.current = null;
    };
  }, []);

  // Update map layer markers for Shelters and ML Risk Status
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const layers = [];

    if (activeLayer !== 'risk') {
      shelters.forEach((shelter) => {
        const isSelected = selectedShelter?.id === shelter.id;
        const markerColor = shelter.is_safe ? '#53b889' : '#d94a5f'; // Green for Safe ML score, Red for Unsafe ML score

        const circle = L.circleMarker([shelter.lat, shelter.lng], {
          radius: isSelected ? 12 : 8,
          color: isSelected ? '#333' : '#fff',
          weight: 2,
          fillColor: markerColor,
          fillOpacity: 0.9,
        })
          .bindTooltip(`<b>${shelter.name}</b><br/>ML Safety: <b>${shelter.status}</b><br/>Distance: ${shelter.distance}`)
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
  const [loadingShelters, setLoadingShelters] = useState(false);
  const [activeLayer, setActiveLayer] = useState('all');
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [locationMessage, setLocationMessage] = useState('Acquiring location...');

  useEffect(() => {
    API.get('/incidents/verified')
      .then((res) => setIncidents(res.data.data))
      .catch((err) => console.error('Error loading incidents:', err));
  }, []);

  // Overpass API fetcher for 10km Nearby Schools/Colleges
  const fetchNearbyInstitutions = useCallback(async (lat, lng) => {
    setLoadingShelters(true);
    try {
      const radiusMeters = 10000; // 10 km
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="school"](around:${radiusMeters},${lat},${lng});
          node["amenity"="college"](around:${radiusMeters},${lat},${lng});
          way["amenity"="school"](around:${radiusMeters},${lat},${lng});
          way["amenity"="college"](around:${radiusMeters},${lat},${lng});
        );
        out center 15;
      `;
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
      });

      const data = await response.json();
      const rawInstitutions = (data.elements || [])
        .map((elem, idx) => {
          const itemLat = elem.lat || elem.center?.lat;
          const itemLng = elem.lon || elem.center?.lon;
          if (!itemLat || !itemLng) return null;

          const distStr = `${calculateDistance(lat, lng, itemLat, itemLng)} km`;
          const name = elem.tags?.name || elem.tags?.['name:en'] || `Govt Educational Center #${idx + 1}`;

          return {
            id: `inst-${elem.id}`,
            name,
            lat: itemLat,
            lng: itemLng,
            distance: distStr,
            capacity: 300,
            occupied: Math.floor(Math.random() * 150),
            facilities: 'Water, Emergency Shelter, Power',
          };
        })
        .filter(Boolean);

      // Analyze ML safety score for fetched schools/colleges
      const riskResponse = await API.post('/predict-shelters-risk', { shelters: rawInstitutions });
      const assessedShelters = riskResponse.data.shelters || [];

      setShelters(assessedShelters);
      if (assessedShelters.length > 0) {
        setSelectedShelter(assessedShelters[0]);
      }
    } catch (err) {
      console.error('Failed to fetch nearby educational institutions:', err);
    } finally {
      setLoadingShelters(false);
    }
  }, []);

  const handleLocationChange = (lat, lng, message) => {
    setUserCoords({ lat, lng });
    setLocationMessage(message);
    fetchNearbyInstitutions(lat, lng);
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
              <span>{selectedShelter.distance} away</span>
              <span style={{ color: selectedShelter.is_safe ? '#53b889' : '#d94a5f', fontWeight: 'bold' }}>
                {selectedShelter.status} (ML Risk: {selectedShelter.risk_level})
              </span>
            </>
          ) : (
            <span>Searching 10km radius </span>
          )}
          <span className="location-status">{locationMessage}</span>
        </div>
      </section>

      {/* Shelters Grid */}
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Nearby Relief Shelters (10 km)</h2>
          </div>
          <span className="section-count">{loadingShelters ? 'Loading...' : `${shelters.length} centers found`}</span>
        </div>

        <div className="shelter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {shelters.map((shelter) => {
            const available = shelter.capacity - shelter.occupied;
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