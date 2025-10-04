// src/pages/DetalleOrden.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axios.js';
import { useUserStore } from '../store/authStore.js';
import styles from '../css/detalleorden.module.css';
import { Wrench, User, Tag, Calendar, CheckCircle, Image as ImageIcon } from 'lucide-react';

const ESTADOS_DISPONIBLES = ['En Diagnostico', 'En Proceso', 'Pausado', 'Finalizado'];

export default function DetalleOrden() {
    const { id } = useParams();
    const { user } = useUserStore();

    const [orden, setOrden] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- CAMBIO 1: Nuevos estados para la interactividad ---
    const [mecanicos, setMecanicos] = useState([]);
    const [diagnostico, setDiagnostico] = useState('');
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [motivo, setMotivo] = useState('');

    // --- CAMBIO 2: useEffect ahora carga la orden Y la lista de mecánicos ---
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [ordenRes, mecanicosRes] = await Promise.all([
                    apiClient.get(`/ordenes/${id}/`),
                    apiClient.get('/mecanicos/')
                ]);

                setOrden(ordenRes.data);
                setMecanicos(mecanicosRes.data);
                
                // Inicializar estados del formulario con los datos de la orden
                setDiagnostico(ordenRes.data.diagnostico_tecnico || '');
                setNuevoEstado(ordenRes.data.estado);

            } catch (err) {
                setError('No se pudo cargar la información necesaria.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, [id]);
    
    // --- CAMBIO 3: Nuevas funciones para guardar los cambios ---
    const handleEstadoSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await apiClient.post(`/ordenes/${id}/cambiar-estado/`, {
                estado: nuevoEstado,
                motivo: motivo,
            });
            setOrden(response.data);
            setMotivo('');
            alert('¡Estado actualizado con éxito!');
        } catch (err) {
            setError(err.response?.data?.error || 'Ocurrió un error al actualizar el estado.');
        }
    };

    const handleSaveDiagnostico = async () => {
        try {
            const response = await apiClient.patch(`/ordenes/${id}/`, {
                diagnostico_tecnico: diagnostico
            });
            setOrden(response.data);
            alert('Diagnóstico guardado con éxito.');
        } catch {
            alert('Error al guardar el diagnóstico.');
        }
    };

    const handleAssignMecanico = async (e) => {
        const mecanicoId = e.target.value;
        try {
            const response = await apiClient.patch(`/ordenes/${id}/`, {
                usuario_asignado: mecanicoId
            });
            setOrden(response.data);
            alert('Mecánico asignado con éxito.');
        } catch {
            alert('Error al asignar el mecánico.');
        }
    };

    if (isLoading) return <p className={styles.loading}>Cargando detalle de la orden...</p>;
    if (error && !orden) return <p className={styles.error}>{error}</p>;

    const puedeCambiarEstado = user.rol === 'Supervisor' || user.rol === 'Mecanico';
    const esSupervisor = user.rol === 'Supervisor';

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1>Detalle de la Orden #{orden?.id}</h1>
                <p>Vehículo: <strong>{orden?.vehiculo_info}</strong></p>
            </header>

            <div className={styles.gridContainer}>
                <div className={styles.mainContent}>
                    
                    {/* --- CAMBIO 4: Mostrar la imagen de la avería si existe --- */}
                    {orden?.imagen_averia_url && (
                        <div className={styles.infoCard}>
                            <h3><ImageIcon /> Imagen de la Avería</h3>
                            <a href={orden.imagen_averia_url} target="_blank" rel="noopener noreferrer">
                                <img src={orden.imagen_averia_url} alt="Avería reportada" className={styles.averiaImage} />
                            </a>
                        </div>
                    )}

                    <div className={styles.infoCard}>
                        <h3><Wrench /> Falla y Diagnóstico</h3>
                        <div className={styles.infoField}>
                            <label>Descripción del Cliente</label>
                            <p>{orden?.descripcion_falla}</p>
                        </div>
                        <div className={styles.infoField}>
                            <label>Diagnóstico Técnico</label>
                            {/* --- CAMBIO 5: Textarea funcional y botón de guardar --- */}
                            <textarea
                                value={diagnostico}
                                onChange={(e) => setDiagnostico(e.target.value)}
                                placeholder="Añadir diagnóstico técnico..."
                                className={styles.textArea}
                                disabled={!puedeCambiarEstado}
                            />
                            {puedeCambiarEstado && (
                                <button onClick={handleSaveDiagnostico} className={styles.saveButton}>Guardar Diagnóstico</button>
                            )}
                        </div>
                    </div>
                </div>

                <aside className={styles.sidebar}>
                    <div className={`${styles.infoCard} ${styles.statusCard}`}>
                        <h3><Tag /> Estado Actual</h3>
                        <div className={`${styles.statusBadge} ${styles[orden?.estado.toLowerCase().replace(/\s/g, '')]}`}>
                            {orden?.estado}
                        </div>
                        <hr />
                        {puedeCambiarEstado ? (
                            <form onSubmit={handleEstadoSubmit}>
                                {/* ... (formulario de cambio de estado se queda igual) ... */}
                            </form>
                        ) : (
                            <p>No tienes permisos para cambiar el estado.</p>
                        )}
                    </div>

                    <div className={styles.infoCard}>
                        <h3><User /> Asignación</h3>
                        {/* --- CAMBIO 6: Menú desplegable para asignar mecánico --- */}
                        {esSupervisor ? (
                            <select
                                value={orden?.usuario_asignado || ''}
                                onChange={handleAssignMecanico}
                                className={styles.mecanicoSelect}
                            >
                                <option value="">-- Asignar a un mecánico --</option>
                                {mecanicos.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.first_name} {m.last_name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p>{orden?.asignado_a}</p>
                        )}
                        <hr />
                        <h3><Calendar /> Fechas Clave</h3>
                        <div className={styles.dateField}>
                            <span>Ingreso:</span>
                            <strong>{new Date(orden?.fecha_ingreso).toLocaleString('es-CL')}</strong>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}