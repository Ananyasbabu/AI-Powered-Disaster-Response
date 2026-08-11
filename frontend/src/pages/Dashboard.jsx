import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';

const floodZones = [
  { name: 'Riverfront', level: 'High', color: '#ea4c89' },
  { name: 'North Hills', level: 'Moderate', color: '#f8a52f' },
  { name: 'Green Valley', level: 'Low', color: '#34a853' },
  { name: 'East Lakeside', level: 'Critical', color: '#d32f2f' },
];

const shelters = [
  { name: 'Central Community Hall', distance: '1.2 km', capacity: '250', facilities: 'Water, power, first aid' },
  { name: 'Sunrise School Gym', distance: '2.8 km', capacity: '320', facilities: 'Sleeping mats, food' },
  { name: 'Harbor Sports Complex', distance: '4.5 km', capacity: '420', facilities: 'Charging stations, medical' },
];

const routes = [
  { from: 'Your Location', to: 'Central Community Hall', eta: '10 min', safety: 'Safe' },
  { from: 'Your Location', to: 'Sunrise School Gym', eta: '18 min', safety: 'Caution' },
  { from: 'Your Location', to: 'Harbor Sports Complex', eta: '25 min', safety: 'Safe' },
];

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  const alertMessage = useMemo(
    () => ({
      title: 'Flash flood warning issued',
      details: 'Heavy rainfall expected in the riverfront and east lakeside zones in the next 2 hours. Move to the nearest shelter immediately.',
    }),
    []
  );

  return (
    <section className="dashboard-page">
      <div className="dashboard-header card">
        <div>
          <h1>Welcome back, {user?.name || 'Citizen'}.</h1>
          <p>Track flood risk, report incidents, and find safe shelter routes quickly.</p>
        </div>
        <div className="summary-pill">
          <span>Active alert</span>
          <strong>{alertMessage.title}</strong>
        </div>
      </div>

      <div className="grid-grid">
        <div className="card status-card">
          <h2>Risk snapshot</h2>
          <div className="risk-bar">
            {floodZones.map((zone) => (
              <div key={zone.name} className="risk-segment" style={{ background: zone.color }}>
                <span>{zone.name}</span>
                <strong>{zone.level}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card map-card">
          <h2>Interactive disaster map</h2>
          <div className="map-placeholder">
            <div className="map-overlay top-left">Flood Risk: Critical</div>
            <div className="map-overlay bottom-left">River rise 2.7m</div>
            <div className="map-badge">Nearby shelters: 3</div>
          </div>
        </div>

        <section className="card incident-card">
          <h2>Nearby shelters</h2>
          <div className="list-group">
            {shelters.map((shelter) => (
              <article key={shelter.name} className="list-item">
                <div>
                  <h3>{shelter.name}</h3>
                  <p>{shelter.facilities}</p>
                </div>
                <div className="meta-info">
                  <span>{shelter.distance}</span>
                  <span>{shelter.capacity}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card route-card">
          <h2>Safe evacuation route</h2>
          <table className="route-table">
            <thead>
              <tr>
                <th>Destination</th>
                <th>ETA</th>
                <th>Safety</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr key={route.to}>
                  <td>{route.to}</td>
                  <td>{route.eta}</td>
                  <td>{route.safety}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}
