// src/pages/Dashboard.jsx

import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUserStore } from "../store/authStore";

// ✅ 1. Importa los componentes específicos para cada rol
import SupervisorWidgets from "../components/dashboard/SupervisorWidgets.jsx";
import MecanicoTaskList from "../components/dashboard/MecanicoTaskList.jsx";
import ChoferStatus from "../components/dashboard/ChoferStatus.jsx";

export default function Dashboard() {
  const { user, logout } = useUserStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // ✅ 2. Función para renderizar el contenido del dashboard según el rol
  const renderDashboardContent = () => {
    if (!user?.rol) return <p>Cargando información del rol...</p>;

    switch (user.rol) {
      case 'Supervisor':
        return <SupervisorWidgets />;
      case 'Mecanico':
        return <MecanicoTaskList />;
      case 'Chofer':
        return <ChoferStatus />;
      default:
        return <p>Bienvenido. No tienes una vista de dashboard específica.</p>;
    }
  };

  return (
    // ✅ 3. Se usa Tailwind CSS para el layout principal
    <div className="p-4 md:p-8 text-white">
      {/* Encabezado y Navegación */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Inicio
          </h1>
          <p className="text-gray-400">
            Hola, {user?.first_name || user?.username} (Rol: {user?.rol})
          </p>
        </div>
        <nav className="flex items-center space-x-4">
          {/* ✅ 4. Se usan clases de Tailwind para los botones */}
          <Link to="/profile" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold text-sm">
            Mi Perfil
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold text-sm"
          >
            Cerrar Sesión
          </button>
        </nav>
      </header>

      {/* Contenido Dinámico del Dashboard */}
      <main className="bg-gray-800 p-6 rounded-lg shadow-lg">
        {renderDashboardContent()}
      </main>
    </div>
  );
}