import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../api/axios.js';
import styles from '../../css/dashboardchofer.module.css'; // Estilos principales
// --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
import detailStyles from '../../css/modalchofer-verdetalle.module.css';
// --- ---
import {
    Truck, Wrench, Clock, X, FileText, User, Calendar,
    Download, ChevronDown, Paperclip, ImageIcon, HardHat
} from 'lucide-react';
import AuthenticatedImage from '../AuthenticatedImage.jsx'; // Importamos el componente de imagen

// --- 1. GRUPO DE DOCUMENTOS (VERSIÓN SIMPLE DE SOLO LECTURA) ---
// (Este componente está perfecto, no necesita cambios)
const DocumentGroupSimple = ({ state, docs }) => {
    const [isOpen, setIsOpen] = useState(true); // Abierto por defecto
    const [downloadingId, setDownloadingId] = useState(null);

    const handleDownload = async (doc) => {
        if (downloadingId === doc.id) return;
        setDownloadingId(doc.id);
        try {
            const response = await apiClient.get(doc.archivo_url, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const fileName = doc.archivo_url.split('/').pop();
            link.setAttribute('download', fileName || doc.descripcion || 'archivo');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error al descargar el archivo:", err);
            alert('No se pudo descargar el archivo.');
        } finally {
            setDownloadingId(null);
        }
    };

    const renderFile = (doc) => {
        const fileUrl = doc.archivo_url;
        if (!fileUrl) return <p>Archivo no encontrado.</p>;
        const tipo = (doc.tipo || '').toLowerCase();
        const isImage = tipo.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);

        if (isImage) {
            return (
                <AuthenticatedImage
                    src={fileUrl}
                    alt={doc.descripcion || 'Imagen'}
                    className={detailStyles.imagePreview} // Usamos el estilo del detalle
                />
            );
        }

        const isDownloadingThis = downloadingId === doc.id;
        return (
            <button
                onClick={() => handleDownload(doc)}
                disabled={isDownloadingThis}
                className={detailStyles.downloadLink} // Usamos el estilo del detalle
            >
                <Download size={18} />
                {isDownloadingThis ? 'Descargando...' : (doc.descripcion || 'Descargar Archivo')}
            </button>
        );
    };

    return (
        <div className={detailStyles.documentGroup}>
            <button className={detailStyles.groupHeader} onClick={() => setIsOpen(!isOpen)}>
                <span>{state.replace(/_/g, ' ')} ({docs.length})</span>
                <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            {isOpen && (
                <div className={detailStyles.groupContent}>
                    {docs.map(doc => (
                        <div key={doc.id} className={detailStyles.documentItem}>
                            {renderFile(doc)}
                            <div className={detailStyles.documentMeta}>
                                <p>{doc.descripcion || 'Sin descripción'}</p>
                                <span><FileText size={14} /> {doc.tipo ? doc.tipo.toUpperCase() : 'Archivo'}</span>
                                <span><User size={14} /> Subido por {doc.subido_por_nombre}</span>
                                <span><Calendar size={14} /> {new Date(doc.fecha).toLocaleDateString('es-CL')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- 2. EL MODAL DE DETALLE DE ORDEN ---
// (Este componente está perfecto, no necesita cambios)
const OrdenDetailModal = ({ ordenId, onClose }) => {
    const [orden, setOrden] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!ordenId) return;

        const fetchOrdenDetalle = async () => {
            setIsLoading(true);
            setError(null);
            setOrden(null);
            try {
                // Hacemos la llamada al endpoint de detalle
                const response = await apiClient.get(`/ordenes/${ordenId}/`);
                setOrden(response.data);
            } catch (err) {
                setError("No se pudo cargar el detalle de la orden.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrdenDetalle();
    }, [ordenId]);

    // Agrupamos los documentos (lógica de DetalleOrden.jsx)
    const groupedDocs = useMemo(() => {
        if (!orden?.documentos) return {};
        return orden.documentos.reduce((acc, doc) => {
            const state = doc.estado_en_carga || 'General';
            if (!acc[state]) {
                acc[state] = [];
            }
            acc[state].push(doc);
            return acc;
        }, {});
    }, [orden?.documentos]);


    return (
        // Usamos estilos del modal de DetalleOrden
        <div className={detailStyles.modalOverlay} onClick={onClose}>
            <div className={detailStyles.modalContent} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className={detailStyles.modalCloseButton}>
                    <X size={24} />
                </button>

                {isLoading && <p className={styles.loading}>Cargando detalle...</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {orden && (
                    <div className={detailStyles.modalBody}>
                        <h2 className={detailStyles.modalTitle}>Detalle de la Orden #{orden.id}</h2>
                        <p className={detailStyles.modalSubtitle}>Vehículo: <strong>{orden.vehiculo_info}</strong></p>

                        {/* --- Falla y Diagnóstico --- */}
                        <div className={detailStyles.infoCard}>
                            <h3><Wrench /> Falla y Diagnóstico</h3>
                            <div className={detailStyles.infoField}>
                                <label>Descripción del Cliente</label>
                                <p>{orden.descripcion_falla || "N/A"}</p>
                            </div>
                            <div className={detailStyles.infoField}>
                                <label>Diagnóstico Técnico</label>
                                <p className={detailStyles.diagnosticoBox}>
                                    {orden.diagnostico_tecnico || "Aún sin diagnóstico."}
                                </p>
                            </div>
                        </div>

                        {/* --- Repuestos y Servicios --- */}
                        <div className={detailStyles.infoCard}>
                            <h3><HardHat /> Repuestos y Servicios</h3>
                            <ul className={detailStyles.repuestosList}>
                                {orden.items && orden.items.length > 0 ? (
                                    orden.items.map(item => (
                                        <li key={item.id} className={detailStyles.repuestoItem}>
                                            <div>
                                                <strong>{item.producto_info?.nombre || item.servicio_info}</strong>
                                                <span> (x{item.cantidad})</span>
                                            </div>
                                            {item.producto_info && (
                                                <span
                                                    className={detailStyles.statusRepuesto}
                                                    data-estado={item.estado_repuesto}
                                                >
                                                    {item.estado_repuesto.replace(/_/g, ' ')}
                                                </span>
                                            )}
                                        </li>
                                    ))
                                ) : (
                                    <p>No se han añadido repuestos o servicios a esta orden.</p>
                                )}
                            </ul>
                        </div>

                        {/* --- Documentos --- */}
                        <div className={detailStyles.infoCard}>
                            <h3><Paperclip /> Documentos Anexados</h3>
                            <div className={detailStyles.documentGroupContainer}>
                                {orden.documentos && orden.documentos.length > 0 ? (
                                    Object.entries(groupedDocs).map(([state, docs]) => (
                                        <DocumentGroupSimple key={state} state={state} docs={docs} />
                                    ))
                                ) : (
                                    <p>No hay documentos anexados a esta orden.</p>
                                )}
                            </div>
                        </div>

                        {/* --- Historial --- */}
                        <div className={detailStyles.infoCard}>
                            <h3><Clock /> Historial de Estados</h3>
                            <ul className={detailStyles.historyList}>
                                {orden.historial_estados?.map(h => (
                                    <li key={h.id}>
                                        <strong>{h.estado}</strong>
                                        <span>por {h.usuario_nombre} el {new Date(h.fecha).toLocaleString('es-CL')}</span>
                                        {h.motivo && <small>Motivo: {h.motivo}</small>}
                                    </li>
                                ))}
                            </ul>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};


// --- 3. TU COMPONENTE StatusCard (MODIFICADO) ---
// (Este componente está perfecto, no necesita cambios)
const StatusCard = ({ orden, onClick }) => {
    const estados = ['Ingresado', 'En Diagnostico', 'En Proceso', 'Pausado', 'Finalizado'];
    const estadoActualIndex = estados.indexOf(orden.estado);

    return (
        <button className={styles.statusCard} onClick={onClick}>
            <div className={styles.cardHeader}>
                <Truck />
                <h3>{orden.vehiculo_info}</h3>
            </div>
            <div className={styles.cardBody}>
                <h4>Motivo de Ingreso:</h4>
                <p>{orden.descripcion_falla}</p>
            </div>
            <div className={styles.timeline}>
                {estados.map((estado, index) => (
                    <div key={estado} className={`${styles.timelineStep} ${index <= estadoActualIndex ? styles.completed : ''}`}>
                        <div className={styles.timelineDot}></div>
                        <div className={styles.timelineLabel}>{estado.replace(/_/g, ' ')}</div>
                    </div>
                ))}
            </div>
        </button>
    );
};


// --- 4. TU COMPONENTE PRINCIPAL (MODIFICADO) ---
// (Este componente está perfecto, no necesita cambios)
export default function DashboardChofer() {
    const [ordenesActivas, setOrdenesActivas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Nuevo estado para manejar el modal
    const [selectedOrdenId, setSelectedOrdenId] = useState(null);

    useEffect(() => {
        const fetchOrdenes = async () => {
            try {
                const response = await apiClient.get('/ordenes/');
                const activas = (response.data.results || response.data).filter(o => o.estado !== 'Finalizado');
                setOrdenesActivas(activas);
            } catch (err) {
                setError('No se pudo cargar el estado de tus vehículos.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrdenes();
    }, []);

    if (isLoading) return <p>Cargando estado de vehículos...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div>
            <h1 className={styles.mainTitle}>Estado de Mis Vehículos en Taller</h1>
            {ordenesActivas.length > 0 ? (
                <div className={styles.cardsContainer}>
                    {ordenesActivas.map(orden => (
                        <StatusCard
                            key={orden.id}
                            orden={orden}
                            // Aquí asignamos la función de click
                            onClick={() => setSelectedOrdenId(orden.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className={styles.noVehiclesMessage}>
                    <Wrench size={48} className="text-gray-400" />
                    <h2>¡Todo en orden!</h2>
                    <p>Ninguno de tus vehículos se encuentra actualmente en el taller.</p>
                </div>
            )}

            {/* Aquí renderizamos el modal si hay una orden seleccionada */}
            {selectedOrdenId && (
                <OrdenDetailModal
                    ordenId={selectedOrdenId}
                    onClose={() => setSelectedOrdenId(null)}
                />
            )}
        </div>
    );
}