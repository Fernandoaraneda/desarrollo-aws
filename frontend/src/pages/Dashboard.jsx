import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUserStore } from "../store/authStore";
import SupervisorWidgets from "../components/dashboard/SupervisorWidgets.jsx";
import DashboardMecanico from "../components/dashboard/DashboardMecanico.jsx";
import DashboardChofer from "../components/dashboard/DashboardChofer.jsx";
export default function Dashboard() {
  const { user, logout } = useUserStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  
  const renderDashboardContent = () => {
    if (!user?.rol) return <p>Cargando información del rol...</p>;

    switch (user.rol) {
      case 'Supervisor':
        return <SupervisorWidgets />;
      case 'Mecanico':
        return <DashboardMecanico />;
      case 'Chofer':
        return <DashboardChofer />;
      default:
        return <p>Bienvenido. No tienes una vista de dashboard específica.</p>;
    }
  };

  return (
    
    <div className="p-4 md:p-8 text-white">
    
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">
          </h1>
          <p className="text-gray-400">
          </p>
        </div>
      </header>

     
      <main className="bg-gray-800 p-6 rounded-lg shadow-lg">
        {renderDashboardContent()}
      </main>
    </div>
  );
}