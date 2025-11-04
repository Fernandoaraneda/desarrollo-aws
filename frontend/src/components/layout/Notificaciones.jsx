import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import styles from '../../css/notificaciones.module.css';
import { Bell } from 'lucide-react';

export default function Notificaciones() {
    const [notificaciones, setNotificaciones] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const unreadCount = notificaciones.filter(n => !n.leida).length;

    useEffect(() => {
       
        const fetchNotificaciones = async () => {
            try {
                const response = await apiClient.get('/notificaciones/');
                setNotificaciones(response.data.results || response.data);
            } catch (error) {
                console.error("Error al cargar notificaciones:", error);
            }
        };

        fetchNotificaciones();
        const interval = setInterval(fetchNotificaciones, 30000); 

        return () => clearInterval(interval);
    }, []);

    const handleToggle = async () => {
        setIsOpen(!isOpen);
       
        if (unreadCount > 0 && !isOpen) {
            try {
                await apiClient.post('/notificaciones/marcar-como-leidas/');
               
                setNotificaciones(notificaciones.map(n => ({ ...n, leida: true })));
            } catch (error) {
                console.error("Error al marcar notificaciones como leídas:", error);
            }
        }
    };

    const handleNotificationClick = (link) => {
        setIsOpen(false);
        navigate(link);
    };

    return (
        <div className={styles.notificationWrapper}>
            <button onClick={handleToggle} className={styles.bellButton}>
                <Bell />
                {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>Notificaciones</div>
                    {notificaciones.length > 0 ? (
                        <ul className={styles.notificationList}>
                            {notificaciones.map(n => (
                                <li key={n.id} className={!n.leida ? styles.unread : ''} onClick={() => handleNotificationClick(n.link)}>
                                    <p>{n.mensaje}</p>
                                    <small>{new Date(n.fecha).toLocaleString('es-CL')}</small>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className={styles.noNotifications}>No hay notificaciones.</div>
                    )}
                </div>
            )}
        </div>
    );
}