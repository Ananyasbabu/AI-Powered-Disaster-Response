import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function AdminLogin() {
  const { adminLogin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await adminLogin(username.trim(), password);
    if (!result.success) {
      setError(result.message);
      return;
    }
    navigate('/admin');
  };

  return (
    <section className="auth-page card">
      <div className="auth-heading">
        <h1>Admin Login</h1>
        <p>Sign in with administrator credentials to access the control center for incidents, shelters and alerts.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      <form className="form-stack" onSubmit={handleSubmit}>
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
            placeholder="Enter your password"
            required
          />
        </label>
        <button type="submit" className="primary-button">
          Sign in as admin
        </button>
      </form>
      <p className="page-note">
        Not an admin? <Link to="/login">Go to citizen login</Link> instead.
      </p>
      <p className="page-note">
        Don't have an admin account? <Link to="/admin-register">Create one</Link>.
      </p>
    </section>
  );
}
