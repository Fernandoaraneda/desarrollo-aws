// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import { useUserStore } from "./store/authStore.js";

// --- Importación de Componentes de Lógica y Layout ---
// ✅ CAMBIO: Se elimina la importación del antiguo 'PrivateRoute'.
import MainLayout from "./components/layout/MainLayout.jsx";
import ProtectedRoute from './components/ProtectedRoute'; // ✅ CAMBIO: Usamos nuestro nuevo y único componente de protección.

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
import PanelIngresos from './pages/PanelIngresos';
import PanelSalida from './pages/Panelsalida.jsx';
import ProximasCitas from './pages/ProximasCitas';
import HistorialChofer from "./pages/HistorialChofer.jsx";
function App() {
  const { user } = useUserStore();

  return (
    <Routes>
      {/* --- RUTAS PÚBLICAS (visibles sin iniciar sesión) --- */}
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/set-new-password" element={<SetNewPassword />} />
      
      {/* --- RUTAS PRIVADAS / PROTEGIDAS --- */}
      {/* ✅ CAMBIO: Todas las rutas privadas se anidan dentro del MainLayout */}
      <Route element={<MainLayout />}>
        
        <Route path="/dashboard" element={
          <ProtectedRoute> {/* Cualquier usuario logueado puede ver el Dashboard */}
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute> {/* Cualquier usuario logueado puede ver su perfil */}
            <ProfilePage />
          </ProtectedRoute>
        } />
        
        {/* Gestión de Usuarios (Solo Supervisor) */}
        <Route path="/usuarios" element={
          <ProtectedRoute roles={['Supervisor']}>
            <GestionUsuarios />
          </ProtectedRoute>
        } />
        <Route path="/usuarios/crear" element={
          <ProtectedRoute roles={['Supervisor']}>
            <CrearEditarUsuario />
          </ProtectedRoute>
        } />
        <Route path="/usuarios/editar/:id" element={
          <ProtectedRoute roles={['Supervisor']}>
            <CrearEditarUsuario />
          </ProtectedRoute>
        } />
        
        {/* Gestión de Vehículos (Solo Supervisor) */}
        <Route path="/vehiculos" element={
          <ProtectedRoute roles={['Supervisor']}>
            <GestionVehiculos />
          </ProtectedRoute>
        } />
        <Route path="/vehiculos/crear" element={
          <ProtectedRoute roles={['Supervisor']}>
            <CrearEditarVehiculo />
          </ProtectedRoute>
        } />
        <Route path="/vehiculos/editar/:patente" element={
          <ProtectedRoute roles={['Supervisor']}>
            <CrearEditarVehiculo />
          </ProtectedRoute>
        } />

        {/* Flujo de Agenda */}
        <Route path="/agenda" element={
          <ProtectedRoute roles={['Supervisor', 'Chofer']}> {/* Agendar */}
            <GestionAgenda />
          </ProtectedRoute>
        } />
        <Route path="/panel-supervisor" element={
          <ProtectedRoute roles={['Supervisor']}> {/* Confirmar Citas */}
            <PanelSupervisor />
          </ProtectedRoute>
        } />
        <Route path="/agenda/confirmar/:id" element={
          <ProtectedRoute roles={['Supervisor']}> {/* Asignar Mecánico */}
            <ConfirmarAsignarCita />
          </ProtectedRoute>
        } />
        <Route path="/panel-ingresos" element={
          <ProtectedRoute roles={['Supervisor', 'Seguridad']}> {/* Registrar Ingreso Físico */}
            <PanelIngresos />
          </ProtectedRoute>
        } />


        <Route path="/panel-salidas" element={
          <ProtectedRoute roles={['Supervisor', 'Seguridad']}> {/* Registrar Salida Física */}
            <PanelSalida />
          </ProtectedRoute>
        } />



        {/* Órdenes de Servicio */}
        <Route path="/ordenes" element={
          <ProtectedRoute roles={['Supervisor', 'Mecanico']}>
            <GestionOrdenes />
          </ProtectedRoute>
        } />
        <Route path="/ordenes/:id" element={
          <ProtectedRoute roles={['Supervisor', 'Mecanico', 'Chofer']}> {/* El chofer puede ver el detalle de su orden */}
            <DetalleOrden />
          </ProtectedRoute>
        } />


        <Route
          path="/proximas-citas"
          element={
            <ProtectedRoute roles={['Mecanico', 'Supervisor']}>
              <ProximasCitas />
            </ProtectedRoute>
          }
        />
        <Route path="/historial" element={<HistorialChofer />} />
      </Route>

      
      {/* Ruta "Catch-all" para cualquier otra URL */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}

export default App;