// src/pages/ProximasCitas.jsx

import React, { useState, useEffect } from 'react';
import apiClient from '../api/axios.js';
import styles from '../css/gestionagenda.module.css'; // Reutilizamos los estilos existentes
import { CalendarClock } from 'lucide-react';

export default function ProximasCitas() {
    const [proximasCitas, setProximasCitas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProximasCitas = async () => {
            try {
                // 1. Llamamos al nuevo endpoint que crearemos en el backend
                const response = await apiClient.get('/mecanico/proximas-citas/');
                setProximasCitas(response.data.results || response.data || []);
            } catch (err) {
                setError("No se pudieron cargar tus próximas asignaciones.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProximasCitas();
    }, []);

    if (isLoading) return <p>Cargando próximas asignaciones...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><CalendarClock size={32} /> Próximas Asignaciones</h1>
                <p>Estas son las citas que te han sido asignadas y están pendientes de llegar al taller.</p>
            </header>
            <div className={styles.tableCard}>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Fecha Programada</th>
                                <th>Patente</th>
                                <th>Chofer</th>
                                <th>Motivo de Ingreso</th>
                                <th>Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proximasCitas.length > 0 ? (
                                proximasCitas.map(cita => (
                                    <tr key={cita.id}>
                                        <td>{new Date(cita.fecha_hora_programada).toLocaleString('es-CL')}</td>
                                        <td>{cita.vehiculo_patente}</td>
                                        <td>{cita.chofer_nombre}</td>
                                        <td>{cita.motivo_ingreso}</td>
                                        <td>
                                            {/* Mostramos una alerta visual si se requiere grúa */}
                                            {cita.solicita_grua ? 
                                                <span style={{ color: '#f97316', fontWeight: 'bold' }}>⚠️ Requiere Grúa</span> 
                                                : '---'
                                            }
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>
                                        No tienes próximas citas asignadas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}