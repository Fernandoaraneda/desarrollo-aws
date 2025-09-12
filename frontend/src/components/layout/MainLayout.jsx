import React, { useState } from 'react'; // 👈 Importamos useState
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../../store/authStore.js';
import styles from '../../css/mainlayout.module.css';

// ... (la definición de navLinksByRole se mantiene igual)
const navLinksByRole = {
  'Supervisor': [
    { to: '/dashboard', label: 'Inicio', icon: 'fas fa-home' },
    { to: '/vehiculos', label: 'Gestionar Vehículos', icon: 'fas fa-truck' },
    { to: '/usuarios', label: 'Gestionar Usuarios', icon: 'fas fa-users-cog' },
    { to: '/agenda', label: 'Agenda Taller', icon: 'fas fa-calendar-alt' },
  ],
  'Chofer': [
    { to: '/dashboard', label: 'Mi Estado', icon: 'fas fa-road' },
    { to: '/agenda', label: 'Agendar Ingreso', icon: 'fas fa-calendar-plus' },
  ],
  'Mecanico': [
    { to: '/dashboard', label: 'Tareas Asignadas', icon: 'fas fa-tasks' },
    { to: '/agenda', label: 'Ver Agenda', icon: 'fas fa-calendar-alt' },
  ],
  'Administrativo': [
    { to: '/dashboard', label: 'Administracion', icon: 'fas fa-file-invoice' },
  ]
};


// 👇 Le pasamos props para controlar su estado
const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useUserStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };
  
  const handleLinkClick = () => {
    // Cierra la sidebar al hacer clic en un enlace en móvil
    if (window.innerWidth <= 768) {
      toggleSidebar();
    }
  };

  const userLinks = navLinksByRole[user?.rol] || [];
  const commonLinks = [{ to: '/profile', label: 'Mi Perfil', icon: 'fas fa-user' }];
  
  return (
    // 👇 Aplicamos la clase 'isOpen' condicionalmente
    <aside className={`${styles.sidebar} ${isOpen ? styles.isOpen : ''}`}>
      <NavLink to="/dashboard" className={styles.sidebarBrand} onClick={handleLinkClick}>
        <i className="fas fa-truck"></i>
        <span>PepsiCo Taller</span>
      </NavLink>

      <nav className={styles.sidebarNav}>
        {userLinks.map(link => (
          <NavLink
            key={link.to} to={link.to} onClick={handleLinkClick}
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
          >
            <i className={link.icon}></i> <span>{link.label}</span>
          </NavLink>
        ))}
        <hr style={{ borderColor: 'var(--border-color)', margin: '1rem' }} />
        {commonLinks.map(link => (
          <NavLink
            key={link.to} to={link.to} onClick={handleLinkClick}
            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
          >
            <i className={link.icon}></i> <span>{link.label}</span>
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
  // ✅ 1. Añadimos el estado para controlar la sidebar
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // ✅ 2. Función para abrir/cerrar la sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={styles.layoutWrapper}>
      {/* ✅ 3. Pasamos el estado y la función a la Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* ✅ 4. Overlay para el fondo oscuro en móvil */}
      <div 
        className={`${styles.overlay} ${isSidebarOpen ? styles.isOpen : ''}`}
        onClick={toggleSidebar}
      />

      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          {/* ✅ 5. Botón de hamburguesa que solo se ve en móvil */}
          <button className={styles.hamburgerButton} onClick={toggleSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          
          <span className={styles.userInfo}>
            Bienvenido, <strong>{user?.first_name || user?.username}</strong> ({user?.rol})
          </span>
        </header>
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}