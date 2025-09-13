import { Routes, Route, Navigate } from "react-router-dom";
import { useUserStore } from "./store/authStore.js";

// --- Importación de Páginas ---
import Login from "./pages/Login.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import SetNewPassword from "./pages/SetNewPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import GestionUsuarios from './pages/GestionUsuarios.jsx';
import CrearEditarUsuario from './pages/CrearEditarUsuario.jsx'; 
import GestionVehiculos from './pages/GestionVehiculos.jsx';
import CrearEditarVehiculo from './pages/CrearEditarVehiculo.jsx';
import GestionAgenda from './pages/GestionAgenda.jsx';

// 👇 1. Importa los nuevos componentes que faltaban
import GestionOrdenes from "./pages/GestionOrdenes.jsx";
import DetalleOrden from "./pages/DetalleOrden.jsx";


// --- Importación de Componentes de Lógica ---
import PrivateRoute from "./components/PrivateRoute.jsx";

function App() {
  const { user } = useUserStore();

  return (
    <Routes>
      {/* --- RUTAS PÚBLICAS --- */}
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/set-new-password" element={<SetNewPassword />} />
      
      {/* --- RUTAS PRIVADAS / PROTEGIDAS --- */}
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Rutas de Gestión de Usuarios */}
        <Route path="/usuarios" element={<GestionUsuarios />} />
        <Route path="/usuarios/crear" element={<CrearEditarUsuario />} />
        <Route path="/usuarios/editar/:id" element={<CrearEditarUsuario />} />
        
        {/* Rutas de Gestión de Vehículos */}
        <Route path="/vehiculos" element={<GestionVehiculos />} />
        <Route path="/vehiculos/crear" element={<CrearEditarVehiculo />} />
        <Route path="/vehiculos/editar/:patente" element={<CrearEditarVehiculo />} />

        {/* Ruta para la Agenda */}
        <Route path="/agenda" element={<GestionAgenda />} />

        {/* 👇 2. Añade las nuevas rutas para las Órdenes de Servicio */}
        <Route path="/ordenes" element={<GestionOrdenes />} />
        <Route path="/ordenes/:id" element={<DetalleOrden />} />

      </Route>
      
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}

export default App;