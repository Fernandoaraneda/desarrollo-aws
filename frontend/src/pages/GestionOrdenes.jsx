// src/pages/GestionOrdenes.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios.js';
import styles from '../css/GestionOrdenes.module.css'; // Usaremos un nuevo CSS para el modal
import { Wrench, Eye, Edit } from 'lucide-react';

// --- Componente Modal para cambiar el estado ---
const ModalCambiarEstado = ({ orden, onClose, onSave }) => {
    const [nuevoEstado, setNuevoEstado] = useState(orden.estado);
    const [motivo, setMotivo] = useState('');

    // Estos son los estados definidos en tu modelo de Django `Orden.Estado`
    const estadosPosibles = [
        'Ingresado',
        'En Diagnostico',
        'En Proceso',
        'Pausado',
        'Finalizado'
    ];

    const handleGuardar = async () => {
        try {
            await apiClient.post(`/ordenes/${orden.id}/cambiar-estado/`, {
                estado: nuevoEstado,
                motivo: motivo,
            });
            onSave(orden.id, nuevoEstado); // Llama a la función onSave para actualizar el estado en la tabla
            onClose(); // Cierra el modal
        } catch (error) {
            console.error("Error al cambiar el estado", error);
            alert("No se pudo actualizar el estado. Inténtalo de nuevo.");
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>Cambiar Estado de la Orden #{orden.id}</h2>
                <p><strong>Vehículo:</strong> {orden.vehiculo_info}</p>
                <div className={styles.formField}>
                    <label htmlFor="estado">Nuevo Estado</label>
                    <select id="estado" value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)}>
                        {estadosPosibles.map(est => (
                            <option key={est} value={est}>{est.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                </div>
                <div className={styles.formField}>
                    <label htmlFor="motivo">Motivo del Cambio (Opcional)</label>
                    <textarea 
                        id="motivo" 
                        rows="3" 
                        value={motivo} 
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Ej: Se inicia revisión de inyectores."
                    ></textarea>
                </div>
                <div className={styles.modalActions}>
                    <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
                    <button onClick={handleGuardar} className={styles.saveButton}>Guardar Cambio</button>
                </div>
            </div>
        </div>
    );
};


// --- Componente Principal de la Página ---
export default function GestionOrdenes() {
    const [ordenes, setOrdenes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrdenes = async () => {
            try {
                const response = await apiClient.get('/ordenes/');
                setOrdenes(response.data.results || response.data || []);
            } catch (err) {
                setError("No se pudieron cargar las órdenes de servicio.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrdenes();
    }, []);

    const handleEstadoActualizado = (ordenId, nuevoEstado) => {
        // Actualiza la lista de órdenes localmente para reflejar el cambio al instante
        setOrdenes(prevOrdenes =>
            prevOrdenes.map(o =>
                o.id === ordenId ? { ...o, estado: nuevoEstado } : o
            )
        );
    };

    if (isLoading) return <p>Cargando órdenes de servicio...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><Wrench size={32} /> Órdenes de Servicio</h1>
                <p>Aquí puedes ver y gestionar las órdenes de trabajo asignadas.</p>
            </header>
            <div className={styles.tableCard}>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th># Orden</th>
                                <th>Patente</th>
                                <th>Fecha Ingreso</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordenes.length > 0 ? (
                                ordenes.map(orden => (
                                    <tr key={orden.id}>
                                        <td>{orden.id}</td>
                                        <td>{orden.vehiculo_info.split(' ')[0]}</td>
                                        <td>{new Date(orden.fecha_ingreso).toLocaleDateString('es-CL')}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles[orden.estado?.toLowerCase().replace(/\s/g, '')] || ''}`}>
                                                {orden.estado}
                                            </span>
                                        </td>
                                        <td className={styles.actionsCell}>
                                            <button onClick={() => navigate(`/ordenes/${orden.id}`)} className={styles.actionButton} title="Ver Detalle">
                                                <Eye size={16} /> Ver Detalle
                                            </button>
                                            <button onClick={() => setOrdenSeleccionada(orden)} className={`${styles.actionButton} ${styles.editButton}`} title="Cambiar Estado">
                                                <Edit size={16} /> Cambiar Estado
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>
                                        No hay órdenes de servicio asignadas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Renderiza el modal si hay una orden seleccionada */}
            {ordenSeleccionada && (
                <ModalCambiarEstado 
                    orden={ordenSeleccionada} 
                    onClose={() => setOrdenSeleccionada(null)}
                    onSave={handleEstadoActualizado}
                />
            )}
        </div>
    );
}