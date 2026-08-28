import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsDuplicate(false);

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
    };

    if (payload.password.length < 8 || !/[A-Z]/.test(payload.password) || !/[0-9]/.test(payload.password)) {
      setError('Password must be at least 8 characters and include one uppercase letter and one digit.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await API.post('/auth/register', payload);

      if (response.status === 201) {
        // Redirect to Login page and pass success message state
        navigate('/login', {
          state: { message: 'Account created successfully! Please sign in.' }
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const backendError = err.response?.data?.error || err.response?.data?.message;

      if (status === 409) {
        setIsDuplicate(true);
        setError(backendError || 'An account with that email already exists.');
      } else if (!err.response) {
        setError('Cannot connect to the server. Start the backend on port 5000 and try again.');
      } else {
        setError(backendError || 'Registration failed. Please check your details.');
      }

      console.error('Registration Error:', backendError || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-page card" style={{ maxWidth: '400px', margin: '50px auto', padding: '24px' }}>
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

      <form className="form-stack" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <label>
          Full Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            required
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
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
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
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
            minLength={8}
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
        </label>

        <button type="submit" className="primary-button" disabled={isSubmitting} style={{ padding: '12px', cursor: isSubmitting ? 'wait' : 'pointer' }}>
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="page-note" style={{ marginTop: '15px' }}>
        Already have an account? <Link to="/login">Sign in</Link> instead.
      </p>
    </section>
  );
}