// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // 👈 1. Importa el BrowserRouter
import App from './App.jsx'; // (Añadida extensión por consistencia)
import './css/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 👇 2. Envuelve tu componente <App /> aquí */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);