import React, { useState, useEffect } from 'react';
// --- CORREGIDO: Cambiado a ruta relativa ---
import apiClient from '/src/api/axios.js';
// --- FIN CORREGIDO ---
import { Loader2, AlertTriangle } from 'lucide-react';

/**
 * Este componente obtiene una URL de imagen protegida (que requiere un token JWT)
 * y la muestra. Utiliza apiClient para realizar la solicitud autenticada
 * y luego convierte la respuesta (blob) en una URL de objeto local.
 */
function AuthenticatedImage({ src, alt, className }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!src) {
      setStatus('idle');
      return;
    }

    setStatus('loading');
    let objectUrl = null;

    const fetchImage = async () => {
      try {
        // 1. Solicitar la imagen con apiClient (que añade el token Bearer)
        // Se espera que la respuesta sea un 'blob' (datos binarios de la imagen)
        const response = await apiClient.get(src, {
          responseType: 'blob',
        });

        // 2. Crear una URL local en el navegador para este blob
        objectUrl = URL.createObjectURL(response.data);
        setImageUrl(objectUrl);
        setStatus('success');
      } catch (err) {
        console.error("Error al cargar imagen autenticada:", err);
        setStatus('error');
      }
    };

    fetchImage();

    // 3. Función de limpieza:
    // Cuando el componente se desmonte o 'src' cambie,
    // revocamos la URL del objeto para liberar memoria.
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]); // Se vuelve a ejecutar si la URL de la fuente cambia

  if (status === 'loading') {
    return (
      <div className={`${className} ${styles.placeholderBase}`} style={styles.placeholderBase}>
        <Loader2 className="animate-spin" size={24} style={styles.loadingPlaceholder} />
        <span style={styles.loadingPlaceholder}>Cargando...</span>
      </div>
    );
  }

  if (status === 'error' || !imageUrl) {
    return (
      <div className={`${className} ${styles.placeholderBase}`} style={styles.placeholderBase}>
        <AlertTriangle size={24} style={styles.errorPlaceholder} />
        <span style={styles.errorPlaceholder}>Error</span>
      </div>
    );
  }

  // 4. Mostrar la imagen usando la URL del blob
  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
    />
  );
}

// Estilos básicos para los placeholders (puedes moverlos a un .css)
const styles = {
  placeholderBase: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6', // Gris claro
    border: '1px dashed #d1d5db', // Borde discontinuo
    borderRadius: '8px',
    minHeight: '150px',
    gap: '0.5rem',
    fontFamily: 'sans-serif',
  },
  loadingPlaceholder: {
    color: '#6b7280', // Gris
  },
  errorPlaceholder: {
    color: '#ef4444', // Rojo
  }
};

export default AuthenticatedImage;