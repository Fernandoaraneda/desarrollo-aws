import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import styles from '../css/gestionordenes.module.css';
import { Wrench, PlusCircle } from 'lucide-react';

export default function GestionOrdenes() {
    const [ordenes, setOrdenes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrdenes = async () => {
            try {
                const response = await apiClient.get('/ordenes/');
                setOrdenes(response.data);
            } catch (err) {
                setError('No se pudieron cargar las órdenes de servicio.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrdenes();
    }, []);

    if (isLoading) return <p className={styles.loading}>Cargando órdenes...</p>;
    if (error) return <p className={styles.error}>{error}</p>;

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><Wrench /> Órdenes de Servicio</h1>
                <button 
                    className={styles.createButton}
                    // Aquí podrías navegar a una ruta para crear una nueva orden si fuera necesario
                    // onClick={() => navigate('/ordenes/crear')}
                >
                    <PlusCircle size={20} /> Nueva Orden
                </button>
            </header>

            <div className={styles.tableCard}>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ID Orden</th>
                                <th>Vehículo</th>
                                <th>Estado</th>
                                <th>Asignado a</th>
                                <th>Fecha Ingreso</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordenes.map((orden) => (
                                <tr key={orden.id}>
                                    <td>#{orden.id}</td>
                                    <td>{orden.vehiculo_info}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[orden.estado.toLowerCase().replace(/\s/g, '')]}`}>
                                            {orden.estado}
                                        </span>
                                    </td>
                                    <td>{orden.asignado_a}</td>
                                    <td>{new Date(orden.fecha_ingreso).toLocaleDateString('es-CL')}</td>
                                    <td>
                                        <button 
                                            className={styles.actionButton}
                                            onClick={() => navigate(`/ordenes/${orden.id}`)}
                                        >
                                            Ver Detalle
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
