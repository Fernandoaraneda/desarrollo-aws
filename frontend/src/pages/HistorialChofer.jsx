import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios.js';
import styles from '../css/gestionagenda.module.css';
import { History, Eye } from 'lucide-react';

export default function HistorialChofer() {
    const [ordenes, setOrdenes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistorial = async () => {
            try {

                const response = await apiClient.get('/ordenes/');
                const todasLasOrdenes = response.data.results || response.data || [];

                const finalizadas = todasLasOrdenes.filter(o => o.estado === 'Finalizado');

                finalizadas.sort((a, b) => new Date(b.fecha_entrega_real) - new Date(a.fecha_entrega_real));

                setOrdenes(finalizadas);
            } catch (err) {
                setError("No se pudo cargar tu historial de servicios.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistorial();
    }, []);

    if (isLoading) return <p>Cargando historial...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><History size={32} /> Mi Historial de Servicios</h1>
                <p>Aquí puedes ver todas las reparaciones y mantenimientos completados de tus vehículos.</p>
            </header>
            <div className={styles.tableCard}>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th># Orden</th>
                                <th>Vehículo</th>
                                <th>Fecha Finalización</th>
                                <th>Motivo del Ingreso</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordenes.length > 0 ? (
                                ordenes.map(orden => (
                                    <tr key={orden.id}>
                                        <td>{orden.id}</td>
                                        <td>{orden.vehiculo_info}</td>
                                        <td>
                                            {orden.fecha_entrega_real
                                                ? new Date(orden.fecha_entrega_real).toLocaleDateString('es-CL')
                                                : 'Fecha no registrada'
                                            }
                                        </td>
                                        <td>{orden.descripcion_falla}</td>
                                        <td>
                                            <button
                                                className={styles.actionButton}
                                                onClick={() => navigate(`/ordenes/${orden.id}`)}
                                                title="Ver Detalle de la Orden"
                                            >
                                                <Eye size={16} /> Ver Detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>
                                        No tienes órdenes finalizadas en tu historial.
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