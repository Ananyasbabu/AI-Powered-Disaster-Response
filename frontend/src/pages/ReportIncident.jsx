import { useMemo, useState } from 'react';

const disasterTypes = ['Flood', 'Landslide', 'Road blockage', 'Power outage', 'Storm damage'];

export default function ReportIncident() {
  const [type, setType] = useState(disasterTypes[0]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState(null);
  const [aiResult, setAiResult] = useState('No image analysis completed yet.');
  const [submitted, setSubmitted] = useState(false);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setImage(null);
      return;
    }
    setImage(file);
    setAiResult('Verifying image with AI...');
    setTimeout(() => {
      setAiResult(
        Math.random() > 0.18
          ? 'Image verification passed. This image appears consistent with a valid incident report.'
          : 'Image verification flagged potential mismatch. Please update the image or report details.'
      );
    }, 900);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!description || !location) {
      return;
    }
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3500);
  };

  const summary = useMemo(
    () => ({
      totalReports: 14,
      verifiedReports: 12,
      averageResponse: '7 min',
      activeWarnings: '2 zones',
    }),
    []
  );

  return (
    <section className="report-page">
      <div className="report-grid">
        <div className="card report-form-card">
          <div className="card-heading">
            <h1>Report an incident</h1>
            <p>Submit details and upload a photo to help AI verify the problem quickly.</p>
          </div>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label>
              Incident type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {disasterTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Location description
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Street, neighborhood, landmark"
                required
              />
            </label>
            <label>
              Report details
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the incident clearly"
                rows={5}
                required
              />
            </label>
            <label>
              Attach image
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </label>
            <button type="submit" className="primary-button">
              Submit report
            </button>
          </form>

          <div className="ai-verification card secondary-card">
            <h2>AI image verification</h2>
            <p>{aiResult}</p>
          </div>

          {submitted && (
            <div className="alert alert-success">
              Incident report submitted successfully. Emergency teams will review it shortly.
            </div>
          )}
        </div>

        <aside className="card incident-summary-card">
          <h2>Incident report overview</h2>
          <div className="summary-grid">
            <div className="summary-box">
              <span>{summary.totalReports}</span>
              <p>Reports sent</p>
            </div>
            <div className="summary-box">
              <span>{summary.verifiedReports}</span>
              <p>AI verified</p>
            </div>
            <div className="summary-box">
              <span>{summary.averageResponse}</span>
              <p>Avg response</p>
            </div>
            <div className="summary-box">
              <span>{summary.activeWarnings}</span>
              <p>Active warnings</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
