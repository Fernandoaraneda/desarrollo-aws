import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axios.js';
import { useUserStore } from '../store/authStore.js';
import styles from '../css/detalleorden.module.css';
import { Truck, Wrench, User, Tag, Calendar, CheckCircle } from 'lucide-react';

// Opciones de estado que puede seleccionar el usuario
const ESTADOS_DISPONIBLES = [
    'En Diagnostico',
    'En Proceso',
    'Pausado',
    'Finalizado',
];

export default function DetalleOrden() {
    const { id } = useParams(); // Obtiene el ID de la orden desde la URL
    const { user } = useUserStore(); // Obtiene el usuario actual

    const [orden, setOrden] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [motivo, setMotivo] = useState('');

    useEffect(() => {
        const fetchOrden = async () => {
            try {
                const response = await apiClient.get(`/ordenes/${id}/`);
                setOrden(response.data);
                setNuevoEstado(response.data.estado); // Inicializa el select con el estado actual
            } catch (err) {
                setError('No se pudo cargar la información de la orden.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrden();
    }, [id]);

    const handleEstadoSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const response = await apiClient.post(`/ordenes/${id}/cambiar-estado/`, {
                estado: nuevoEstado,
                motivo: motivo,
            });
            setOrden(response.data); // Actualiza la orden con la respuesta del servidor
            setMotivo(''); // Limpia el campo de motivo
            alert('¡Estado actualizado con éxito!');
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Ocurrió un error al actualizar el estado.';
            setError(errorMsg);
        }
    };

    if (isLoading) return <p className={styles.loading}>Cargando detalle de la orden...</p>;
    if (error && !orden) return <p className={styles.error}>{error}</p>;

    // Determina si el usuario actual puede cambiar el estado
    const puedeCambiarEstado = user.rol === 'Supervisor' || user.rol === 'Mecanico';

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1>Detalle de la Orden #{orden?.id}</h1>
                <p>Vehículo: <strong>{orden?.vehiculo_info}</strong></p>
            </header>

            <div className={styles.gridContainer}>
                {/* Columna principal de información */}
                <div className={styles.mainContent}>
                    <div className={styles.infoCard}>
                        <h3><Wrench /> Falla y Diagnóstico</h3>
                        <div className={styles.infoField}>
                            <label>Descripción del Cliente</label>
                            <p>{orden?.descripcion_falla}</p>
                        </div>
                        <div className={styles.infoField}>
                            <label>Diagnóstico Técnico</label>
                            <textarea
                                defaultValue={orden?.diagnostico_tecnico || ''}
                                placeholder="Añadir diagnóstico técnico..."
                                className={styles.textArea}
                                // Aquí se podría añadir una función para guardar el diagnóstico
                            />
                        </div>
                    </div>
                    {/* Aquí irá el componente de Timeline en el Día 13 */}
                </div>

                {/* Columna lateral de estado y acciones */}
                <aside className={styles.sidebar}>
                    <div className={`${styles.infoCard} ${styles.statusCard}`}>
                        <h3><Tag /> Estado Actual</h3>
                        <div className={`${styles.statusBadge} ${styles[orden?.estado.toLowerCase().replace(/\s/g, '')]}`}>
                            {orden?.estado}
                        </div>
                        <hr />
                        {puedeCambiarEstado ? (
                            <form onSubmit={handleEstadoSubmit}>
                                <div className={styles.infoField}>
                                    <label>Cambiar Estado a:</label>
                                    <select
                                        value={nuevoEstado}
                                        onChange={(e) => setNuevoEstado(e.target.value)}
                                        className={styles.statusSelect}
                                    >
                                        {ESTADOS_DISPONIBLES.map(est => (
                                            <option key={est} value={est}>{est.replace('Diagnostico', 'Diagnóstico')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.infoField}>
                                    <label>Motivo del cambio (opcional)</label>
                                    <input 
                                        type="text"
                                        value={motivo}
                                        onChange={(e) => setMotivo(e.target.value)}
                                        placeholder="Ej: A la espera de repuestos"
                                        className={styles.motivoInput}
                                    />
                                </div>
                                {error && <p className={styles.error}>{error}</p>}
                                <button type="submit" className={styles.submitButton}>
                                    <CheckCircle size={18} /> Actualizar Estado
                                </button>
                            </form>
                        ) : (
                            <p>No tienes permisos para cambiar el estado.</p>
                        )}
                    </div>

                    <div className={styles.infoCard}>
                        <h3><User /> Asignación</h3>
                        <p>{orden?.asignado_a}</p>
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

