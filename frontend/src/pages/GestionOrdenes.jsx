import React, { useState, useEffect, useMemo } from 'react'; // 1. Importar useMemo
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios.js';
import styles from '../css/gestionordenes.module.css';
// 2. Importar estilos del buscador
import searchStyles from '../css/gestionusuarios.module.css';
// 3. Importar icono Search
import { Wrench, Eye, Edit, Search } from 'lucide-react';


const ModalCambiarEstado = ({ orden, onClose, onSave }) => {
    // ...
    // (TU CÓDIGO DEL MODAL VA AQUÍ - SIN CAMBIOS)
    // ...
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



export default function GestionOrdenes() {
    // 'ordenes' guarda la lista COMPLETA
    const [ordenes, setOrdenes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
    const navigate = useNavigate();
    // 4. Añadir estado para el buscador
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // 5. Tu fetchOrdenes original (NO SE TOCA)
        const fetchOrdenes = async () => {
            try {
                const response = await apiClient.get('/ordenes/');
                const todasLasOrdenes = response.data.results || response.data || [];
                const ordenesActivas = todasLasOrdenes.filter(
                    orden => orden.estado !== 'Finalizado'
                );
                setOrdenes(ordenesActivas);
            } catch (err) {
                setError("No se pudieron cargar las órdenes de servicio.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrdenes();
    }, []); // Se ejecuta 1 sola vez

    // 6. LÓGICA DE FILTRADO (igual a GestionUsuarios)
    const filteredOrdenes = useMemo(() => {
        return ordenes.filter(orden =>
            // Filtramos por patente (que está en vehiculo_info)
            (orden.vehiculo_info?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            // Filtramos por ID de orden
            (orden.id.toString() || '').includes(searchTerm.toLowerCase())
        );
    }, [ordenes, searchTerm]); // Se recalcula si 'ordenes' o 'searchTerm' cambian


    const handleEstadoActualizado = (ordenId, nuevoEstado) => {
        // 7. Esta función es clave y NO SE TOCA
        // Cuando marcas como 'Finalizado', debe desaparecer de la lista 'ordenes'
        if (nuevoEstado === 'Finalizado') {
            setOrdenes(prevOrdenes => prevOrdenes.filter(o => o.id !== ordenId));
        } else {
            setOrdenes(prevOrdenes =>
                prevOrdenes.map(o =>
                    o.id === ordenId ? { ...o, estado: nuevoEstado } : o
                )
            );
        }
    };

    if (isLoading) return <p>Cargando órdenes de servicio...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><Wrench size={32} /> Órdenes de Servicio</h1>
                <p>Aquí puedes ver y gestionar las órdenes de trabajo asignadas.</p>
            </header>

            {/* 8. AÑADIR EL BUSCADOR (con los estilos de gestionusuarios) */}
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
                                <th>Patente</th>
                                <th>Fecha Ingreso</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* 9. Mapear sobre la lista FILTRADA */}
                            {filteredOrdenes.length > 0 ? (
                                filteredOrdenes.map(orden => (
                                    < tr key={orden.id} >
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
                                        {searchTerm
                                            ? 'No se encontraron órdenes con esa patente.'
                                            : 'No hay órdenes de servicio asignadas.'
                                        }
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {
                ordenSeleccionada && (
                    <ModalCambiarEstado
                        orden={ordenSeleccionada}
                        onClose={() => setOrdenSeleccionada(null)}
                        onSave={handleEstadoActualizado}
                    />
                )
            }

        </div >
    );
}