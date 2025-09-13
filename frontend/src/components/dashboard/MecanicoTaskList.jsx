import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios.js';
import { useUserStore } from '../../store/authStore.js';
import styles from '../../css/mecanicotasklist.module.css';
import { Wrench, Clock, AlertTriangle } from 'lucide-react';

// Tarjeta individual para cada tarea/orden
const TaskCard = ({ orden }) => {
    const navigate = useNavigate();
    
    // Objeto para mapear estados a colores y textos
    const statusInfo = {
        'En Diagnostico': { style: styles.diagnostico, icon: <Clock size={16} /> },
        'En Proceso': { style: styles.enproceso, icon: <Wrench size={16} /> },
        'Pausado': { style: styles.pausado, icon: <AlertTriangle size={16} /> },
        // Puedes añadir más estados si es necesario
    };

    const currentStatus = statusInfo[orden.estado] || {};

    return (
        <div className={styles.taskCard} onClick={() => navigate(`/ordenes/${orden.id}`)}>
            <div className={styles.cardHeader}>
                <span className={styles.patente}>{orden.vehiculo_info.split(' - ')[0]}</span>
                <span className={`${styles.statusBadge} ${currentStatus.style}`}>
                    {currentStatus.icon} {orden.estado}
                </span>
            </div>
            <div className={styles.cardBody}>
                <p className={styles.vehiculoNombre}>{orden.vehiculo_info.split(' - ')[1]}</p>
                <p className={styles.descripcionFalla}>{orden.descripcion_falla}</p>
            </div>
            <div className={styles.cardFooter}>
                <span>Orden #{orden.id}</span>
                <span>Ingreso: {new Date(orden.fecha_ingreso).toLocaleDateString('es-CL')}</span>
            </div>
        </div>
    );
};

// Componente principal que muestra la lista de tareas
export default function MecanicoTaskList() {
    const { user } = useUserStore();
    const [assignedTasks, setAssignedTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) return;

        const fetchTasks = async () => {
            try {
                const response = await apiClient.get('/ordenes/');
                // Filtramos las órdenes para mostrar solo las asignadas al usuario actual y que no estén finalizadas
                const tasks = response.data.filter(orden => 
                    orden.usuario_asignado === user.id && orden.estado !== 'Finalizado'
                );
                setAssignedTasks(tasks);
            } catch (err) {
                setError('No se pudieron cargar las tareas asignadas.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTasks();
    }, [user]);

    if (isLoading) return <p>Cargando tareas...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div>
            <h2 className={styles.mainTitle}>Mis Tareas Pendientes</h2>
            {assignedTasks.length > 0 ? (
                <div className={styles.tasksGrid}>
                    {assignedTasks.map(orden => (
                        <TaskCard key={orden.id} orden={orden} />
                    ))}
                </div>
            ) : (
                <p className={styles.noTasksMessage}>No tienes ninguna tarea asignada en este momento.</p>
            )}
        </div>
    );
}

