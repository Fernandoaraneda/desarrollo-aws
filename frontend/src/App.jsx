// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import { useUserStore } from "./store/authStore.js";

import MainLayout from "./components/layout/MainLayout.jsx";
import ProtectedRoute from './components/ProtectedRoute';

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
import GestionLlaves from './pages/GestionLlaves.jsx';
import GestionLlavesHistorial from './pages/GestionLlavesHistorial';
import HistorialMecanico from './pages/HistorialMecanico.jsx';
import HistorialSeguridad from './pages/HistorialSeguridad.jsx';
import PanelRepuestos from './pages/PanelRepuestos';
import GestionStock from './pages/GestionStock';

function App() {
  const { user } = useUserStore();

  return (
    <Routes>

      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/set-new-password" element={<SetNewPassword />} />

      <Route element={<MainLayout />}>

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />


        <Route path="/usuarios" element={
          <ProtectedRoute roles={['Supervisor', 'Administrativo']}>
            <GestionUsuarios />
          </ProtectedRoute>
        } />
        <Route path="/usuarios/crear" element={
          <ProtectedRoute roles={['Supervisor', 'Administrativo']}>
            <CrearEditarUsuario />
          </ProtectedRoute>
        } />
        <Route path="/usuarios/editar/:id" element={
          <ProtectedRoute roles={['Supervisor', 'Administrativo']}>
            <CrearEditarUsuario />
          </ProtectedRoute>
        } />


        <Route path="/vehiculos" element={
          <ProtectedRoute roles={['Supervisor', 'Administrativo']}>
            <GestionVehiculos />
          </ProtectedRoute>
        } />
        <Route path="/vehiculos/crear" element={
          <ProtectedRoute roles={['Supervisor', 'Administrativo']}>
            <CrearEditarVehiculo />
          </ProtectedRoute>
        } />
        <Route path="/vehiculos/editar/:patente" element={
          <ProtectedRoute roles={['Supervisor', 'Administrativo']}>
            <CrearEditarVehiculo />
          </ProtectedRoute>
        } />

        {/* Flujo de Agenda */}
        <Route path="/agenda" element={
          <ProtectedRoute roles={['Supervisor', 'Chofer', 'Administrativo']}> {/* Agendar */}
            <GestionAgenda />
          </ProtectedRoute>
        } />
        <Route path="/panel-supervisor" element={
          <ProtectedRoute roles={['Supervisor', 'Administrativo']}> {/* Confirmar Citas */}
            <PanelSupervisor />
          </ProtectedRoute>
        } />
        <Route path="/agenda/confirmar/:id" element={
          <ProtectedRoute roles={['Supervisor', 'Administrativo']}> {/* Asignar Mecánico */}
            <ConfirmarAsignarCita />
          </ProtectedRoute>
        } />
        <Route path="/panel-ingresos" element={
          <ProtectedRoute roles={['Supervisor', 'Seguridad', 'Administrativo']}> {/* Registrar Ingreso Físico */}
            <PanelIngresos />
          </ProtectedRoute>
        } />


        <Route path="/panel-salidas" element={
          <ProtectedRoute roles={['Supervisor', 'Seguridad', 'Administrativo']}> {/* Registrar Salida Física */}
            <PanelSalida />
          </ProtectedRoute>
        } />



        {/* Órdenes de Servicio */}
        <Route path="/ordenes" element={
          <ProtectedRoute roles={['Supervisor', 'Mecanico', 'Administrativo']}>
            <GestionOrdenes />
          </ProtectedRoute>
        } />
        <Route path="/ordenes/:id" element={
          <ProtectedRoute roles={['Supervisor', 'Mecanico', 'Chofer', 'Administrativo']}> {/* El chofer puede ver el detalle de su orden */}
            <DetalleOrden />
          </ProtectedRoute>
        } />


        <Route
          path="/proximas-citas"
          element={
            <ProtectedRoute roles={['Mecanico', 'Supervisor', 'Administrativo']}>
              <ProximasCitas />
            </ProtectedRoute>
          }
        />
        <Route path="/historial" element={<HistorialChofer />} />

        <Route
          path="/gestion-llaves"
          element={
            <ProtectedRoute roles={['Control Llaves', 'Supervisor', 'Administrativo']}>
              <GestionLlaves />
            </ProtectedRoute>
          }
        />

        <Route
          path="/gestion-llaves/historial"
          element={
            <ProtectedRoute roles={['Control Llaves', 'Supervisor', 'Administrativo']}>
              <GestionLlavesHistorial />
            </ProtectedRoute>
          }
        />

        <Route
          path="/historial-mecanico"
          element={
            <ProtectedRoute roles={['Mecanico', 'Supervisor', 'Administrativo']}>
              <HistorialMecanico />
            </ProtectedRoute>
          }
        />
        <Route
          path="/historial-seguridad"
          element={
            <ProtectedRoute roles={['Seguridad', 'Supervisor', 'Administrativo']}>
              <HistorialSeguridad />
            </ProtectedRoute>
          }
        />


        <Route
          path="/panel-repuestos"
          element={
            <ProtectedRoute roles={['Repuestos', 'Supervisor', 'Administrativo']}>
              <PanelRepuestos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-repuestos"
          element={
            <ProtectedRoute roles={['Repuestos', 'Supervisor', 'Administrativo']}>
              <GestionStock />
            </ProtectedRoute>
          }
        />








      </Route>


      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />

    </Routes>
  );
}

export default App;