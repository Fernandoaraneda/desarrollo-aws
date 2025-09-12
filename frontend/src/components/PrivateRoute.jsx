// src/components/PrivateRoute.jsx

import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../store/authStore';
import MainLayout from './layout/MainLayout'; // 

const PrivateRoute = () => {
  const { user } = useUserStore();

  // Si no hay usuario, redirige a la página de login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // ✅ 2. Si hay usuario, muestra el Layout, y el Layout se encargará
  //    de mostrar la página correcta (a través de <Outlet />).
  return <MainLayout />;
};

export default PrivateRoute;