import { createContext, useState } from 'react';
import API from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const login = async (email, password) => {
    try {
      const response = await API.post('/auth/login', { email: email.trim().toLowerCase(), password });
      const loggedInUser = response.data.user;
      setUser(loggedInUser);
      setToken(response.data.token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      localStorage.setItem('token', response.data.token);
      return { success: true, user: loggedInUser };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Unable to connect to the server.',
      };
    }
  };

  const adminLogin = async (username, password) => {
    try {
      const response = await API.post('/admin/login', { username: username.trim(), password });
      const loggedInUser = { username, role: response.data.role || 'admin' };
      setUser(loggedInUser);
      setToken(response.data.token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      localStorage.setItem('token', response.data.token);
      return { success: true, user: loggedInUser };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Unable to connect to the server.',
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      await API.post('/auth/register', { name, email, password });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || 'Registration failed.',
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const value = { user, token, login, adminLogin, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
