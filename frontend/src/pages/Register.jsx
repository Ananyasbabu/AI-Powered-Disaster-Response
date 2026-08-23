import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function Register() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsDuplicate(false);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      password: password,
    };

    try {
      const response = await API.post('/auth/register', payload);

      if (response.status === 201) {
        const token = response.data?.token;
        const userData = response.data?.user;

        if (token && login) {
          login(userData, token);
        }

        navigate('/dashboard');
      }
    } catch (err) {
      const status = err.response?.status;
      const backendError = err.response?.data?.error;

      if (status === 409) {
        setIsDuplicate(true);
        setError(backendError || 'An account with that email already exists.');
      } else {
        setError(backendError || 'Registration failed. Please try again.');
      }

      console.error('Registration Error:', backendError || err.message);
    }
  };

  return (
    <section className="auth-page card">
      <div className="auth-heading">
        <h1>Create Citizen Account</h1>
        <p>Register to report incidents, see flood risk, navigate shelters and get alerts.</p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ color: '#d9534f', marginBottom: '15px', fontWeight: 'bold' }}>
          {error}
          {isDuplicate && (
            <span style={{ display: 'block', marginTop: '5px' }}>
              <Link to="/login" style={{ textDecoration: 'underline', color: '#0275d8' }}>
                Click here to Sign In instead
              </Link>
            </span>
          )}
        </div>
      )}

      <form className="form-stack" onSubmit={handleSubmit}>
        <label>
          Full Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            required
          />
        </label>

        <label>
          Email Address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password123 (8+ chars, 1 uppercase, 1 digit)"
            required
          />
        </label>

        <button type="submit" className="primary-button">
          Register
        </button>
      </form>

      <p className="page-note">
        Already have an account? <Link to="/login">Sign in</Link> instead.
      </p>
    </section>
  );
}