// src/App.jsx

// 1. Importar lazy y Suspense de React
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { useUserStore } from "/src/store/authStore.js"; // <- Ruta corregida

// 2. Componentes estáticos (se cargan siempre, son necesarios para el layout)
import MainLayout from "/src/components/layout/MainLayout.jsx"; // <- Ruta corregida
import ProtectedRoute from '/src/components/ProtectedRoute.jsx'; // <- Ruta y extensión corregidas

// 3. (Se eliminan todos los 'import ... from "./pages/..."' estáticos de aquí)

// 4. Se definen TODAS las páginas con React.lazy() y rutas absolutas
// Esto hace que cada página se cargue en un archivo JS separado y solo cuando se necesite.
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
const PanelSupervisor = lazy(() => import('/src/pages/PanelSupervisor.jsx'));
const GestionOrdenes = lazy(() => import('/src/pages/GestionOrdenes.jsx'));
const DetalleOrden = lazy(() => import('/src/pages/DetalleOrden.jsx'));
const ConfirmarAsignarCita = lazy(() => import('/src/pages/ConfirmarAsignarCita.jsx'));
const PanelIngresos = lazy(() => import('/src/pages/PanelIngresos.jsx')); // <- Extensión .jsx añadida
const PanelSalida = lazy(() => import('/src/pages/Panelsalida.jsx'));
const ProximasCitas = lazy(() => import('/src/pages/ProximasCitas.jsx')); // <- Extensión .jsx añadida
const HistorialChofer = lazy(() => import('/src/pages/HistorialChofer.jsx'));
const GestionLlaves = lazy(() => import('/src/pages/GestionLlaves.jsx'));
const GestionLlavesHistorial = lazy(() => import('/src/pages/GestionLlavesHistorial.jsx')); // <- Extensión .jsx añadida
const HistorialMecanico = lazy(() => import('/src/pages/HistorialMecanico.jsx'));
const HistorialSeguridad = lazy(() => import('/src/pages/HistorialSeguridad.jsx'));
const PanelRepuestos = lazy(() => import('/src/pages/PanelRepuestos.jsx')); // <- Extensión .jsx añadida
const GestionStock = lazy(() => import('/src/pages/GestionStock.jsx')); // <- Extensión .jsx añadida

// 5. Opcional: Un componente de "Cargando..." más agradable para el fallback
function AppLoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#111827', // Un fondo oscuro similar al layout
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
    // 6. Envolver TODAS las rutas en <Suspense>
    // Muestra el fallback mientras se descarga el JS de la página solicitada.
    <Suspense fallback={<AppLoadingFallback />}>
      <Routes>

        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/set-new-password" element={<SetNewPassword />} />

        {/* Todas las rutas internas y protegidas quedan igual, 
            pero ahora usan los componentes cargados con lazy() */}
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
            <ProtectedRoute roles={['Supervisor', 'Chofer', 'Administrativo']}>
              <GestionAgenda />
            </ProtectedRoute>
          } />
          <Route path="/panel-supervisor" element={
            <ProtectedRoute roles={['Supervisor', 'Administrativo']}>
              <PanelSupervisor />
            </ProtectedRoute>
          } />
          <Route path="/agenda/confirmar/:id" element={
            <ProtectedRoute roles={['Supervisor', 'Administrativo']}>
              <ConfirmarAsignarCita />
            </ProtectedRoute>
          } />
          <Route path="/panel-ingresos" element={
            <ProtectedRoute roles={['Supervisor', 'Seguridad', 'Administrativo']}>
              <PanelIngresos />
            </ProtectedRoute>
          } />


          <Route path="/panel-salidas" element={
            <ProtectedRoute roles={['Supervisor', 'Seguridad', 'Administrativo']}>
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
            <ProtectedRoute roles={['Supervisor', 'Mecanico', 'Chofer', 'Administrativo']}>
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
        </Route> {/* Fin de MainLayout */}

        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />

      </Routes>
    </Suspense>
  );
}

export default App;