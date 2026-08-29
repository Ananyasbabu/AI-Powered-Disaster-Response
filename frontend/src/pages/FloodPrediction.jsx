import { useState } from 'react';
import API from '../api/axios';

export default function FloodPrediction() {
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    elevation_m: 15,
    land_use: 'Residential',
    soil_group: 'B',
    drainage_density_km_per_km2: 1.5,
    storm_drain_proximity_m: 100,
    storm_drain_type: 'Open Ditch',
    historical_rainfall_intensity_mm_hr: 45,
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setLocationLoading(false);
      },
      (error) => {
        setErrorMessage('Unable to get location access.');
        setLocationLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setPrediction(null);

    try {
      const response = await API.post('/predict-flood', {
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        elevation_m: Number(formData.elevation_m),
        land_use: formData.land_use,
        soil_group: formData.soil_group,
        drainage_density_km_per_km2: Number(formData.drainage_density_km_per_km2),
        storm_drain_proximity_m: Number(formData.storm_drain_proximity_m),
        storm_drain_type: formData.storm_drain_type,
        historical_rainfall_intensity_mm_hr: Number(formData.historical_rainfall_intensity_mm_hr),
      });

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
        </div>
      </section>

      <section className="dashboard-section">
        <div style={{ maxWidth: '450px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label>Latitude</label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label>Longitude</label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label>Elevation (meters)</label>
              <input
                type="number"
                name="elevation_m"
                value={formData.elevation_m}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Historical Rainfall Intensity (mm/hr)</label>
              <input
                type="number"
                name="historical_rainfall_intensity_mm_hr"
                value={formData.historical_rainfall_intensity_mm_hr}
                onChange={handleChange}
              />
            </div>

            <button type="button" onClick={getCurrentLocation} disabled={locationLoading || loading}>
              {locationLoading ? 'Getting Location...' : 'Use Current Location'}
            </button>

            <button type="submit" className="primary-button" disabled={loading || locationLoading}>
              {loading ? 'Processing Model...' : 'Calculate Flood Risk'}
            </button>
          </form>

          {errorMessage && (
            <div style={{ marginTop: '1rem', color: '#ef6a55', fontWeight: 'bold' }}>
              {errorMessage}
            </div>
          )}

          {prediction && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid #2574e8' }}>
              <h2>Flood Risk: {prediction.risk_level}</h2>
              <p><strong>Low Probability:</strong> {(prediction.low_probability * 100).toFixed(2)}%</p>
              <p><strong>Medium Probability:</strong> {(prediction.medium_probability * 100).toFixed(2)}%</p>
              <p><strong>High Probability:</strong> {(prediction.high_probability * 100).toFixed(2)}%</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}