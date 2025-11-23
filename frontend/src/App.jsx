import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { useUserStore } from "/src/store/authStore.js";
import MainLayout from "/src/components/layout/MainLayout.jsx";
import ProtectedRoute from '/src/components/ProtectedRoute.jsx';

const Login = lazy(() => import('/src/pages/Login.jsx'));
const ResetPassword = lazy(() => import('/src/pages/ResetPassword.jsx'));
const SetNewPassword = lazy(() => import('/src/pages/SetNewPassword.jsx'));
const Dashboard = lazy(() => import('/src/pages/Dashboard.jsx'));
const ProfilePage = lazy(() => import('/src/pages/ProfilePage.jsx'));
const GestionUsuarios = lazy(() => import('/src/pages/GestionUsuarios.jsx'));
const CrearEditarUsuario = lazy(() => import('/src/pages/CrearEditarUsuario.jsx'));
const GestionVehiculos = lazy(() => import('/src/pages/GestionVehiculos.jsx'));
const CrearEditarVehiculo = lazy(() => import('/src/pages/CrearEditarVehiculo.jsx'));
const GestionAgenda = lazy(() => import('/src/pages/GestionAgenda.jsx'));
const PanelJefetaller = lazy(() => import('/src/pages/PanelJefetaller.jsx'));
const GestionOrdenes = lazy(() => import('/src/pages/GestionOrdenes.jsx'));
const DetalleOrden = lazy(() => import('/src/pages/DetalleOrden.jsx'));
const ConfirmarAsignarCita = lazy(() => import('/src/pages/ConfirmarAsignarCita.jsx'));
const PanelIngresos = lazy(() => import('/src/pages/PanelIngresos.jsx'));
const PanelSalida = lazy(() => import('/src/pages/Panelsalida.jsx'));
const ProximasCitas = lazy(() => import('/src/pages/ProximasCitas.jsx'));
const HistorialChofer = lazy(() => import('/src/pages/HistorialChofer.jsx'));
const GestionLlaves = lazy(() => import('/src/pages/GestionLlaves.jsx'));
const GestionLlavesHistorial = lazy(() => import('/src/pages/GestionLlavesHistorial.jsx'));
const HistorialMecanico = lazy(() => import('/src/pages/HistorialMecanico.jsx'));
const HistorialSeguridad = lazy(() => import('/src/pages/HistorialSeguridad.jsx'));
const PanelRepuestos = lazy(() => import('/src/pages/PanelRepuestos.jsx'));
const GestionStock = lazy(() => import('/src/pages/GestionStock.jsx'));
const ChatLayout = lazy(() => import('/src/pages/ChatLayout.jsx'));

function AppLoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#111827',
      color: 'white',
      fontSize: '1.2rem',
      fontFamily: 'sans-serif'
    }}>
      Cargando...
    </div>
  );
}

function App() {
  const { user } = useUserStore();

  return (

    <Suspense fallback={<AppLoadingFallback />}>
      <Routes>

        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/set-new-password" element={<SetNewPassword />} />

        <Route element={<MainLayout />}>

          <Route
            path="/stock-repuestos"
            element={
              <ProtectedRoute roles={['Repuestos', 'Jefetaller', 'Supervisor']}>
                <GestionStock />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatLayout />
              </ProtectedRoute>
            }
          />

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
            <ProtectedRoute roles={['Jefetaller', 'Supervisor']}>
              <GestionUsuarios />
            </ProtectedRoute>
          } />
          <Route path="/usuarios/crear" element={
            <ProtectedRoute roles={['Jefetaller', 'Supervisor']}>
              <CrearEditarUsuario />
            </ProtectedRoute>
          } />
          <Route path="/usuarios/editar/:id" element={
            <ProtectedRoute roles={['Jefetaller', 'Supervisor']}>
              <CrearEditarUsuario />
            </ProtectedRoute>
          } />


          <Route path="/vehiculos" element={
            <ProtectedRoute roles={['Jefetaller', 'Supervisor']}>
              <GestionVehiculos />
            </ProtectedRoute>
          } />
          <Route path="/vehiculos/crear" element={
            <ProtectedRoute roles={['Jefetaller', 'Supervisor']}>
              <CrearEditarVehiculo />
            </ProtectedRoute>
          } />
          <Route path="/vehiculos/editar/:patente" element={
            <ProtectedRoute roles={['Jefetaller', 'Supervisor']}>
              <CrearEditarVehiculo />
            </ProtectedRoute>
          } />


          <Route path="/agenda" element={
            <ProtectedRoute roles={['Jefetaller', 'Chofer', 'Supervisor']}>
              <GestionAgenda />
            </ProtectedRoute>
          } />
          <Route path="/panel-Jefetaller" element={
            <ProtectedRoute roles={['Jefetaller', 'Supervisor']}>
              <PanelJefetaller />
            </ProtectedRoute>
          } />
          <Route path="/agenda/confirmar/:id" element={
            <ProtectedRoute roles={['Jefetaller', 'Supervisor']}>
              <ConfirmarAsignarCita />
            </ProtectedRoute>
          } />
          <Route path="/panel-ingresos" element={
            <ProtectedRoute roles={['Jefetaller', 'Seguridad', 'Supervisor']}>
              <PanelIngresos />
            </ProtectedRoute>
          } />


          <Route path="/panel-salidas" element={
            <ProtectedRoute roles={['Jefetaller', 'Seguridad', 'Supervisor']}>
              <PanelSalida />
            </ProtectedRoute>
          } />


          <Route path="/ordenes" element={
            <ProtectedRoute roles={['Jefetaller', 'Mecanico', 'Supervisor']}>
              <GestionOrdenes />
            </ProtectedRoute>
          } />
          <Route path="/ordenes/:id" element={
            <ProtectedRoute roles={['Jefetaller', 'Mecanico', 'Chofer', 'Supervisor']}>
              <DetalleOrden />
            </ProtectedRoute>
          } />


          <Route
            path="/proximas-citas"
            element={
              <ProtectedRoute roles={['Mecanico', 'Jefetaller', 'Supervisor']}>
                <ProximasCitas />
              </ProtectedRoute>
            }
          />
          <Route path="/historial" element={<HistorialChofer />} />

          <Route
            path="/gestion-llaves"
            element={
              <ProtectedRoute roles={['Control Llaves', 'Jefetaller', 'Supervisor']}>
                <GestionLlaves />
              </ProtectedRoute>
            }
          />

          <Route
            path="/gestion-llaves/historial"
            element={
              <ProtectedRoute roles={['Control Llaves', 'Jefetaller', 'Supervisor']}>
                <GestionLlavesHistorial />
              </ProtectedRoute>
            }
          />

          <Route
            path="/historial-mecanico"
            element={
              <ProtectedRoute roles={['Mecanico', 'Jefetaller', 'Supervisor']}>
                <HistorialMecanico />
              </ProtectedRoute>
            }
          />
          <Route
            path="/historial-seguridad"
            element={
              <ProtectedRoute roles={['Seguridad', 'Jefetaller', 'Supervisor']}>
                <HistorialSeguridad />
              </ProtectedRoute>
            }
          />


          <Route
            path="/panel-repuestos"
            element={
              <ProtectedRoute roles={['Repuestos', 'Jefetaller', 'Supervisor']}>
                <PanelRepuestos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock-repuestos"
            element={
              <ProtectedRoute roles={['Repuestos', 'Jefetaller', 'Supervisor']}>
                <GestionStock />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />

      </Routes>
    </Suspense>
  );
}

export default App;