import axios from 'axios';

const API = axios.create({
  // Use your public Codespace port 5000 URL here:
  baseURL: '/api',
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;