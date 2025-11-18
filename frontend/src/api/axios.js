import axios from 'axios';
import { useUserStore } from '../store/authStore';

const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});


apiClient.interceptors.request.use(
  (config) => {
    const token = useUserStore.getState().token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


apiClient.interceptors.response.use(
  (response) => {
  
    return response;
  },
  (error) => {
    
    if (error.response && error.response.status === 401) {
      console.warn('Sesión expirada. Cerrando sesión...');
      

      useUserStore.getState().logout();
      

      if (window.location.pathname !== '/') {
          window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;