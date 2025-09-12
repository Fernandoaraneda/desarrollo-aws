import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios.js';
import styles from '../css/profilepage.module.css'; // ¡Importamos nuestro nuevo CSS!

// Importamos iconos de Lucide para un look más moderno
import { UserCircle2, KeyRound, Save, XCircle, Loader2 } from 'lucide-react';

// Pequeño componente para el spinner de carga
const LoadingSpinner = () => (
  <div className={styles.loadingSpinner}>
    <Loader2 className="animate-spin" size={32} />
    <span className="ml-4">Cargando perfil...</span>
  </div>
);

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await apiClient.get('/users/me/');
        setUserProfile(response.data);
      } catch (err) {
        setError('No se pudo cargar el perfil del usuario. Intenta iniciar sesión de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserProfile();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setFeedback({ message: '', type: '' });

    if (newPassword.length < 8) {
      setFeedback({ message: 'La nueva contraseña debe tener al menos 8 caracteres.', type: 'error' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/users/me/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setFeedback({ message: response.data.message, type: 'success' });
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      const errorData = err.response?.data?.error;
      const errorMessage = Array.isArray(errorData) ? errorData.join(" ") : errorData || 'Ocurrió un error inesperado.';
      setFeedback({ message: errorMessage, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  
  if (error) {
    return <p className={`${styles.message} ${styles.errorMessage}`}>{error}</p>;
  }

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <UserCircle2 size={40} strokeWidth={1.5} />
        <h1>Mi Perfil</h1>
      </header>
      
      {/* Sección de Datos del Usuario */}
      {userProfile && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            <UserCircle2 size={24} />
            Información de la Cuenta
          </h2>
          <div className={styles.infoGrid}>
            <p className={styles.infoItem}><strong>Usuario:</strong> <span>{userProfile.username}</span></p>
            <p className={styles.infoItem}><strong>Nombre:</strong> <span>{userProfile.first_name} {userProfile.last_name}</span></p>
            <p className={styles.infoItem}><strong>Email:</strong> <span>{userProfile.email}</span></p>
            <p className={styles.infoItem}><strong>Rol:</strong> <span>{userProfile.rol}</span></p>
          </div>
        </section>
      )}

      {/* Sección para Cambiar Contraseña */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <KeyRound size={24} />
          Cambiar Contraseña
        </h2>
        <form onSubmit={handleChangePassword} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="old_pass">Contraseña Actual</label>
            <input
              id="old_pass" type="password" value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className={styles.input} required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="new_pass">Nueva Contraseña</label>
            <input
              id="new_pass" type="password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input} placeholder="Mínimo 8 caracteres" required
            />
          </div>
          
          {feedback.message && (
            <div className={`${styles.message} ${feedback.type === 'success' ? styles.successMessage : styles.errorMessage}`}>
              {feedback.message}
            </div>
          )}

          <div className={styles.buttonGroup}>
            <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="animate-spin mr-2" size={20} /> Actualizando...</> : <><Save size={20} className="mr-2"/> Actualizar Contraseña</>}
            </button>
            <Link to="/dashboard" className={`${styles.button} ${styles.buttonSecondary}`}>
              <XCircle size={20} className="mr-2"/> Volver
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}

