import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/creareditarusuario.module.css';

export default function CrearEditarUsuario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // 👇 1. Se añaden los nuevos campos al estado inicial del formulario
  const [userData, setUserData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    rol: 'Chofer',
    is_active: true,
    rut: '',
    telefono: '',
  });
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditMode) {
      apiClient.get(`/users/${id}/`)
        .then(response => {
          const { rol, ...data } = response.data;
          // Se asegura de que los campos nuevos también se carguen si existen
          setUserData(prev => ({ ...prev, ...data, rol: rol || 'Chofer' }));
          setIsLoading(false);
        })
        .catch(err => {
          setError('No se pudo cargar la información del usuario.');
          setIsLoading(false);
        });
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (isEditMode) {
        await apiClient.put(`/users/${id}/`, userData);
      } else {
        await apiClient.post('/users/create/', userData);
      }
      navigate('/usuarios');
    } catch (err) {
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          const messages = Object.entries(errorData).map(([key, value]) => {
            return `${key}: ${value.join(', ')}`;
          });
          setError(messages.join(' | '));
        } else {
          setError(errorData.detail || 'Ocurrió un error al guardar el usuario.');
        }
      } else {
        setError('Ocurrió un error de red o el servidor no responde.');
      }
    }
  };
  
  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.formCard}>
        <div className={styles.formHeader}>
          <h1>{isEditMode ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}</h1>
          <p>{isEditMode ? `Modificando el perfil de @${userData.username}` : 'Completa los datos para crear una nueva cuenta.'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="username">Nombre de Usuario</label>
              <input type="text" name="username" id="username" value={userData.username} onChange={handleChange} required />
            </div>
            <div className={styles.formField}>
              <label htmlFor="email">Email</label>
              <input type="email" name="email" id="email" value={userData.email} onChange={handleChange} required />
            </div>
            <div className={styles.formField}>
              <label htmlFor="first_name">Nombre</label>
              <input type="text" name="first_name" id="first_name" value={userData.first_name} onChange={handleChange} />
            </div>
            <div className={styles.formField}>
              <label htmlFor="last_name">Apellidos</label>
              <input type="text" name="last_name" id="last_name" value={userData.last_name} onChange={handleChange} />
            </div>

            {/* 👇 2. Se añaden los nuevos campos al formulario visual */}
            <div className={styles.formField}>
              <label htmlFor="rut">RUT</label>
              <input type="text" name="rut" id="rut" value={userData.rut} onChange={handleChange} required placeholder="Ej: 12345678-9"/>
            </div>
            <div className={styles.formField}>
              <label htmlFor="telefono">Teléfono</label>
              <input type="text" name="telefono" id="telefono" value={userData.telefono} onChange={handleChange} placeholder="Ej: +56912345678" />
            </div>
            
            {!isEditMode && (
              <div className={`${styles.formField} ${styles.fullWidth}`}>
                <label htmlFor="password">Contraseña</label>
                <input type="password" name="password" id="password" value={userData.password} onChange={handleChange} required />
              </div>
            )}
            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label htmlFor="rol">Rol / Grupo</label>
              <select name="rol" id="rol" value={userData.rol} onChange={handleChange}>
                <option>Chofer</option>
                <option>Mecánico</option>
                <option>Seguridad</option>
                <option>Supervisor</option>
              </select>
            </div>
             <div className={`${styles.formField} ${styles.checkboxField} ${styles.fullWidth}`}>
              <input type="checkbox" name="is_active" id="is_active" checked={userData.is_active} onChange={handleChange} />
              <label htmlFor="is_active">Usuario Activo</label>
            </div>
          </div>
          
          {error && <p style={{ color: 'red', marginTop: '1rem', fontWeight: 'bold' }}>{error}</p>}
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={() => navigate('/usuarios')}>Cancelar</button>
            <button type="submit" className={styles.submitButton}>Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
}

