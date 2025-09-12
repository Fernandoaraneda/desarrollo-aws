// src/api/axios.js

import axios from 'axios';
import { useUserStore } from '../store/authStore'; // 

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. ESTA ES LA PARTE NUEVA Y MÁS IMPORTANTE
// Creamos un interceptor que se ejecuta ANTES de cada petición
apiClient.interceptors.request.use(
  (config) => {
    // Obtenemos el token directamente del store de Zustand
    const token = useUserStore.getState().token;
    
    // Si el token existe, lo añadimos a la cabecera (header) de autorización
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Devolvemos la configuración modificada para que la petición continúe
    return config;
  },
  (error) => {
    // Si hay un error, lo devolvemos
    return Promise.reject(error);
  }
);

export default apiClient;