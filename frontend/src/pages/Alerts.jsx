import { useMemo } from 'react';

const alerts = [
  {
    title: 'Evacuate low-lying neighborhoods',
    severity: 'High',
    message: 'Riverfront and East Lakeside flood zones are under evacuation order. Please use the nearest safe route and shelter immediately.',
    time: '2 minutes ago',
  },
  {
    title: 'Road closure: Oak Bridge',
    severity: 'Medium',
    message: 'Oak Bridge is closed due to flood damage. Use Sunrise School Gym route instead.',
    time: '15 minutes ago',
  },
  {
    title: 'Shelter update',
    severity: 'Info',
    message: 'Central Community Hall has additional sleeping mats and water supplies available.',
    time: '30 minutes ago',
  },
];

export default function Alerts() {
  const currentAlert = useMemo(() => alerts[0], []);

  return (
    <section className="alerts-page">
      <div className="card alert-banner">
        <div>
          <h1>Emergency alerts</h1>
          <p>Stay informed with real-time warnings, shelter updates and safe route changes.</p>
        </div>
      </div>

      <div className="card alerts-list-card">
        {alerts.map((alert) => (
          <article key={alert.title} className={`alert-card alert-${alert.severity.toLowerCase()}`}>
            <div className="alert-body">
              <h2>{alert.title}</h2>
              <p>{alert.message}</p>
            </div>
            <span className="alert-time">{alert.time}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
