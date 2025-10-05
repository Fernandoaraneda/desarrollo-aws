// src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../store/authStore';

/**
 * Este componente protege las rutas.
 * 1. Revisa si el usuario ha iniciado sesión.
 * 2. Si se le pasa la prop "roles", revisa si el usuario tiene el rol correcto.
 */
const ProtectedRoute = ({ children, roles }) => {
  const { user } = useUserStore();
  const location = useLocation();

  // 1. Si no hay usuario, lo mandamos a la página de login.
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Si la ruta requiere un rol específico y el usuario no lo tiene...
  if (roles && !roles.includes(user.rol)) {
    // ...lo mandamos a su página de inicio para evitar que vea algo que no debe.
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Si todo está bien (está logueado y tiene el rol correcto), mostramos la página.
  return children;
};

export default ProtectedRoute;