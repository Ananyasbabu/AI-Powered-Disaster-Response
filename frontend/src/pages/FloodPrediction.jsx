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
      // Calls Flask API endpoint
      const response = await API.post('/predict-flood', formData);
      setPrediction(response.data);
    } catch (error) {
      console.error('Prediction Error:', error);
      setErrorMessage(
        error.response?.data?.error || 'Failed to analyze risk. Check backend server.'
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
            Input localized environmental metrics to estimate flood severity using the machine learning model.
          </p>
        </div>
      </section>

      <section className="dashboard-section">
        <div style={{ maxWidth: '500px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.2rem' }}>
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
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc' }}
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
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc' }}
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
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
              style={{ padding: '0.8rem', cursor: 'pointer' }}
            >
              {loading ? 'Evaluating Model...' : 'Run Flood Prediction'}
            </button>
          </form>

          {errorMessage && (
            <div style={{ marginTop: '1.5rem', color: '#ef6a55', fontWeight: 'bold' }}>
              {errorMessage}
            </div>
          )}

          {prediction && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1.2rem',
                borderRadius: '8px',
                border: '1px solid #2574e8',
                backgroundColor: 'rgba(37, 116, 232, 0.1)',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Result: {prediction.risk_level}</h3>
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