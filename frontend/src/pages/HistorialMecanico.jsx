import React, { useState, useEffect, useMemo } from 'react'; // 1. Importar useMemo
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios.js';

// Usamos los mismos estilos que ya tenías
import styles from '../css/gestionagenda.module.css'; // (O gestionordenes.module.css)
import searchStyles from '../css/gestionusuarios.module.css';


import { useUserStore } from '../store/authStore.js'; // 1. Para permisos


import ordenesStyles from '../css/gestionordenes.module.css'; // 2. Para el Modal y botón
import { History, Eye, Search, Edit } from 'lucide-react'; // 3. Icono Edit


const ModalCambiarEstado = ({ orden, onClose, onSave }) => {
    const [nuevoEstado, setNuevoEstado] = useState(orden.estado);
    const [motivo, setMotivo] = useState('');
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
            onSave(orden.id, nuevoEstado);
            onClose();
        } catch (error) {
            console.error("Error al cambiar el estado", error);
            alert("No se pudo actualizar el estado. Inténtalo de nuevo.");
        }
    };

    return (
        <div className={ordenesStyles.modalOverlay}>
            <div className={ordenesStyles.modalContent}>
                <h2>Cambiar Estado de la Orden #{orden.id}</h2>
                <p><strong>Vehículo:</strong> {orden.vehiculo_info}</p>
                <div className={ordenesStyles.formField}>
                    <label htmlFor="estado">Nuevo Estado</label>
                    <select id="estado" value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)}>
                        {estadosPosibles.map(est => (
                            <option key={est} value={est}>{est.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                </div>
                <div className={ordenesStyles.formField}>
                    <label htmlFor="motivo">Motivo del Cambio (Opcional)</label>
                    <textarea
                        id="motivo"
                        rows="3"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Ej: Se re-abre la orden por error de..."
                    ></textarea>
                </div>
                <div className={ordenesStyles.modalActions}>
                    <button onClick={onClose} className={ordenesStyles.cancelButton}>Cancelar</button>
                    <button onClick={handleGuardar} className={ordenesStyles.saveButton}>Guardar Cambio</button>
                </div>
            </div>
        </div>
    );
};

export default function HistorialMecanico() {
    // 'ordenes' ahora guarda LA LISTA COMPLETA
    const [ordenes, setOrdenes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useUserStore();
    const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
    const tienePrivilegiosAdmin = (user.rol === 'Supervisor' || user.rol === 'Administrativo');
    useEffect(() => {
        // 2. Este useEffect ahora corre UNA SOLA VEZ
        const fetchHistorialMecanico = async () => {
            try {
                // --- ESTA ES TU LÓGICA ORIGINAL ---
                const response = await apiClient.get('/ordenes/');
                const todasMisOrdenes = response.data.results || response.data || [];

                // Filtramos las finalizadas AQUÍ
                const finalizadas = todasMisOrdenes.filter(o => o.estado === 'Finalizado');
                // --- FIN DE TU LÓGICA ORIGINAL ---

                finalizadas.sort((a, b) => new Date(b.fecha_entrega_real) - new Date(a.fecha_entrega_real));

                setOrdenes(finalizadas); // Guardamos la lista ya filtrada de 'Finalizado'
            } catch (err) {
                setError("No se pudo cargar tu historial de trabajos.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistorialMecanico();
    }, []); // <-- 3. El array vacío significa: "ejecutar solo al cargar"

    // 4. LÓGICA DE FILTRADO (idéntica a GestionUsuarios.jsx)
    const filteredOrdenes = useMemo(() => {
        return ordenes.filter(orden =>
            // 'ordenes' ya solo contiene las 'Finalizado',
            // así que solo filtramos por el buscador
            (orden.vehiculo_info?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (orden.id.toString() || '').includes(searchTerm.toLowerCase())
        );
    }, [ordenes, searchTerm]);
    const handleEstadoActualizado = (ordenId, nuevoEstado) => {
        // Si el estado YA NO es "Finalizado", la quitamos de esta lista.
        if (nuevoEstado !== 'Finalizado') {
            setOrdenes(prevOrdenes => prevOrdenes.filter(o => o.id !== ordenId));
        } else {
            // Si sigue siendo "Finalizado" (quizás solo cambió el motivo), actualizamos
            setOrdenes(prevOrdenes =>
                prevOrdenes.map(o =>
                    o.id === ordenId ? { ...o, estado: nuevoEstado } : o
                )
            );
        }
    };

    if (isLoading) return <p>Cargando historial...</p>; // Esto solo se ve en la carga inicial
    if (error) return <p style={{ color: 'red' }}>{error}</p>;



    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><History size={32} /> Mi Historial de Trabajos</h1>
                <p>Aquí puedes ver todas las órdenes de servicio que has completado.</p>
            </header>

            {/* 5. El buscador (sin cambios, ya estaba bien) */}
            <div className={searchStyles.controls}>
                <div className={searchStyles.searchBox}>
                    <Search size={20} className={searchStyles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Buscar por Patente o # Orden..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

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
                            {/* 6. Mapeamos sobre la lista FILTRADA */}
                            {filteredOrdenes.length > 0 ? (
                                filteredOrdenes.map(orden => (
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

                
                                        <td className={ordenesStyles.actionsCell}>
                                            <button
                                            
                                                className={ordenesStyles.actionButton}
                                                onClick={() => navigate(`/ordenes/${orden.id}`)}
                                                title="Ver Detalle de la Orden"
                                            >
                                                <Eye size={16} /> Ver Detalle
                                            </button>

                                            {tienePrivilegiosAdmin && (
                                                <button
                                                    onClick={() => setOrdenSeleccionada(orden)}
                                                    className={`${ordenesStyles.actionButton} ${ordenesStyles.editButton}`}
                                                    title="Cambiar Estado"
                                                >
                                                    <Edit size={16} /> Cambiar Estado
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>
                                        {/* 7. Mensaje de "no encontrado" */}
                                        {searchTerm
                                            ? 'No se encontraron órdenes finalizadas con esa patente.'
                                            : 'No tienes órdenes finalizadas en tu historial.'
                                        }
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
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