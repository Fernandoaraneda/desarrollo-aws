import React from 'react';
import styles from '/src/css/confirmmodal.module.css';
// 👇 Se importa el icono para la acción de "activar"
import { AlertTriangle, CheckCircle } from 'lucide-react';

// 👇 Se añaden props nuevas: 'confirmButtonText' e 'intent' para cambiar el estilo
export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmButtonText, intent = 'danger' }) {
  if (!isOpen) {
    return null;
  }

  // Lógica para cambiar el estilo según la intención (peligro o éxito)
  const isDanger = intent === 'danger';
  const iconStyle = isDanger ? styles.iconWrapperDanger : styles.iconWrapperSuccess;
  const buttonStyle = isDanger ? styles.confirmButtonDanger : styles.confirmButtonSuccess;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.iconWrapper} ${iconStyle}`}>
          {isDanger ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
        </div>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancelar
          </button>
          <button className={`${styles.confirmButton} ${buttonStyle}`} onClick={onConfirm}>
            {confirmButtonText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

