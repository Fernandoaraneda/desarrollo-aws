import React, { useState, useEffect } from 'react';
import apiClient from '/src/api/axios.js';
import { Loader2, AlertTriangle } from 'lucide-react';


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
       
        const response = await apiClient.get(src, {
          responseType: 'blob',
        });

  
        objectUrl = URL.createObjectURL(response.data);
        setImageUrl(objectUrl);
        setStatus('success');
      } catch (err) {
        console.error("Error al cargar imagen autenticada:", err);
        setStatus('error');
      }
    };

    fetchImage();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]); 
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


  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
    />
  );
}


const styles = {
  placeholderBase: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    border: '1px dashed #d1d5db',
    borderRadius: '8px',
    minHeight: '150px',
    gap: '0.5rem',
    fontFamily: 'sans-serif',
  },
  loadingPlaceholder: {
    color: '#6b7280', 
  },
  errorPlaceholder: {
    color: '#ef4444',
  }
};

export default AuthenticatedImage;