// src/api/axiosConfig.ts
import axios from 'axios';

// Base URL for your backend API
// In development, this is your local Spring Boot server
// In production (Netlify), this will be your Render backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8088/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add an interceptor to include the JWT token in every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwtToken'); // Get token from localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;