import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/auth/login', { email, password });

      if (res.data && res.data.token) {
        const token = res.data.token;
        const userData = res.data.user || { email };

        login(userData, token);
        navigate('/dashboard');
      }
    } catch (err) {
      // Read `error` key from login_user service response
      const backendError = err.response?.data?.error || err.response?.data?.message;
      alert(backendError || 'Invalid email or password');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h2>Login to DisasterGuard</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="email"
          placeholder="Enter Email (e.g., anu@gmail.com)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px' }}
        />
        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px' }}
        />
        <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>Login</button>
      </form>
    </div>
  );
}