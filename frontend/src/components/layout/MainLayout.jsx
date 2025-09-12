import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../../store/authStore.js';
import styles from '../../css/mainlayout.module.css'; // ¡Importamos nuestro CSS!

// Centralizamos la definición de los enlaces de navegación por rol
const navLinksByRole = {
  'Supervisor': [
    { to: '/dashboard', label: 'Inicio', icon: 'fas fa-home' },
    { to: '/vehiculos', label: 'Gestionar Vehículos', icon: 'fas fa-truck' },
    { to: '/usuarios', label: 'Gestionar Usuarios', icon: 'fas fa-users-cog' },
    { to: '/agenda', label: 'Agenda Taller', icon: 'fas fa-calendar-alt' },
  ],
  'Chofer': [
    { to: '/dashboard', label: 'Mi Estado', icon: 'fas fa-road' },
    // 👇 Se añade el enlace a la agenda para el Chofer
    { to: '/agenda', label: 'Agendar Ingreso', icon: 'fas fa-calendar-plus' },
  ],
  'Mecanico': [
    { to: '/dashboard', label: 'Tareas Asignadas', icon: 'fas fa-tasks' },
    // 👇 También es útil que el Mecánico vea la agenda
    { to: '/agenda', label: 'Ver Agenda', icon: 'fas fa-calendar-alt' },
  ],
  'Administrativo': [
     { to: '/dashboard', label: 'Administracion', icon: 'fas fa-file-invoice' },
  ]
};

// Componente Sidebar separado para mayor claridad
const Sidebar = () => {
  const { user, logout } = useUserStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const userLinks = navLinksByRole[user?.rol] || [];
  const commonLinks = [{ to: '/profile', label: 'Mi Perfil', icon: 'fas fa-user' }];
  
  return (
    <aside className={styles.sidebar}>
      <NavLink to="/dashboard" className={styles.sidebarBrand}>
        <i className="fas fa-truck"></i>
        <span>PepsiCo Taller</span>
      </NavLink>

      <nav className={styles.sidebarNav}>
        {/* Renderiza los enlaces según el rol */}
        {userLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
          >
            <i className={link.icon}></i>
            <span>{link.label}</span>
          </NavLink>
        ))}
        <hr style={{ borderColor: 'var(--border-color)', margin: '1rem' }} />
        {/* Renderiza los enlaces comunes a todos */}
        {commonLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
          >
            <i className={link.icon}></i>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <button onClick={handleLogout} className={styles.logoutButton}>
          <i className="fas fa-sign-out-alt" style={{marginRight: '8px'}}></i>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};

// Layout principal que une todo
export default function MainLayout() {
  const { user } = useUserStore();

  return (
    <div className={styles.layoutWrapper}>
      <Sidebar />
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <span className={styles.userInfo}>
            Bienvenido, <strong>{user?.first_name || user?.username}</strong> ({user?.rol})
          </span>
        </header>
        <main className={styles.mainContent}>
          {/* Aquí se renderizará tu página (Dashboard, Perfil, etc.) */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

