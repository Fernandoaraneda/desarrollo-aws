// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import { useUserStore } from "./store/authStore.js";

// --- Importación de Componentes de Lógica y Layout ---
import PrivateRoute from "./components/PrivateRoute.jsx";
import MainLayout from "./components/layout/MainLayout.jsx";

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
import PanelSupervisor from './pages/PanelSupervisor.jsx';
import GestionOrdenes from "./pages/GestionOrdenes.jsx";
import DetalleOrden from "./pages/DetalleOrden.jsx";
import ConfirmarAsignarCita from './pages/ConfirmarAsignarCita.jsx';




function App() {
  const { user } = useUserStore();

  return (
    <Routes>
      {/* --- RUTAS PÚBLICAS (Login, etc.) --- */}
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
          
          {/* Gestión de Usuarios */}
          <Route path="/usuarios" element={<GestionUsuarios />} />
          <Route path="/usuarios/crear" element={<CrearEditarUsuario />} />
          <Route path="/usuarios/editar/:id" element={<CrearEditarUsuario />} />
          
          {/* Gestión de Vehículos */}
          <Route path="/vehiculos" element={<GestionVehiculos />} />
          <Route path="/vehiculos/crear" element={<CrearEditarVehiculo />} />
          <Route path="/vehiculos/editar/:patente" element={<CrearEditarVehiculo />} />

          {/* Agenda y Panel de Supervisor */}
          <Route path="/agenda" element={<GestionAgenda />} />
          <Route path="/panel-supervisor" element={<PanelSupervisor />} />
          <Route path="/agenda/confirmar/:id" element={<ConfirmarAsignarCita />} />
          {/* Órdenes de Servicio */}
          <Route path="/ordenes" element={<GestionOrdenes />} />
          <Route path="/ordenes/:id" element={<DetalleOrden />} />

        </Route>
     
      
      {/* Ruta "Catch-all" para cualquier otra URL */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}

export default App;