import { useState } from 'react';
import API from '../api/axios';

export default function FloodPrediction() {
  const [formData, setFormData] = useState({
    rainfall: '',
    riverLevel: '',
    humidity: '',
  });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setPrediction(null);

    try {
      const response = await API.post('/predict-flood', formData);
      setPrediction(response.data);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error || 'Failed to analyze risk. Ensure backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">ML RISK ASSESSMENT</p>
          <h1>Flood Risk Prediction</h1>
          <p className="intro-copy">
            Input localized environmental parameters to run the predictive model.
          </p>
        </div>
      </section>

      <section className="dashboard-section">
        <div style={{ maxWidth: '450px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                Rainfall Level (mm)
              </label>
              <input
                type="number"
                step="any"
                name="rainfall"
                placeholder="e.g., 120"
                value={formData.rainfall}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                River Level (meters)
              </label>
              <input
                type="number"
                step="any"
                name="riverLevel"
                placeholder="e.g., 4.5"
                value={formData.riverLevel}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                Humidity (%)
              </label>
              <input
                type="number"
                step="any"
                name="humidity"
                placeholder="e.g., 85"
                value={formData.humidity}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
              style={{ padding: '0.7rem', cursor: 'pointer' }}
            >
              {loading ? 'Processing Model...' : 'Calculate Prediction'}
            </button>
          </form>

          {errorMessage && (
            <div style={{ marginTop: '1rem', color: '#ef6a55', fontWeight: 'bold' }}>
              {errorMessage}
            </div>
          )}

          {prediction && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                borderRadius: '6px',
                border: '1px solid #2574e8',
                backgroundColor: 'rgba(37, 116, 232, 0.1)',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Predicted Risk: {prediction.risk_level}</h3>
              {prediction.probability && (
                <p style={{ margin: 0 }}>Model Confidence: {prediction.probability}%</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}