import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '/src/api/axios.js';
import styles from '../css/creareditarusuario.module.css';


/**
 * @param {string} rutCuerpo 
 * @returns {string} 
 */
const calcularDV = (rutCuerpo) => {
  let suma = 0;
  let multiplo = 2;
  for (let i = rutCuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(rutCuerpo.charAt(i), 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const dvCalculado = 11 - (suma % 11);
  
  if (dvCalculado === 11) return '0';
  if (dvCalculado === 10) return 'K';
  return `${dvCalculado}`;
};


const formatearRut = (rut) => {
  const rutLimpio = rut.replace(/[^0-9kK]/gi, '');
  if (rutLimpio.length < 2) return rutLimpio;
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toUpperCase();
  
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${cuerpoFormateado}-${dv}`;
};


const validarRut = (rut) => {
  const rutLimpio = rut.replace(/[^0-9kK]/gi, '');
  if (rutLimpio.length < 2) return false;
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toUpperCase();
  
  return calcularDV(cuerpo) === dv;
};


const formatTelefono = (value) => {
  return value.replace(/\D/g, '').slice(0, 9);
};


const formatTexto = (value) => {
  return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s']/g, '').slice(0, 20);
};



export default function CrearEditarUsuario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

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
  const [rutError, setRutError] = useState(''); 

  useEffect(() => {
    if (isEditMode) {
      apiClient.get(`/users/${id}/`)
        .then(response => {
          const { rol, ...data } = response.data;
          setUserData(prev => ({ 
            ...prev, 
            ...data, 
            rol: rol || 'Chofer',
            telefono: data.telefono || '' 
          }));
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
    
    let finalValue = type === 'checkbox' ? checked : value;

    
    switch(name) {
      case 'rut':
      
        finalValue = value.replace(/[^0-9kK]/gi, '').slice(0, 9);
       
        setRutError(''); 
        break;
      case 'telefono':
        finalValue = formatTelefono(value);
        break;
      case 'first_name':
      case 'last_name':
        finalValue = formatTexto(value);
        break;
    }

    setUserData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

 
  const handleRutBlur = (e) => {
    const rutLimpio = e.target.value;
    
    if (rutLimpio.length < 2) {
      
      return; 
    }

    if (validarRut(rutLimpio)) {
      
      setRutError('');
      setUserData(prev => ({
        ...prev,
        rut: formatearRut(rutLimpio)
      }));
    } else {
     
      setRutError('El RUT es inválido (Dígito Verificador no coincide).');
  
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

   
    if (rutError) {
      setError("Por favor, corrige el RUT antes de guardar.");
      return;
    }
    
    
    let rutFinal = userData.rut;
    if (!userData.rut.includes('-')) {
      if (validarRut(userData.rut)) {
        rutFinal = formatearRut(userData.rut);
        setUserData(prev => ({ ...prev, rut: rutFinal }));
      } else {
        setRutError('El RUT es inválido.');
        setError("Por favor, corrige el RUT antes de guardar.");
        return;
      }
    }

   
    if (userData.telefono && userData.telefono.length !== 9) {
      setError("El teléfono debe tener 9 dígitos.");
      return;
    }

    
    const dataParaEnviar = { ...userData, rut: rutFinal };

    try {
      if (isEditMode) {
        await apiClient.put(`/users/${id}/`, dataParaEnviar);
      } else {
        await apiClient.post('/users/create/', dataParaEnviar);
      }
      navigate('/usuarios');
    } catch (err) {
      
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          const messages = Object.entries(errorData).map(([key, value]) => {
            const errorMsg = Array.isArray(value) ? value.join(', ') : String(value);
            const friendlyKey = key.charAt(0).toUpperCase() + key.slice(1);
            return `${friendlyKey}: ${errorMsg}`;
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
              <input 
                type="text" 
                name="first_name" 
                id="first_name" 
                value={userData.first_name} 
                onChange={handleChange} 
                maxLength={20}
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="last_name">Apellidos</label>
              <input 
                type="text" 
                name="last_name" 
                id="last_name" 
                value={userData.last_name} 
                onChange={handleChange} 
                maxLength={20} 
              />
            </div>

            
            <div className={styles.formField}>
              <label htmlFor="rut">RUT</label>
              <input 
                type="text" 
                name="rut" 
                id="rut" 
                value={userData.rut} 
                onChange={handleChange} 
                onBlur={handleRutBlur}  
                required 
                placeholder="Ej: 123456789 (sin puntos ni guion)"
                maxLength={isEditMode || userData.rut.includes('-') ? 12 : 9} 
                disabled={isEditMode}
              />
              
              {rutError && <p className={styles.fieldError}>{rutError}</p>}
            </div>
            
            <div className={styles.formField}>
              <label htmlFor="telefono">Teléfono</label>
              <input 
                type="tel" 
                name="telefono" 
                id="telefono" 
                value={userData.telefono} 
                onChange={handleChange} 
                placeholder="Ej: 912345678"
                maxLength={9} 
              />
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
                <option>Administrativo</option>
                <option>Control Llaves</option>
                <option>Repuestos</option>
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