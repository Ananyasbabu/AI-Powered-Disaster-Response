import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import API from '../api/axios';

const shelters = [
  { id: 'central-hall', name: 'Central Community Hall', area: 'Riverfront', distance: '1.2 km', capacity: 250, occupied: 164, facilities: 'Water, power, first aid', lat: 20.61, lng: 78.96, status: 'Open' },
  { id: 'sunrise-gym', name: 'Sunrise School Gym', area: 'North Hills', distance: '2.8 km', capacity: 320, occupied: 286, facilities: 'Sleeping mats, food', lat: 20.66, lng: 79.04, status: 'Limited' },
  { id: 'harbor-complex', name: 'Harbor Sports Complex', area: 'East Lakeside', distance: '4.5 km', capacity: 420, occupied: 121, facilities: 'Charging, medical', lat: 20.55, lng: 79.02, status: 'Open' },
];

const riskZones = [
  { name: 'Riverfront', level: 'High', color: '#ef6a55', lat: 20.57, lng: 78.94, radius: 3500 },
  { name: 'North Hills', level: 'Moderate', color: '#e6b84b', lat: 20.67, lng: 79.02, radius: 3000 },
  { name: 'Green Valley', level: 'Low', color: '#53b889', lat: 20.53, lng: 78.98, radius: 2800 },
  { name: 'East Lakeside', level: 'Critical', color: '#d94a5f', lat: 20.57, lng: 79.08, radius: 3400 },
];

const routeOptions = [
  { shelterId: 'central-hall', eta: '10 min', distance: '3.4 km', safety: 'Safe', roads: 'Harbor Road -> Civic Avenue' },
  { shelterId: 'sunrise-gym', eta: '18 min', distance: '6.1 km', safety: 'Caution', roads: 'Civic Avenue -> North Hills Road' },
  { shelterId: 'harbor-complex', eta: '25 min', distance: '8.7 km', safety: 'Safe', roads: 'East Bypass -> Lakeside Drive' },
];

function LiveMap({ activeLayer, incidents, selectedShelter, onShelterSelect, onLocationChange }) {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const locationMarker = useRef(null);
  const tappedMarker = useRef(null);

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return undefined;

    const map = L.map(mapElement.current).setView([14.2798, 74.4441], 14);
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
        // Create draggable marker so user can refine exact position in emergency
        locationMarker.current = L.marker(point, {
          draggable: true,
          title: 'Your location (Drag to adjust exact spot)',
        })
          .addTo(map)
          .bindPopup('<b>Your Location</b><br/>Drag pin to adjust exact point.');

        locationMarker.current.on('dragend', async (event) => {
          const newPos = event.target.getLatLng();
          onLocationChange(`Exact location pinned: ${newPos.lat.toFixed(5)}, ${newPos.lng.toFixed(5)}`);
        });
      }

      if (!tappedMarker.current) {
        map.setView(point, 16);
      }

      if (isManual) {
        onLocationChange(`Exact position set: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else if (accuracy > 1000) {
        onLocationChange(`Approximate location (${Math.round(accuracy / 1000)}km radius). Tap map or drag pin for exact spot.`);
      } else {
        onLocationChange(`High precision GPS locked (Accurate within ${Math.round(accuracy)}m)`);
      }
    };

    const handleLocationSuccess = (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      updateLocationPoint(latitude, longitude, accuracy);
    };

    const handleLocationError = (error) => {
      onLocationChange('GPS signal unavailable. Tap on the map to set your exact location.');
    };

    // Strict GPS config requiring hardware lock
    const highAccuracyOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    let watchId;
    if (navigator.geolocation) {
      onLocationChange('Acquiring high-precision GPS lock...');
      navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, highAccuracyOptions);
      watchId = navigator.geolocation.watchPosition(handleLocationSuccess, handleLocationError, highAccuracyOptions);
    } else {
      onLocationChange('Geolocation not supported. Click on map to set location.');
    }

    // Map Tap/Click Event Handler for Exact Pinpointing
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      if (tappedMarker.current) tappedMarker.current.remove();

      tappedMarker.current = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`Selected spot: ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        .openPopup();

      onLocationChange(`Selected exact point: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        const placeName = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        onLocationChange(`Selected Location: ${placeName}`);
        tappedMarker.current.bindPopup(`Selected Location: ${placeName}`).openPopup();
      } catch (err) {
        onLocationChange(`Selected Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    });

    // Custom Button to trigger precise locate call
    const locateControl = L.control({ position: 'topright' });
    locateControl.onAdd = () => {
      const button = L.DomUtil.create('button', 'locate-button');
      button.type = 'button';
      button.textContent = 'Locate me';
      button.title = 'Get exact GPS location';
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.on(button, 'click', () => {
        if (tappedMarker.current) {
          tappedMarker.current.remove();
          tappedMarker.current = null;
        }
        onLocationChange('Requesting exact GPS coordinates...');
        navigator.geolocation?.getCurrentPosition(handleLocationSuccess, handleLocationError, highAccuracyOptions);
      });
      return button;
    };
    locateControl.addTo(map);

    return () => {
      if (watchId !== undefined) navigator.geolocation?.clearWatch(watchId);
      map.remove();
      mapRef.current = null;
      locationMarker.current = null;
      tappedMarker.current = null;
    };
  }, [onLocationChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const layers = [];
    if (activeLayer !== 'incidents') riskZones.forEach((zone) => layers.push(L.circle([zone.lat, zone.lng], { radius: zone.radius, color: zone.color, fillColor: zone.color, fillOpacity: 0.3, weight: 2 }).bindTooltip(`${zone.name}: ${zone.level} risk`).addTo(map)));
    if (activeLayer !== 'risk') shelters.forEach((shelter) => layers.push(L.circleMarker([shelter.lat, shelter.lng], { radius: selectedShelter.id === shelter.id ? 11 : 8, color: '#fff', weight: 2, fillColor: '#67d5c7', fillOpacity: 1 }).bindTooltip(shelter.name).on('click', () => onShelterSelect(shelter)).addTo(map)));
    if (activeLayer !== 'risk') incidents.forEach((incident) => {
      const coordinates = incident.location?.coordinates;
      if (Array.isArray(coordinates) && coordinates.length === 2) layers.push(L.circleMarker([coordinates[1], coordinates[0]], { radius: 8, color: '#fff', weight: 2, fillColor: '#ef6a55', fillOpacity: 1 }).bindTooltip(incident.type || 'Verified incident').addTo(map));
    });
    return () => layers.forEach((layer) => layer.remove());
  }, [activeLayer, incidents, onShelterSelect, selectedShelter]);

  return <div ref={mapElement} className="leaflet-map" aria-label="OpenStreetMap showing your current location, shelters, incidents, and flood risks" />;
}

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    API.get('/incidents/verified')
      .then((res) => setIncidents(res.data.data))
      .catch((err) => console.error('Error loading incidents:', err));
  }, []);

  const [activeLayer, setActiveLayer] = useState('all');
  const [selectedShelter, setSelectedShelter] = useState(shelters[0]);
  const [routeId, setRouteId] = useState(routeOptions[0].shelterId);
  const [locationMessage, setLocationMessage] = useState('Requesting live location...');

  const selectedRoute = useMemo(() => routeOptions.find((route) => route.shelterId === routeId) || routeOptions[0], [routeId]);
  const routeShelter = shelters.find((shelter) => shelter.id === selectedRoute.shelterId);

  return (
    <div className="dashboard-page">
      <section className="dashboard-intro"><div><p className="eyebrow">CITIZEN RESPONSE CENTER</p><h1>Know the ground. Move with confidence.</h1><p className="intro-copy">Live incident reports, safe shelter capacity, and evacuation guidance in one place.</p></div><div className="live-status"><span /> Live response data</div></section>

      <section className="dashboard-section map-section"><div className="section-heading"><div><p className="eyebrow">PART A</p><h2>Interactive map</h2></div><div className="layer-controls" aria-label="Map layers">{['all', 'incidents', 'shelters', 'risk'].map((layer) => <button className={activeLayer === layer ? 'layer-button active' : 'layer-button'} key={layer} onClick={() => setActiveLayer(layer)}>{layer[0].toUpperCase() + layer.slice(1)}</button>)}</div></div>
        <LiveMap activeLayer={activeLayer} incidents={incidents} selectedShelter={selectedShelter} onShelterSelect={setSelectedShelter} onLocationChange={setLocationMessage} />
        <div className="map-selection"><strong>{selectedShelter.name}</strong><span>{selectedShelter.distance} away</span><span>{selectedShelter.status} | {selectedShelter.capacity - selectedShelter.occupied} spaces available</span><span className="location-status">{locationMessage}</span></div></section>

      <section className="dashboard-section"><div className="section-heading"><div><p className="eyebrow">PART B</p><h2>Relief shelters</h2></div><span className="section-count">{shelters.length} locations tracked</span></div><div className="shelter-grid">{shelters.map((shelter) => { const available = shelter.capacity - shelter.occupied; return <button className={selectedShelter.id === shelter.id ? 'shelter-card selected' : 'shelter-card'} key={shelter.id} onClick={() => setSelectedShelter(shelter)}><div className="shelter-card-top"><span className="shelter-icon">+</span><span className={shelter.status === 'Open' ? 'availability open' : 'availability limited'}>{shelter.status}</span></div><h3>{shelter.name}</h3><p>{shelter.area} | {shelter.distance}</p><div className="capacity-label"><span>Capacity</span><strong>{available} spaces left</strong></div><div className="capacity-track"><span style={{ width: `${(shelter.occupied / shelter.capacity) * 100}%` }} /></div><small>{shelter.facilities}</small></button>; })}</div></section>

      <section className="dashboard-section route-section"><div className="section-heading"><div><p className="eyebrow">PART C</p><h2>Evacuation route</h2></div><span className="route-chip">Route reviewed 2 min ago</span></div><div className="route-layout"><div className="route-summary"><label htmlFor="route-destination">Destination shelter</label><select id="route-destination" value={routeId} onChange={(event) => setRouteId(event.target.value)}>{shelters.map((shelter) => <option value={shelter.id} key={shelter.id}>{shelter.name}</option>)}</select><div className="route-metrics"><div><strong>{selectedRoute.eta}</strong><span>Estimated time</span></div><div><strong>{selectedRoute.distance}</strong><span>Distance</span></div><div><strong className={selectedRoute.safety === 'Safe' ? 'safe-text' : 'caution-text'}>{selectedRoute.safety}</strong><span>Road status</span></div></div><p className="route-path">{selectedRoute.roads}</p><button className="primary-button route-button" onClick={() => setSelectedShelter(routeShelter)}>Set as active destination</button></div><div className="route-visual"><div className="route-line" /><span className="route-pin start-pin">You</span><span className="route-pin end-pin">Safe</span><span className="route-note">Avoid low-lying roads near East Lakeside</span></div></div></section>

      <section className="dashboard-section"><div className="section-heading"><div><p className="eyebrow">PART D</p><h2>Flood risk map</h2></div><span className="section-count">Updated from regional forecast</span></div><div className="risk-grid">{riskZones.map((zone) => <div className="risk-card" key={zone.name}><div className="risk-card-heading"><span className="risk-swatch" style={{ backgroundColor: zone.color }} /><strong>{zone.name}</strong><span className="risk-level" style={{ color: zone.color }}>{zone.level}</span></div><div className="risk-bar-track"><span style={{ width: zone.level === 'Critical' ? '92%' : zone.level === 'High' ? '72%' : zone.level === 'Moderate' ? '46%' : '18%', backgroundColor: zone.color }} /></div><small>{zone.level === 'Critical' ? 'Avoid travel and move to higher ground.' : 'Monitor alerts and follow local guidance.'}</small></div>)}</div></section>
    </div>
  );
}