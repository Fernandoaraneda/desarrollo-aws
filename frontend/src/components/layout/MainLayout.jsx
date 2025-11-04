import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../../store/authStore.js';
import styles from '../../css/mainlayout.module.css';
import Notificaciones from './Notificaciones';

import AccordionMenu from './AccordionMenu'; 

const navLinksByRole = {
  'Supervisor': [
    { type: 'link', to: '/dashboard', label: 'Inicio', icon: 'fas fa-home' },
    { type: 'link', to: '/panel-supervisor', label: 'Panel de Citas', icon: 'fas fa-calendar-check' },
    { type: 'link', to: '/usuarios', label: 'Gestionar Usuarios', icon: 'fas fa-users-cog' },
    { type: 'link', to: '/vehiculos', label: 'Gestionar Vehículos', icon: 'fas fa-truck' },
  ],

  'Chofer': [
    { to: '/dashboard', label: 'Mi Estado', icon: 'fas fa-road' },
    { to: '/agenda', label: 'Agendar Ingreso', icon: 'fas fa-calendar-plus' },
    { to: '/historial', label: 'Mi Historial', icon: 'fas fa-history' }
  ],
  'Mecanico': [
    { to: '/dashboard', label: 'Tareas Asignadas', icon: 'fas fa-tasks' },
    { to: '/proximas-citas', label: 'Próximas Asignaciones', icon: 'fas fa-calendar-alt' },
    { to: '/ordenes', label: 'Órdenes de Servicio', icon: 'fas fa-clipboard-list' },
    { to: '/historial-mecanico', label: 'Mi Historial', icon: 'fas fa-history' }
  ],
  'Seguridad': [
      { to: '/panel-ingresos', label: 'Registrar Ingreso', icon: 'fas fa-door-open' },
      { to: '/panel-salidas', label: 'Registrar Salida', icon: 'fas fa-door-closed' },
      { to: '/historial-seguridad', label: 'Historial Movimientos', icon: 'fas fa-history' },
  ],
  'Administrativo': [

    { type: 'link', to: '/dashboard', label: 'Inicio', icon: 'fas fa-home' },
    { type: 'link', to: '/panel-supervisor', label: 'Panel de Citas', icon: 'fas fa-calendar-check' },
    { type: 'link', to: '/usuarios', label: 'Gestionar Usuarios', icon: 'fas fa-users-cog' },
    { type: 'link', to: '/vehiculos', label: 'Gestionar Vehículos', icon: 'fas fa-truck' },
    // --- Acordeón 1: mecanicop ---
    { 
      type: 'accordion', 
      label: 'Gestión Mecanico', 
      icon: 'fas fa-tachometer-alt',
      links: [
        { to: '/ordenes', label: 'Órdenes de Servicio', icon: 'fas fa-clipboard-list' },
        { to: '/proximas-citas', label: 'Asignaciones Mecánico', icon: 'fas fa-calendar-alt' },
        { to: '/historial-mecanico', label: 'Mi Historial', icon: 'fas fa-history' }
      ]
    },
    // --- Acordeón 2: Seguridad ---
    { 
      type: 'accordion', 
      label: 'Panel Seguridad', 
      icon: 'fas fa-shield-alt',
      links: [
        { to: '/panel-ingresos', label: 'Panel de Ingresos', icon: 'fas fa-door-open' },
        { to: '/panel-salidas', label: 'Registrar Salida', icon: 'fas fa-door-closed' },
        { to: '/historial-seguridad', label: 'Historial Movimientos', icon: 'fas fa-history' },
      ]
    },
    // --- Acordeón 3:  chofer ---
    { 
      type: 'accordion', 
      label: 'Vistas Chofer', 
      icon: 'fas fa-user-friends',
      links: [
        { to: '/agenda', label: 'Agendar Ingreso', icon: 'fas fa-calendar-plus' },
        { to: '/historial', label: 'Mi Historial', icon: 'fas fa-history' }
      ]
    },
    // --- Acordeón 4: Gestor de llaves ---
    { 
      type: 'accordion', 
      label: 'Manejo de Llaves', 
      icon: 'fas fa-shield-alt',
      links: [
        { to: '/gestion-llaves', label: 'Gestión de Llaves', icon: 'fas fa-key' },
        { to: '/gestion-llaves/historial', label: 'Historial de Llaves', icon: 'fas fa-history' },
      ]
    },
  ],
  'Control Llaves': [
    { to: '/gestion-llaves', label: 'Gestión de Llaves', icon: 'fas fa-key' },
    { to: '/gestion-llaves/historial', label: 'Historial de Llaves', icon: 'fas fa-history' },
  ],

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
        
        
        {userLinks.map((item, index) => {
          
         
          if (item.type === 'accordion') {
            return (
              <AccordionMenu 
                key={index} 
                item={item} 
                handleLinkClick={handleLinkClick} 
              />
            );
          }

          
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