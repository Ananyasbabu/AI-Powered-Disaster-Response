import React, { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';
export default function Login() {
<<<<<<< HEAD
  const [email, setEmail] = useState('');
=======
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [role, setRole] = useState('citizen');
  const [username, setUsername] = useState('');
>>>>>>> upstream/main
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
<<<<<<< HEAD
  } catch (err) {
    console.error('Caught error:', err);
    if (err.response) {
      setError(err.response.data?.error || err.response.data?.message || 'Invalid email or password');
    } else {
      setError(err.message || 'An error occurred during login');
    }
  }
};
=======
    if (result.user?.role !== role) {
      setError(
        `You selected ${role} login, but the provided credentials belong to a ${result.user?.role} account.`
      );
      return;
    }
    const destination = result.user.role === 'admin' ? '/admin' : '/dashboard';
    navigate(destination);
  };
>>>>>>> upstream/main

  return (
    <section className="auth-page card" style={{ maxWidth: '400px', margin: '50px auto', padding: '24px' }}>
      <div className="auth-heading">
<<<<<<< HEAD
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
=======
        <h1>{role === 'admin' ? 'Admin Login' : 'Citizen Login'}</h1>
        <p>
          {role === 'admin'
            ? 'Sign in here to manage incidents, shelters, and emergency alerts.'
            : 'Sign in here to access the citizen dashboard, map, reporting and alerts.'}
        </p>
      </div>

      <div className="auth-toggle">
        <button
          type="button"
          className={role === 'citizen' ? 'toggle-button active' : 'toggle-button'}
          onClick={() => {
            setRole('citizen');
            setError('');
          }}
        >
          Citizen
        </button>
        <button
          type="button"
          className={role === 'admin' ? 'toggle-button active' : 'toggle-button'}
          onClick={() => {
            setRole('admin');
            setError('');
          }}
        >
          Admin
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      <form className="form-stack" onSubmit={handleSubmit}>
>>>>>>> upstream/main
        <label>
          Email Address
          <input
<<<<<<< HEAD
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
=======
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={role === 'admin' ? 'admin' : 'citizen'}
>>>>>>> upstream/main
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