import axios from 'axios';

// Vite proxies or directly calls Flask on 5000
const API = axios.create({
  baseURL:'/api'|| import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api',
  withCredentials: true,
});

// Attach JWT token to requests if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;