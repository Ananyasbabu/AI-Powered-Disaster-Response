import { useEffect, useState } from 'react';
import API from '../api/axios';

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    // Connects to Flask public verified incidents endpoint
    API.get('/incidents/verified')
      .then((res) => setIncidents(res.data.data))
      .catch((err) => console.error('Error loading incidents:', err));
  }, []);

  return (
    <div>
      <h2>Active Verified Incidents</h2>
      <ul>
        {incidents.map((item) => (
          <li key={item._id}>
            {item.title || 'Incident'} — Lat: {item.location.coordinates[1]}, Lng: {item.location.coordinates[0]}
          </li>
        ))}
      </ul>
    </div>
  );
}