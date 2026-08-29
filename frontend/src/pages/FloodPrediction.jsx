import { useState } from 'react';
import API from '../api/axios';

export default function FloodPrediction() {
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle latitude/longitude input
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Get user's current location
  const getCurrentLocation = () => {
    setErrorMessage('');
    setPrediction(null);
    setLocationLoading(true);

    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by this browser.');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });

        setLocationLoading(false);
      },
      (error) => {
        let message = 'Unable to get your current location.';

        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location permission was denied. Please allow location access.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out.';
        }

        setErrorMessage(message);
        setLocationLoading(false);
      }
    );
  };

  // Send coordinates to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setErrorMessage('');
    setPrediction(null);

    try {
      const response = await API.post('/predict-flood', {
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
      });

      setPrediction(response.data);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error ||
          'Failed to analyze risk. Ensure backend is running.'
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
            Enter a location or use your current location to assess flood risk.
          </p>
        </div>
      </section>

      <section className="dashboard-section">
        <div style={{ maxWidth: '450px' }}>

          <form
            onSubmit={handleSubmit}
            style={{ display: 'grid', gap: '1rem' }}
          >

            {/* Latitude */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.4rem',
                  fontWeight: 'bold',
                }}
              >
                Latitude
              </label>

              <input
                type="number"
                step="any"
                name="latitude"
                placeholder="e.g., 13.076487"
                value={formData.latitude}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              />
            </div>

            {/* Longitude */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.4rem',
                  fontWeight: 'bold',
                }}
              >
                Longitude
              </label>

              <input
                type="number"
                step="any"
                name="longitude"
                placeholder="e.g., 80.281774"
                value={formData.longitude}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              />
            </div>

            {/* Current Location */}
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={locationLoading || loading}
              style={{
                padding: '0.7rem',
                cursor: 'pointer',
              }}
            >
              {locationLoading
                ? 'Getting Location...'
                : 'Use Current Location'}
            </button>

            {/* Prediction */}
            <button
              type="submit"
              className="primary-button"
              disabled={loading || locationLoading}
              style={{
                padding: '0.7rem',
                cursor: 'pointer',
              }}
            >
              {loading
                ? 'Processing Model...'
                : 'Calculate Flood Risk'}
            </button>

          </form>

          {/* Error */}
          {errorMessage && (
            <div
              style={{
                marginTop: '1rem',
                color: '#ef6a55',
                fontWeight: 'bold',
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Prediction Result */}
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
              <h2 style={{ marginTop: 0 }}>
                Flood Risk: {prediction.risk_level}
              </h2>

              <p>
                <strong>Low Probability:</strong>{' '}
                {(prediction.low_probability * 100).toFixed(2)}%
              </p>

              <p>
                <strong>Medium Probability:</strong>{' '}
                {(prediction.medium_probability * 100).toFixed(2)}%
              </p>

              <p>
                <strong>High Probability:</strong>{' '}
                {(prediction.high_probability * 100).toFixed(2)}%
              </p>

              {prediction.dataset_location && (
                <p style={{ marginBottom: 0 }}>
                  <strong>Location analyzed:</strong>{' '}
                  {prediction.dataset_location.latitude},{' '}
                  {prediction.dataset_location.longitude}
                </p>
              )}
            </div>
          )}

        </div>
      </section>
    </div>
  );
}