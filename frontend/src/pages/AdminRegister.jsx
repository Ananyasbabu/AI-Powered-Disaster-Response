import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function AdminRegister() {
  const { user, register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (registered && user?.role === 'admin') {
      navigate('/admin');
    }
  }, [registered, user, navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = register(name.trim(), email.trim(), username.trim(), password, 'admin');
    if (!result.success) {
      setError(result.message);
      return;
    }
    setRegistered(true);
  };

  return (
    <section className="auth-page card">
      <div className="auth-heading">
        <h1>Admin Registration</h1>
        <p>Create an administrator account to manage the disaster response platform.</p>
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
            placeholder="admin@example.com"
            required
          />
        </label>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a secure password"
            required
          />
        </label>
        <button type="submit" className="primary-button">
          Register Admin
        </button>
      </form>
      <p className="page-note">
        Already have an admin account? <Link to="/admin-login">Sign in</Link> instead.
      </p>
    </section>
  );
}
