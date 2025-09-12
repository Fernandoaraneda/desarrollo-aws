import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios.js';
import styles from '../css/gestionusuarios.module.css';
// 👇 1. Se importa el icono de búsqueda
import { UserPlus, Edit, Trash2, CheckCircle, Search } from 'lucide-react';
import ConfirmModal from '../components/modals/ConfirmModal.jsx';

const LoadingSpinner = () => <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando usuarios...</div>;

export default function GestionUsuarios() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState({});
  const [userToProcess, setUserToProcess] = useState(null);

  // 👇 2. Se añade el estado para el término de búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get('/users/list/');
        setUsers(response.data);
      } catch (err) {
        setError('No se pudo cargar la lista de usuarios. Verifica tus permisos o la conexión con la API.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // 👇 3. Se añade la lógica de filtrado eficiente
  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleConfirmAction = async () => {
    if (!userToProcess) return;
    const newActiveState = !userToProcess.is_active;
    try {
      await apiClient.patch(`/users/${userToProcess.id}/`, { is_active: newActiveState });
      setUsers(currentUsers =>
        currentUsers.map(user =>
          user.id === userToProcess.id ? { ...user, is_active: newActiveState } : user
        )
      );
    } catch (err) {
      alert(`No se pudo ${newActiveState ? 'activar' : 'desactivar'} al usuario. Inténtalo de nuevo.`);
    } finally {
      setIsModalOpen(false);
      setUserToProcess(null);
    }
  };

  const openConfirmModal = (user) => {
    setUserToProcess(user);
    if (user.is_active) {
      setModalProps({
        title: "Confirmar Desactivación",
        message: `¿Estás seguro de que quieres desactivar a @${user.username}? El usuario ya no podrá acceder al sistema.`,
        confirmButtonText: "Sí, Desactivar",
        intent: "danger"
      });
    } else {
      setModalProps({
        title: "Confirmar Activación",
        message: `¿Estás seguro de que quieres volver a activar a @${user.username}? El usuario podrá iniciar sesión de nuevo.`,
        confirmButtonText: "Sí, Activar",
        intent: "success"
      });
    }
    setIsModalOpen(true);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <>
      <div className={styles.pageWrapper}>
        <header className={styles.header}>
          <h1>Gestión de Usuarios</h1>
          <button className={styles.addButton} onClick={() => navigate('/usuarios/crear')}>
            <UserPlus size={20} />
            Añadir Usuario
          </button>
        </header>

        {/* 👇 4. Se añade la barra de búsqueda a la interfaz */}
        <div className={styles.controls}>
          <div className={styles.searchBox}>
            <Search size={20} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* 👇 5. Se itera sobre la lista FILTRADA y se muestra un mensaje si no hay resultados */}
        <div className={styles.userList}>
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <div key={user.id} className={styles.userCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.userInfo}>
                    <h3>{user.first_name} {user.last_name}</h3>
                    <p>@{user.username} | {user.rol || 'Sin Rol'}</p>
                  </div>
                  <span className={`${styles.userStatus} ${user.is_active ? styles.statusActive : styles.statusInactive}`}>
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p>{user.email}</p>
                <div className={styles.userActions}>
                  <button className={styles.actionButton} onClick={() => navigate(`/usuarios/editar/${user.id}`)}>
                    <Edit size={16} />
                    Editar
                  </button>
                  {user.is_active ? (
                    <button
                      className={styles.actionButton}
                      style={{ color: '#b91c1c' }}
                      onClick={() => openConfirmModal(user)}
                    >
                      <Trash2 size={16} />
                      Desactivar
                    </button>
                  ) : (
                    <button
                      className={styles.actionButton}
                      style={{ color: '#16a34a' }}
                      onClick={() => openConfirmModal(user)}
                    >
                      <CheckCircle size={16} />
                      Activar
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className={styles.noResults}>No se encontraron usuarios que coincidan con la búsqueda.</p>
          )}
        </div>
      </div>
      
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmAction}
        {...modalProps}
      />
    </>
  );
}

