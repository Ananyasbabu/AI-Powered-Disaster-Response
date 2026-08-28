import { useEffect, useMemo, useState } from 'react';
import API from '../api/axios';

const shelters = [
  { id: 'central-hall', name: 'Central Community Hall', area: 'Riverfront', distance: '1.2 km', capacity: 250, occupied: 164, facilities: 'Water, power, first aid', top: 40, left: 24, status: 'Open' },
  { id: 'sunrise-gym', name: 'Sunrise School Gym', area: 'North Hills', distance: '2.8 km', capacity: 320, occupied: 286, facilities: 'Sleeping mats, food', top: 57, left: 66, status: 'Limited' },
  { id: 'harbor-complex', name: 'Harbor Sports Complex', area: 'East Lakeside', distance: '4.5 km', capacity: 420, occupied: 121, facilities: 'Charging, medical', top: 72, left: 43, status: 'Open' },
];

const riskZones = [
  { name: 'Riverfront', level: 'High', color: '#ef6a55', top: '30%', left: '10%', width: '34%', height: '33%' },
  { name: 'North Hills', level: 'Moderate', color: '#e6b84b', top: '8%', left: '50%', width: '36%', height: '28%' },
  { name: 'Green Valley', level: 'Low', color: '#53b889', top: '58%', left: '5%', width: '32%', height: '30%' },
  { name: 'East Lakeside', level: 'Critical', color: '#d94a5f', top: '52%', left: '58%', width: '35%', height: '36%' },
];

const routeOptions = [
  { shelterId: 'central-hall', eta: '10 min', distance: '3.4 km', safety: 'Safe', roads: 'Harbor Road -> Civic Avenue' },
  { shelterId: 'sunrise-gym', eta: '18 min', distance: '6.1 km', safety: 'Caution', roads: 'Civic Avenue -> North Hills Road' },
  { shelterId: 'harbor-complex', eta: '25 min', distance: '8.7 km', safety: 'Safe', roads: 'East Bypass -> Lakeside Drive' },
];

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

    const selectedRoute = useMemo(() => routeOptions.find((route) => route.shelterId === routeId) || routeOptions[0], [routeId]);
    const routeShelter = shelters.find((shelter) => shelter.id === selectedRoute.shelterId);

    return (
      <div className="dashboard-page">
        <section className="dashboard-intro"><div><p className="eyebrow">CITIZEN RESPONSE CENTER</p><h1>Know the ground. Move with confidence.</h1><p className="intro-copy">Live incident reports, safe shelter capacity, and evacuation guidance in one place.</p></div><div className="live-status"><span /> Live response data</div></section>

        <section className="dashboard-section map-section"><div className="section-heading"><div><p className="eyebrow">PART A</p><h2>Interactive map</h2></div><div className="layer-controls" aria-label="Map layers">{['all', 'incidents', 'shelters', 'risk'].map((layer) => <button className={activeLayer === layer ? 'layer-button active' : 'layer-button'} key={layer} onClick={() => setActiveLayer(layer)}>{layer[0].toUpperCase() + layer.slice(1)}</button>)}</div></div>
          <div className="response-map" aria-label="Interactive disaster response map">{activeLayer !== 'incidents' && riskZones.map((zone) => <div className="risk-zone" key={zone.name} style={{ backgroundColor: `${zone.color}55`, borderColor: zone.color, top: zone.top, left: zone.left, width: zone.width, height: zone.height }} title={`${zone.name}: ${zone.level} risk`} />)}<div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" />{activeLayer !== 'risk' && shelters.map((shelter) => <button className={selectedShelter.id === shelter.id ? 'map-marker shelter-marker selected' : 'map-marker shelter-marker'} key={shelter.id} style={{ top: `${shelter.top}%`, left: `${shelter.left}%` }} onClick={() => setSelectedShelter(shelter)} title={`Shelter: ${shelter.name}`}>S</button>)}{activeLayer !== 'risk' && incidents.map((incident, index) => <span className="map-marker incident-marker" key={incident._id || index} style={{ top: `${35 + (index * 13) % 42}%`, left: `${25 + (index * 23) % 58}%` }} title={`${incident.type || 'Verified incident'} report`} />)}<div className="map-label map-label-top">North Hills</div><div className="map-label map-label-bottom">Riverfront</div><div className="map-legend"><span><i className="legend-dot incident-dot" /> Incidents</span><span><i className="legend-dot shelter-dot" /> Shelters</span><span><i className="legend-dot risk-dot" /> Risk zones</span></div></div>
          <div className="map-selection"><strong>{selectedShelter.name}</strong><span>{selectedShelter.distance} away</span><span>{selectedShelter.status} | {selectedShelter.capacity - selectedShelter.occupied} spaces available</span></div></section>

        <section className="dashboard-section"><div className="section-heading"><div><p className="eyebrow">PART B</p><h2>Relief shelters</h2></div><span className="section-count">{shelters.length} locations tracked</span></div><div className="shelter-grid">{shelters.map((shelter) => { const available = shelter.capacity - shelter.occupied; return <button className={selectedShelter.id === shelter.id ? 'shelter-card selected' : 'shelter-card'} key={shelter.id} onClick={() => setSelectedShelter(shelter)}><div className="shelter-card-top"><span className="shelter-icon">+</span><span className={shelter.status === 'Open' ? 'availability open' : 'availability limited'}>{shelter.status}</span></div><h3>{shelter.name}</h3><p>{shelter.area} | {shelter.distance}</p><div className="capacity-label"><span>Capacity</span><strong>{available} spaces left</strong></div><div className="capacity-track"><span style={{ width: `${(shelter.occupied / shelter.capacity) * 100}%` }} /></div><small>{shelter.facilities}</small></button>; })}</div></section>

        <section className="dashboard-section route-section"><div className="section-heading"><div><p className="eyebrow">PART C</p><h2>Evacuation route</h2></div><span className="route-chip">Route reviewed 2 min ago</span></div><div className="route-layout"><div className="route-summary"><label htmlFor="route-destination">Destination shelter</label><select id="route-destination" value={routeId} onChange={(event) => setRouteId(event.target.value)}>{shelters.map((shelter) => <option value={shelter.id} key={shelter.id}>{shelter.name}</option>)}</select><div className="route-metrics"><div><strong>{selectedRoute.eta}</strong><span>Estimated time</span></div><div><strong>{selectedRoute.distance}</strong><span>Distance</span></div><div><strong className={selectedRoute.safety === 'Safe' ? 'safe-text' : 'caution-text'}>{selectedRoute.safety}</strong><span>Road status</span></div></div><p className="route-path">{selectedRoute.roads}</p><button className="primary-button route-button" onClick={() => setSelectedShelter(routeShelter)}>Set as active destination</button></div><div className="route-visual"><div className="route-line" /><span className="route-pin start-pin">You</span><span className="route-pin end-pin">Safe</span><span className="route-note">Avoid low-lying roads near East Lakeside</span></div></div></section>

        <section className="dashboard-section"><div className="section-heading"><div><p className="eyebrow">PART D</p><h2>Flood risk map</h2></div><span className="section-count">Updated from regional forecast</span></div><div className="risk-grid">{riskZones.map((zone) => <div className="risk-card" key={zone.name}><div className="risk-card-heading"><span className="risk-swatch" style={{ backgroundColor: zone.color }} /><strong>{zone.name}</strong><span className="risk-level" style={{ color: zone.color }}>{zone.level}</span></div><div className="risk-bar-track"><span style={{ width: zone.level === 'Critical' ? '92%' : zone.level === 'High' ? '72%' : zone.level === 'Moderate' ? '46%' : '18%', backgroundColor: zone.color }} /></div><small>{zone.level === 'Critical' ? 'Avoid travel and move to higher ground.' : 'Monitor alerts and follow local guidance.'}</small></div>)}</div></section>
      </div>
    );
  }