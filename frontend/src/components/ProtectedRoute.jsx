import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../store/authStore';


const ProtectedRoute = ({ children, roles }) => {
  const { user } = useUserStore();
  const location = useLocation();

  
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  
  if (roles && !roles.includes(user.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;