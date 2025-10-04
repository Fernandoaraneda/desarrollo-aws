// src/pages/PanelSupervisor.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Se añade useNavigate
import apiClient from '/src/api/axios.js';
import styles from '/src/css/gestionagenda.module.css';
import { Check, CalendarCheck } from 'lucide-react';

export default function PanelSupervisor() {
    const [agendamientos, setAgendamientos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate(); // Se inicializa para la redirección

    useEffect(() => {
        // La carga de datos ahora solo necesita los agendamientos
        const loadAgendamientos = async () => {
            try {
                const agendamientosRes = await apiClient.get('/agendamientos/');
                setAgendamientos(agendamientosRes.data.results || agendamientosRes.data || []);
            } catch (err) {
                setError("No se pudieron cargar las citas.");
            } finally {
                setIsLoading(false);
            }
        };
        loadAgendamientos();
    }, []);

    const citasPorConfirmar = useMemo(() => {
        return agendamientos.filter(a => a.estado === 'Programado');
    }, [agendamientos]);

    if (isLoading) return <p>Cargando...</p>;
    if (error) return <p style={{color: 'red'}}>{error}</p>;

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><CalendarCheck size={32} /> Panel de Citas por Confirmar</h1>
            </header>
            <div className={styles.tableCard}>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Fecha y Hora</th>
                                <th>Patente</th>
                                <th>Chofer</th>
                                <th>Motivo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {citasPorConfirmar.length > 0 ? (
                                citasPorConfirmar.map(a => (
                                    <tr key={a.id}>
                                        <td>{new Date(a.fecha_hora_programada).toLocaleString('es-CL')}</td>
                                        <td>{a.vehiculo_patente}</td>
                                        <td>{a.chofer_nombre}</td>
                                        <td>{a.motivo_ingreso}</td>
                                        <td>
                                            {/* El botón ahora redirige a la nueva página */}
                                            <button 
                                                className={styles.actionButton}
                                                onClick={() => navigate(`/agenda/confirmar/${a.id}`)}
                                            >
                                                <Check size={16} /> Confirmar y Asignar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>No hay citas nuevas por confirmar.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
    );
}