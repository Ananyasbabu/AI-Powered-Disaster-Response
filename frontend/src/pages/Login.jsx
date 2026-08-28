import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [role, setRole] = useState('citizen');
  const [username, setUsername] = useState('');

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = login(username.trim(), password);
    if (!result.success) {
      setError(result.message);
      return;
    }
    if (result.user?.role !== role) {
      setError(
        `You selected ${role} login, but the provided credentials belong to a ${result.user?.role} account.`
      );
      return;
    }
    const destination = result.user.role === 'admin' ? '/admin' : '/dashboard';
    navigate(destination);
  };

  return (
    <section className="auth-page card" style={{ maxWidth: '400px', margin: '50px auto', padding: '24px' }}>
      <div className="auth-heading">
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
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={role === 'admin' ? 'admin' : 'citizen'}
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
      <p className="page-note">
        New to DisasterGuard? <Link to="/register">Create an account</Link> and start protecting your community.
      </p>
    </section>
  );
}