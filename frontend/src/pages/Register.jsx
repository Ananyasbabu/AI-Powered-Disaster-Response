import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Register() {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = register(name.trim(), email.trim(), username.trim(), password);
    if (!result.success) {
      setError(result.message);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <section className="auth-page card">
      <div className="auth-heading">
        <h1>Create Citizen Account</h1>
        <p>Register to report incidents, see flood risk, navigate shelters and get alerts.</p>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
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
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="citizen"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
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
