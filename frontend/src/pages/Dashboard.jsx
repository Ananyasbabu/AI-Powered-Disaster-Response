<<<<<<< HEAD
import { useEffect, useState } from 'react';
import API from '../api/axios';
=======
import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';

const floodZones = [
  { name: 'Riverfront', level: 'High', color: '#ea4c89' },
  { name: 'North Hills', level: 'Moderate', color: '#f1e04b' },
  { name: 'Green Valley', level: 'Low', color: '#49e673' },
  { name: 'East Lakeside', level: 'Critical', color: '#f30606' },
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
>>>>>>> upstream/main

export default function Dashboard() {
  const [incidents, setIncidents] = useState([]);

<<<<<<< HEAD
  useEffect(() => {
    // Connects to Flask public verified incidents endpoint
    API.get('/incidents/verified')
      .then((res) => setIncidents(res.data.data))
      .catch((err) => console.error('Error loading incidents:', err));
  }, []);
=======
  const alertMessage = useMemo(
    () => ({
      title: ' ',
      details: '  ',
    }),
    []
  );
>>>>>>> upstream/main

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