// src/components/layout/MainLayout.jsx

import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../../store/authStore.js';
import styles from '../../css/mainlayout.module.css';
import Notificaciones from './Notificaciones';
// ✅ 1. Importamos el nuevo componente
import AccordionMenu from './AccordionMenu'; 

// ✅ 2. MODIFICAMOS LA ESTRUCTURA DE DATOS
const navLinksByRole = {
  'Supervisor': [
    // --- 3 Enlaces Principales ---
    { type: 'link', to: '/dashboard', label: 'Inicio', icon: 'fas fa-home' },
    { type: 'link', to: '/panel-supervisor', label: 'Panel de Citas', icon: 'fas fa-calendar-check' },
    { type: 'link', to: '/usuarios', label: 'Gestionar Usuarios', icon: 'fas fa-users-cog' },
    { type: 'link', to: '/vehiculos', label: 'Gestionar Vehículos', icon: 'fas fa-truck' },
    
    // --- Acordeón 1: ---
    { 
      type: 'accordion', 
      label: 'Gestión Mecanico', 
      icon: 'fas fa-tachometer-alt', // Icono para el acordeón
      links: [
        { to: '/ordenes', label: 'Órdenes de Servicio', icon: 'fas fa-clipboard-list' },
        { to: '/proximas-citas', label: 'Asignaciones Mecánico', icon: 'fas fa-calendar-alt' },
      ]
    },
    
    // --- Acordeón 2: Seguridad ---
    { 
      type: 'accordion', 
      label: 'Panel Seguridad', 
      icon: 'fas fa-shield-alt', // Icono para el acordeón
      links: [
        { to: '/panel-ingresos', label: 'Panel de Ingresos', icon: 'fas fa-door-open' },
        { to: '/panel-salidas', label: 'Registrar Salida', icon: 'fas fa-door-closed' },
      ]
    },

    // --- Acordeón 3:  chofer ---
    { 
      type: 'accordion', 
      label: 'Vistas chofer', 
      icon: 'fas fa-user-friends', // Icono para el acordeón
      links: [
        { to: '/agenda', label: 'Agendar Ingreso', icon: 'fas fa-calendar-plus' },
        { to: '/historial', label: 'Mi Historial', icon: 'fas fa-history' }
      ]
    },
  ],
  // Los otros roles se mantienen igual (planos)
  'Chofer': [
    { to: '/dashboard', label: 'Mi Estado', icon: 'fas fa-road' },
    { to: '/agenda', label: 'Agendar Ingreso', icon: 'fas fa-calendar-plus' },
    { to: '/historial', label: 'Mi Historial', icon: 'fas fa-history' }
  ],
  'Mecanico': [
    { to: '/dashboard', label: 'Tareas Asignadas', icon: 'fas fa-tasks' },
    { to: '/proximas-citas', label: 'Próximas Asignaciones', icon: 'fas fa-calendar-alt' },
    { to: '/ordenes', label: 'Órdenes de Servicio', icon: 'fas fa-clipboard-list' }
  ],
  'Seguridad': [
      { to: '/panel-ingresos', label: 'Registrar Ingreso', icon: 'fas fa-door-open' },
      { to: '/panel-salidas', label: 'Registrar Salida', icon: 'fas fa-door-closed' },
  ],
  'Administrativo': [
    { to: '/dashboard', label: 'Administracion', icon: 'fas fa-file-invoice' },
    { to: '/reportes', label: 'Reportes', icon: 'fas fa-chart-bar' }
  ]
};

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useUserStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };
  
  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      toggleSidebar();
    }
  };

  const userLinks = navLinksByRole[user?.rol] || [];
  const commonLinks = [{ to: '/profile', label: 'Mi Perfil', icon: 'fas fa-user' }];
  
  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.isOpen : ''}`}>
      <NavLink to="/dashboard" className={styles.sidebarBrand} onClick={handleLinkClick}>
        <i className="fas fa-truck"></i>
        <span>PepsiCo Taller</span>
      </NavLink>

      <nav className={styles.sidebarNav}>
        
        {/* ✅ 3. ACTUALIZAMOS EL RENDERIZADO DE LINKS */}
        {userLinks.map((item, index) => {
          
          // Si es un acordeón (Supervisor)
          if (item.type === 'accordion') {
            return (
              <AccordionMenu 
                key={index} 
                item={item} 
                handleLinkClick={handleLinkClick} 
              />
            );
          }

          // Si es un link normal (Supervisor) o si es otro rol (Chofer, Mecanico, etc.)
          // (Los otros roles no tienen 'item.type', así que entran aquí)
          return (
            <NavLink
              key={item.to || index} 
              to={item.to} 
              onClick={handleLinkClick}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}
            >
              <i className={item.icon}></i> <span>{item.label}</span>
            </NavLink>
          );
        })}

        <hr style={{ borderColor: 'var(--border-color)', margin: '1rem' }} />
        
        {/* Links comunes (Mi Perfil) */}
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


// El componente MainLayout (export default) no cambia
export default function MainLayout() {
  const { user } = useUserStore();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={styles.layoutWrapper}>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div 
        className={`${styles.overlay} ${isSidebarOpen ? styles.isOpen : ''}`}
        onClick={toggleSidebar}
      />

      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <button className={styles.hamburgerButton} onClick={toggleSidebar}>
            <i className="fas fa-bars"></i>
          </button>
          
          <div className={styles.headerRight}> 
  <span className={styles.userInfo}>
    Bienvenido, <strong>{user?.first_name || user?.username}</strong> ({user?.rol})
  </span>
  <div className={styles.notificationContainer}>
    <Notificaciones />
  </div>
</div>

        </header>
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}