import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axios.js';
import { useUserStore } from '../store/authStore.js';
import styles from '../css/detalleorden.module.css';
import {
    Wrench, User, Tag, Calendar, Image as ImageIcon, Upload,
    Paperclip, Play, Pause, ChevronDown, FileText, Download,
    Search, PlusCircle
} from 'lucide-react';
import AlertModal from '/src/components/modals/AlertModal.jsx';


const DocumentGroup = ({ state, docs }) => {
    const [isOpen, setIsOpen] = useState(false);

    const renderFile = (doc) => {
        const fileUrl = doc.archivo_url;
        if (!fileUrl) return <p>Archivo no encontrado.</p>;
        const tipo = (doc.tipo || '').toLowerCase();
        const isImage = tipo.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
        if (isImage) {
            return (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <img src={fileUrl} alt={doc.descripcion || 'Imagen'} className={styles.imagePreview} />
                </a>
            );
        }
        return (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={styles.downloadLink}>
                <Download size={18} />
                Descargar: {doc.descripcion || 'Archivo'}
            </a>
        );
    };

    return (
        <div className={styles.documentGroup}>
            <button className={styles.groupHeader} onClick={() => setIsOpen(!isOpen)}>
                <span>{state.replace(/_/g, ' ')} ({docs.length})</span>
                <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>
            {isOpen && (
                <div className={styles.groupContent}>
                    {docs.map(doc => (
                        <div key={doc.id} className={styles.documentItem}>
                            {renderFile(doc)}
                            <div className={styles.documentMeta}>
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


const ModalInputMotivo = ({ isOpen, onClose, onConfirm }) => {
    const [motivo, setMotivo] = useState('Esperando repuestos');
    if (!isOpen) return null;

    const handleConfirmClick = () => {
        onConfirm(motivo);
        onClose();
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>Motivo de la Pausa</h2>
                <div className={styles.modalField}>
                    <label htmlFor="motivoPausa">Por favor, especifica un motivo (opcional):</label>
                    <textarea
                        id="motivoPausa"
                        className={styles.modalTextarea}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                    />
                </div>
                <div className={styles.modalActions}>
                    <button onClick={onClose} className={styles.modalCancelButton}>Cancelar</button>
                    <button onClick={handleConfirmClick} className={styles.modalConfirmButton}>Confirmar Pausa</button>
                </div>
            </div>
        </div>
    );
};

const BuscadorRepuestos = ({ ordenId, onRepuestoAgregado }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [cantidad, setCantidad] = useState(1);

    useEffect(() => {
        if (searchTerm.length < 2) {
            setResults([]);
            return;
        }
        setIsLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await apiClient.get(`/productos/?search=${searchTerm}`);
                setResults(res.data.results || res.data || []);
            } catch (err) {
                console.error("Error buscando productos", err);
            } finally {
                setIsLoading(false);
            }
        }, 300); 
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSolicitar = async (productoSku) => {
        try {
            await apiClient.post('/orden-items/', {
                orden: ordenId,
                producto: productoSku,
                cantidad: cantidad
            });
            onRepuestoAgregado(); 
            setSearchTerm('');
            setResults([]);
            setCantidad(1);
        } catch (err) {
            alert("Error al solicitar el repuesto: " + (err.response?.data?.error || "Error"));
        }
    };

    return (
        <div className={styles.infoCard} style={{ marginTop: '2rem' }}>
            <h3><PlusCircle /> Solicitar Repuestos</h3>
            <div className={styles.formField}>
                <label>Buscar repuesto por nombre o SKU</label>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ej: Filtro de Aire"
                    className={styles.motivoInput}
                />
            </div>
            {isLoading && <p>Buscando...</p>}
            {results.length > 0 && (
                <ul className={styles.resultsList}> 
                    {results.map(prod => (
                        <li key={prod.sku} className={styles.resultItem}> 
                            <div>
                                <strong>{prod.nombre}</strong> (SKU: {prod.sku})
                                <small>Stock: {prod.stock}</small>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    value={cantidad}
                                    onChange={e => setCantidad(Math.max(1, e.target.value))}
                                    style={{ width: '60px' }}
                                    min="1"
                                />
                                <button onClick={() => handleSolicitar(prod.sku)} disabled={prod.stock <= 0}>
                                    {prod.stock > 0 ? 'Solicitar' : 'Sin Stock'}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


export default function DetalleOrden() {
    const { id } = useParams();
    const { user } = useUserStore();
    const [orden, setOrden] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mecanicos, setMecanicos] = useState([]);
    const [diagnostico, setDiagnostico] = useState('');
    const [archivo, setArchivo] = useState(null);
    const [descripcionArchivo, setDescripcionArchivo] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', intent: 'success' });
    const [isMotivoModalOpen, setIsMotivoModalOpen] = useState(false);


    const fetchOrden = async () => {
        try {
            const ordenRes = await apiClient.get(`/ordenes/${id}/`);
            setOrden(ordenRes.data);
            setDiagnostico(ordenRes.data.diagnostico_tecnico || '');
        } catch (err) {
            setError('No se pudo recargar la información de la orden.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        const fetchAllData = async () => {
            try {

                const mecanicosRes = await apiClient.get('/mecanicos/');
                setMecanicos(mecanicosRes.data);


                await fetchOrden();
            } catch (err) {
                setError('No se pudo cargar la información necesaria.');
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, [id]);

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

    const handleSaveDiagnostico = async () => {
        try {
            const response = await apiClient.patch(`/ordenes/${id}/`, { diagnostico_tecnico: diagnostico });
            setOrden(response.data);
            setAlertModal({ isOpen: true, title: 'Éxito', message: 'Diagnóstico guardado con éxito.', intent: 'success' });
        } catch {
            setAlertModal({ isOpen: true, title: 'Error', message: 'Error al guardar el diagnóstico.', intent: 'danger' });
        }
    };

    const handleAssignMecanico = async (e) => {
        const mecanicoId = e.target.value;
        if (!mecanicoId) return;
        try {
            const response = await apiClient.patch(`/ordenes/${id}/`, { usuario_asignado: mecanicoId });
            setOrden(response.data);
            setAlertModal({ isOpen: true, title: 'Éxito', message: 'Mecánico re-asignado con éxito.', intent: 'success' });
        } catch {
            setAlertModal({ isOpen: true, title: 'Error', message: 'Error al re-asignar el mecánico.', intent: 'danger' });
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!archivo) {
            setAlertModal({ isOpen: true, title: 'Aviso', message: 'Por favor, selecciona un archivo para subir.', intent: 'danger' });
            return;
        }
        setIsUploading(true);
        const formData = new FormData();
        formData.append('archivo', archivo);
        formData.append('descripcion', descripcionArchivo);

        try {
            const response = await apiClient.post(`/ordenes/${id}/subir-documento/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            await fetchOrden();

            setArchivo(null);
            setDescripcionArchivo('');
            e.target.reset();
            setAlertModal({ isOpen: true, title: 'Éxito', message: 'Archivo subido con éxito.', intent: 'success' });
        } catch (error) {
            setAlertModal({ isOpen: true, title: 'Error', message: 'Error al subir el archivo.', intent: 'danger' });
        } finally {
            setIsUploading(false);
        }
    };

    const handlePausar = () => setIsMotivoModalOpen(true);

    const handleConfirmPausa = async (motivoPausa) => {
        try {
            const response = await apiClient.post(`/ordenes/${id}/pausar/`, { motivo: motivoPausa });
            setOrden(response.data);
            setAlertModal({ isOpen: true, title: 'Éxito', message: 'El trabajo ha sido pausado.', intent: 'success' });
        } catch (error) {
            setAlertModal({ isOpen: true, title: 'Error', message: 'Error al pausar el trabajo.', intent: 'danger' });
        }
    };

    const handleReanudar = async () => {
        try {
            const response = await apiClient.post(`/ordenes/${id}/reanudar/`);
            setOrden(response.data);
            setAlertModal({ isOpen: true, title: 'Éxito', message: 'El trabajo ha sido reanudado.', intent: 'success' });
        } catch (error) {
            setAlertModal({ isOpen: true, title: 'Error', message: 'Error al reanudar el trabajo.', intent: 'danger' });
        }
    };

    const closeAlertModal = () => {
        setAlertModal({ isOpen: false, title: '', message: '', intent: 'success' });
    };


    const handleRepuestoAgregado = () => {
        fetchOrden();
    };

    if (isLoading) return <p className={styles.loading}>Cargando detalle de la orden...</p>;
    if (error && !orden) return <p className={styles.error}>{error}</p>;

    const isFinalizada = orden?.estado === 'Finalizado';
    const tienePrivilegiosAdmin = (user.rol === 'Supervisor' || user.rol === 'Administrativo');
    const puedeModificar = (tienePrivilegiosAdmin || user.rol === 'Mecanico') && !isFinalizada;

    const esMecanicoAsignado = (user.rol === 'Mecanico' && orden?.usuario_asignado === user.id);

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1>Detalle de la Orden #{orden?.id}</h1>
                <p>Vehículo: <strong>{orden?.vehiculo_info}</strong></p>
            </header>

            <div className={styles.gridContainer}>

                <div className={styles.mainContent}>

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
                            <textarea
                                value={diagnostico}
                                onChange={(e) => setDiagnostico(e.target.value)}
                                placeholder="Añadir diagnóstico técnico..."
                                className={styles.textArea}
                                disabled={!puedeModificar}
                            />
                            {puedeModificar && (
                                <button onClick={handleSaveDiagnostico} className={styles.saveButton}>Guardar Diagnóstico</button>
                            )}
                        </div>
                    </div>

                    <div className={styles.infoCard}>
                        <h3><Wrench /> Repuestos y Servicios</h3>
                        <ul className={styles.repuestosList}>
                            {orden?.items && orden.items.length > 0 ? (
                                orden.items.map(item => (
                                    <li key={item.id} className={styles.repuestoItem}>
                                        <div>
                                            <strong>{item.producto_info?.nombre || item.servicio_info}</strong>
                                            <span> (x{item.cantidad})</span>
                                        </div>
                                        {item.producto_info && (
                                            <span
                                                className={styles.statusRepuesto}
                                                data-estado={item.estado_repuesto}
                                            >
                                                {item.estado_repuesto.replace(/_/g, ' ')}
                                                {item.estado_repuesto === 'Rechazado' && (
                                                    <small> ({item.motivo_gestion})</small>
                                                )}
                                            </span>
                                        )}
                                    </li>
                                ))
                            ) : (
                                <p>No se han añadido repuestos o servicios a esta orden.</p>
                            )}
                        </ul>
                    </div>

                    {(esMecanicoAsignado || tienePrivilegiosAdmin) && !isFinalizada && (
                        <BuscadorRepuestos ordenId={id} onRepuestoAgregado={handleRepuestoAgregado} />
                    )}

                    {puedeModificar && (
                        <div className={styles.infoCard}>
                            <h3><Upload /> Subir Documentos</h3>
                            <form onSubmit={handleFileUpload} className={styles.uploadForm}>
                                <div className={styles.formRow}>
                                    <div className={styles.formField} style={{ flex: 1 }}>
                                        <label>Archivo</label>
                                        <input type="file" onChange={e => setArchivo(e.target.files[0])} required accept=".jpg,.jpeg,.png,.gif,.pdf,.ppt,.pptx,.xls,.xlsx" />
                                    </div>
                                </div>
                                <div className={styles.formField}>
                                    <label>Descripción (Opcional)</label>
                                    <input type="text" className={styles.motivoInput} value={descripcionArchivo} onChange={e => setDescripcionArchivo(e.target.value)} placeholder="Ej: Foto de la reparación finalizada" />
                                </div>
                                <button type="submit" className={styles.submitButton} disabled={isUploading}>
                                    {isUploading ? 'Subiendo...' : 'Subir Archivo'}
                                </button>
                            </form>

                            <hr />

                            <h4><Paperclip /> Documentos Anexados</h4>
                            <div className={styles.documentGroupContainer}>
                                {orden?.documentos && orden.documentos.length > 0 ? (
                                    Object.entries(groupedDocs).map(([state, docs]) => (
                                        <DocumentGroup key={state} state={state} docs={docs} />
                                    ))
                                ) : (
                                    <p>No hay documentos anexados a esta orden.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <aside className={styles.sidebar}>
                    <div className={`${styles.infoCard} ${styles.statusCard}`}>
                        <h3><Tag /> Estado y Acciones</h3>
                        <div className={`${styles.statusBadge} ${styles[orden?.estado.toLowerCase().replace(/\s/g, '')]}`}>
                            {orden?.estado}
                        </div>

                        {puedeModificar && (
                            <div className={styles.pauseActions}>
                                {orden?.estado === 'Pausado' ? (
                                    <button onClick={handleReanudar} className={styles.resumeButton}><Play size={16} /> Reanudar Trabajo</button>
                                ) : (
                                    <button onClick={handlePausar} className={styles.pauseButton} disabled={orden?.estado === 'Finalizado'}><Pause size={16} /> Pausar Trabajo</button>
                                )}
                            </div>
                        )}

                        <hr />
                        <h4>Historial de Estados</h4>
                        <ul className={styles.historyList}>
                            {orden?.historial_estados?.map(h => (
                                <li key={h.id}>
                                    <strong>{h.estado}</strong>
                                    <span>por {h.usuario_nombre} el {new Date(h.fecha).toLocaleString('es-CL')}</span>
                                    {h.motivo && <small>Motivo: {h.motivo}</small>}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className={styles.infoCard}>
                        <h3><User /> Asignación</h3>
                        {tienePrivilegiosAdmin && !isFinalizada ? (
                            <select
                                value={orden?.usuario_asignado || ''}
                                onChange={handleAssignMecanico}
                                className={styles.mecanicoSelect}
                            >
                                <option value="" disabled>-- Re-asignar mecánico --</option>
                                {mecanicos.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.first_name} {m.last_name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className={styles.assignedMechanic}>{orden?.asignado_a}</p>
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


            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={closeAlertModal}
                title={alertModal.title}
                message={alertModal.message}
                intent={alertModal.intent}
            />

            <ModalInputMotivo
                isOpen={isMotivoModalOpen}
                onClose={() => setIsMotivoModalOpen(false)}
                onConfirm={handleConfirmPausa}
            />

        </div>
    );
}