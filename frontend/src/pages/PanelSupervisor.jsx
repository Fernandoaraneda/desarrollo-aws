import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '/src/api/axios.js';
import styles from '../css/gestionagenda.module.css'; 
import { Check, Edit, CalendarCheck } from 'lucide-react'; 

export default function PanelSupervisor() {
    const [agendamientos, setAgendamientos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadAgendamientos = async () => {
            try {
                
                const res = await apiClient.get('/agendamientos/?estado__ne=Finalizado&estado__ne=Cancelado');
                setAgendamientos(res.data.results || res.data || []);
            } catch (err) {
                setError("No se pudieron cargar las citas.");
            } finally {
                setIsLoading(false);
            }
        };
        loadAgendamientos();
    }, []);

 
    const { citasPorConfirmar, citasConfirmadas } = useMemo(() => {
        const porConfirmar = agendamientos.filter(a => a.estado === 'Programado');
        const confirmadas = agendamientos.filter(a => a.estado === 'Confirmado');
        return { citasPorConfirmar: porConfirmar, citasConfirmadas: confirmadas };
    }, [agendamientos]);

    if (isLoading) return <p>Cargando...</p>;
    if (error) return <p style={{color: 'red'}}>{error}</p>;

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><CalendarCheck size={32} /> Panel de Citas</h1>
            </header>

            <div className={styles.tableCard}>
                <h2 className={styles.tableTitle}>Solicitudes Pendientes (Por Asignar)</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Fecha Solicitada</th>
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
                                        <td>
                                            {a.fecha_hora_programada 
                                                ? new Date(a.fecha_hora_programada).toLocaleDateString('es-CL') 
                                                : <span style={{ color: '#f97316', fontWeight: 'bold' }}>Sin Asignar Fecha</span>
                                            }
                                        </td>
                                        <td>{a.vehiculo_patente}</td>
                                        <td>{a.chofer_nombre}</td>
                                        <td>{a.motivo_ingreso}</td>
                                        <td>
                                            <button 
                                                className={styles.actionButton}
                                                onClick={() => navigate(`/agenda/confirmar/${a.id}`)}
                                            >
                                                <Check size={16} /> Asignar Cupo
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>No hay solicitudes nuevas por confirmar.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

    
            <div className={styles.tableCard} style={{marginTop: '2rem'}}>
                <h2 className={styles.tableTitle}>Próximas Citas Confirmadas</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Fecha y Hora</th>
                                <th>Patente</th>
                                <th>Chofer</th>
                                <th>Mecánico Asignado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {citasConfirmadas.length > 0 ? (
                                citasConfirmadas.map(a => (
                                    <tr key={a.id}>
                                        <td>{new Date(a.fecha_hora_programada).toLocaleString('es-CL')}</td>
                                        <td>{a.vehiculo_patente}</td>
                                        <td>{a.chofer_nombre}</td>
                                        <td>{a.mecanico_nombre}</td>
                                        <td>
                                            
                                            <button 
                                                className={`${styles.actionButton} ${styles.editButton}`} 
                                                onClick={() => navigate(`/agenda/confirmar/${a.id}`)}
                                            >
                                                <Edit size={16} /> Editar Cita
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>No hay citas confirmadas próximas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

