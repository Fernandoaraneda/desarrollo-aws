
import React from 'react';
import styles from '/src/css/confirmmodal.module.css'; 
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function AlertModal({ isOpen, onClose, title, message, intent = 'danger' }) {
  if (!isOpen) {
    return null;
  }

  const isDanger = intent === 'danger';
  const icon = isDanger ? <AlertTriangle size={24} /> : <CheckCircle size={24} />;
  const iconStyle = isDanger ? styles.iconWrapperDanger : styles.iconWrapperSuccess;
  const buttonStyle = isDanger ? styles.confirmButtonDanger : styles.confirmButtonSuccess;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.iconWrapper} ${iconStyle}`}>
          {icon}
        </div>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className={styles.modalActions}>
          {/* Un solo botón */}
          <button className={`${styles.confirmButton} ${buttonStyle}`} onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}