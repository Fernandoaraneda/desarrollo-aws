import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios.js';
import styles from '../../css/mecanicodashboard.module.css';
import { Wrench, Clock, CalendarCheck } from 'lucide-react';

const KpiCard = ({ title, value, icon }) => (
    <div className={styles.kpiCard}>
        <div className={styles.cardIcon}>{icon}</div>
        <div>
            <p className={styles.kpiValue}>{value}</p>
            <p className={styles.kpiTitle}>{title}</p>
        </div>
    </div>
);

const TaskCard = ({ orden }) => {
    const navigate = useNavigate();
    return (
        <div className={styles.taskCard} onClick={() => navigate(`/ordenes/${orden.id}`)}>
            <div className={styles.cardHeader}>
                <span className={styles.patente}>{orden.vehiculo_info.split(' - ')[0]}</span>
                <span className={`${styles.statusBadge} ${styles[orden.estado.toLowerCase().replace(/\s/g, '')] || ''}`}>
                    {orden.estado}
                </span>
            </div>
            <p className={styles.descripcionFalla}>{orden.descripcion_falla}</p>
            <div className={styles.cardFooter}>
                <span>Orden #{orden.id}</span>
                <span>Ingreso: {new Date(orden.fecha_ingreso).toLocaleDateString('es-CL')}</span>
            </div>
        </div>
    );
};

export default function DashboardMecanico() {
    const [dashboardData, setDashboardData] = useState({ kpis: {}, tareas: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await apiClient.get('/dashboard/mecanico/stats/');
                setDashboardData(response.data);
            } catch (err) {
                setError('No se pudo cargar la información del panel.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (isLoading) return <p>Cargando panel del mecánico...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    const { kpis, tareas } = dashboardData;

    return (
        <div className={styles.pageWrapper}>
            <h1 className={styles.mainTitle}>Mi Panel de Trabajo</h1>
            
          
            <div className={styles.kpiGrid}>
                <KpiCard title="Órdenes Activas" value={kpis.ordenesActivas} icon={<Wrench />} />
                <KpiCard title="Próximas Asignaciones" value={kpis.proximasAsignaciones} icon={<CalendarCheck />} />
            </div>

            <h2 className={styles.sectionTitle}>Mis Tareas Actuales</h2>
            {tareas.length > 0 ? (
                <div className={styles.tasksGrid}>
                    {tareas.map(orden => (
                        <TaskCard key={orden.id} orden={orden} />
                    ))}
                </div>
            ) : (
                <p className={styles.noTasksMessage}>¡Buen trabajo! No tienes ninguna tarea activa en este momento.</p>
            )}
        </div>
    );
}