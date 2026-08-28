import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
export default function Login() {
  const { login, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message);
      return;
    }
    if (result.user?.role !== 'citizen') {
      logout();
      setError('This is not a citizen account. Please use the administrator login.');
      return;
    }
    navigate('/dashboard');
  };

  return (
    <section className="auth-page card" style={{ maxWidth: '400px', margin: '50px auto', padding: '24px' }}>
      <div className="auth-heading">
        <h1>Citizen Login</h1>
        <p>Sign in here to access the citizen dashboard, map, reporting and alerts.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      <form className="form-stack" onSubmit={handleSubmit}>
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