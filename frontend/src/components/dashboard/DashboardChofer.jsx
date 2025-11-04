import React, { useState, useEffect } from 'react';
import apiClient from '../../api/axios.js';
import styles from '../../css/dashboardchofer.module.css';
import { Truck, Wrench, Clock } from 'lucide-react';

const StatusCard = ({ orden }) => {
    const estados = ['Ingresado', 'En Diagnostico', 'En Proceso', 'Pausado', 'Finalizado'];
    const estadoActualIndex = estados.indexOf(orden.estado);

    return (
        <div className={styles.statusCard}>
            <div className={styles.cardHeader}>
                <Truck />
                <h3>{orden.vehiculo_info}</h3>
            </div>
            <div className={styles.cardBody}>
                <h4>Motivo de Ingreso:</h4>
                <p>{orden.descripcion_falla}</p>
            </div>
            <div className={styles.timeline}>
                {estados.map((estado, index) => (
                    <div key={estado} className={`${styles.timelineStep} ${index <= estadoActualIndex ? styles.completed : ''}`}>
                        <div className={styles.timelineDot}></div>
                        <div className={styles.timelineLabel}>{estado.replace(/_/g, ' ')}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function DashboardChofer() {
    const [ordenesActivas, setOrdenesActivas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOrdenes = async () => {
            try {
                
                const response = await apiClient.get('/ordenes/');
                const activas = (response.data.results || response.data).filter(o => o.estado !== 'Finalizado');
                setOrdenesActivas(activas);
            } catch (err) {
                setError('No se pudo cargar el estado de tus vehículos.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrdenes();
    }, []);

    if (isLoading) return <p>Cargando estado de vehículos...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div>
            <h1 className={styles.mainTitle}>Estado de Mis Vehículos en Taller</h1>
            {ordenesActivas.length > 0 ? (
                <div className={styles.cardsContainer}>
                    {ordenesActivas.map(orden => (
                        <StatusCard key={orden.id} orden={orden} />
                    ))}
                </div>
            ) : (
                <div className={styles.noVehiclesMessage}>
                    <Wrench size={48} className="text-gray-400" />
                    <h2>¡Todo en orden!</h2>
                    <p>Ninguno de tus vehículos se encuentra actualmente en el taller.</p>
                </div>
            )}
        </div>
    );
}