import React, { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = location.state?.message;

  const handleLogin = async (e) => {
  e.preventDefault();
  setError('');

  try {
    const res = await API.post('/auth/login', { email, password });

    if (res.status === 200 && res.data?.token) {
      const token = res.data.token;
      const userData = res.data.user || {};

      
      if (login) {
        login(userData, token);
      } else {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
      }

      navigate('/dashboard');
    }
  } catch (err) {
    console.error('Caught error:', err);
    if (err.response) {
      setError(err.response.data?.error || err.response.data?.message || 'Invalid email or password');
    } else {
      setError(err.message || 'An error occurred during login');
    }
  }
};

  return (
    <section className="auth-page card" style={{ maxWidth: '400px', margin: '50px auto', padding: '24px' }}>
      <div className="auth-heading">
        <h2>Login to DisasterGuard</h2>
      </div>

      {successMessage && (
        <div style={{ color: '#2e7d32', backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div style={{ color: '#d9534f', backgroundColor: '#fdf7f7', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <label>
          Email Address
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
        </label>

        <button type="submit" style={{ padding: '12px', cursor: 'pointer' }}>
          Login
        </button>
      </form>

      <p style={{ marginTop: '15px' }}>
        Don't have an account? <Link to="/register">Register here</Link>.
      </p>
    </section>
  );
}