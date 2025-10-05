// src/pages/DetalleOrden.jsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axios.js';
import { useUserStore } from '../store/authStore.js';
import styles from '../css/detalleorden.module.css';
import { Wrench, User, Tag, Calendar, Image as ImageIcon, Upload, Paperclip, Play, Pause } from 'lucide-react';

export default function DetalleOrden() {
    const { id } = useParams();
    const { user } = useUserStore();

    // --- Estados Principales ---
    const [orden, setOrden] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- Estados para Formularios Interactivos ---
    const [mecanicos, setMecanicos] = useState([]);
    const [diagnostico, setDiagnostico] = useState('');
    
    // --- Estados para Subida de Archivos ---
    const [archivo, setArchivo] = useState(null);
    const [descripcionArchivo, setDescripcionArchivo] = useState('');
    const [tipoArchivo, setTipoArchivo] = useState('Foto');
    const [isUploading, setIsUploading] = useState(false);

    // --- Carga de Datos Inicial ---
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // Ahora cargamos la orden y la lista de mecánicos al mismo tiempo
                const [ordenRes, mecanicosRes] = await Promise.all([
                    apiClient.get(`/ordenes/${id}/`),
                    apiClient.get('/mecanicos/')
                ]);

                setOrden(ordenRes.data);
                setMecanicos(mecanicosRes.data);
                
                // Inicializamos el textarea del diagnóstico con los datos de la orden
                setDiagnostico(ordenRes.data.diagnostico_tecnico || '');

            } catch (err) {
                setError('No se pudo cargar la información necesaria.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, [id]);
    
    // --- MANEJADORES DE ACCIONES ---

    const handleSaveDiagnostico = async () => {
        try {
            const response = await apiClient.patch(`/ordenes/${id}/`, {
                diagnostico_tecnico: diagnostico
            });
            setOrden(response.data); // Actualiza la orden con la respuesta
            alert('Diagnóstico guardado con éxito.');
        } catch {
            alert('Error al guardar el diagnóstico.');
        }
    };

    const handleAssignMecanico = async (e) => {
        const mecanicoId = e.target.value;
        if (!mecanicoId) return;
        try {
            const response = await apiClient.patch(`/ordenes/${id}/`, {
                usuario_asignado: mecanicoId
            });
            setOrden(response.data);
            alert('Mecánico re-asignado con éxito.');
        } catch {
            alert('Error al re-asignar el mecánico.');
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!archivo) {
            alert("Por favor, selecciona un archivo para subir.");
            return;
        }
        setIsUploading(true);
        const formData = new FormData();
        formData.append('archivo', archivo);
        formData.append('tipo', tipoArchivo);
        formData.append('descripcion', descripcionArchivo);

        try {
            const response = await apiClient.post(`/ordenes/${id}/subir-documento/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // Añade el nuevo documento a la lista sin recargar la página
            setOrden(prevOrden => ({
                ...prevOrden,
                documentos: [...prevOrden.documentos, response.data]
            }));
            // Limpia el formulario
            setArchivo(null);
            setDescripcionArchivo('');
            e.target.reset();
            alert("Archivo subido con éxito.");
        } catch (error) {
            alert("Error al subir el archivo.");
        } finally {
            setIsUploading(false);
        }
    };

    const handlePausar = async () => {
        const motivoPausa = prompt("Motivo de la pausa (opcional):", "Esperando repuestos");
        if (motivoPausa === null) return; // El usuario presionó cancelar

        try {
            const response = await apiClient.post(`/ordenes/${id}/pausar/`, { motivo: motivoPausa });
            setOrden(response.data); // Actualiza toda la orden con el nuevo estado 'Pausado'
            alert("El trabajo ha sido pausado.");
        } catch (error) {
            alert("Error al pausar el trabajo.");
        }
    };

    const handleReanudar = async () => {
        try {
            const response = await apiClient.post(`/ordenes/${id}/reanudar/`);
            setOrden(response.data); // Actualiza toda la orden con el nuevo estado 'En Proceso'
            alert("El trabajo ha sido reanudado.");
        } catch (error) {
            alert("Error al reanudar el trabajo.");
        }
    };

    // --- RENDERIZADO ---

    if (isLoading) return <p className={styles.loading}>Cargando detalle de la orden...</p>;
    if (error && !orden) return <p className={styles.error}>{error}</p>;

    const puedeModificar = user.rol === 'Supervisor' || user.rol === 'Mecanico';
    const esSupervisor = user.rol === 'Supervisor';

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1>Detalle de la Orden #{orden?.id}</h1>
                <p>Vehículo: <strong>{orden?.vehiculo_info}</strong></p>
            </header>

            <div className={styles.gridContainer}>
                {/* Columna Principal */}
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

                    {puedeModificar && (
                        <div className={styles.infoCard}>
                            <h3><Upload /> Subir Documentos</h3>
                            <form onSubmit={handleFileUpload} className={styles.uploadForm}>
                                <div className={styles.formRow}>
                                    <div className={styles.formField} style={{flex: 1}}>
                                        <label>Tipo</label>
                                        <select className={styles.statusSelect} value={tipoArchivo} onChange={e => setTipoArchivo(e.target.value)}>
                                            <option value="Foto">Foto</option>
                                            <option value="Informe">Informe</option>
                                            <option value="PDF">PDF</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                    <div className={styles.formField} style={{flex: 2}}>
                                        <label>Archivo</label>
                                        <input type="file" onChange={e => setArchivo(e.target.files[0])} required />
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
                            {orden?.documentos && orden.documentos.length > 0 ? (
                                <ul className={styles.documentList}>
                                    {orden.documentos.map(doc => (
                                        <li key={doc.id}>
                                            <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer">
                                                {doc.tipo}: {doc.descripcion || 'Sin descripción'}
                                            </a>
                                            <span>Subido por {doc.subido_por_nombre} el {new Date(doc.fecha).toLocaleDateString('es-CL')}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No hay documentos anexados a esta orden.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Columna Lateral (Sidebar) */}
                <aside className={styles.sidebar}>
                    <div className={`${styles.infoCard} ${styles.statusCard}`}>
                        <h3><Tag /> Estado y Acciones</h3>
                        <div className={`${styles.statusBadge} ${styles[orden?.estado.toLowerCase().replace(/\s/g, '')]}`}>
                            {orden?.estado}
                        </div>
                        
                        {puedeModificar && (
                            <div className={styles.pauseActions}>
                                {orden?.estado === 'Pausado' ? (
                                    <button onClick={handleReanudar} className={styles.resumeButton}><Play/> Reanudar Trabajo</button>
                                ) : (
                                    <button onClick={handlePausar} className={styles.pauseButton} disabled={orden?.estado === 'Finalizado'}><Pause/> Pausar Trabajo</button>
                                )}
                            </div>
                        )}
                        <hr />
                        <h4>Historial de Estados</h4>
                        <ul className={styles.historyList}>
                            {orden?.historial_estados?.map(h => (
                                <li key={h.id}>
                                    <strong>{h.estado}</strong> por {h.usuario_nombre}
                                    <span>{new Date(h.fecha).toLocaleString('es-CL')}</span>
                                    {h.motivo && <small>Motivo: {h.motivo}</small>}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className={styles.infoCard}>
                        <h3><User /> Asignación</h3>
                        {esSupervisor ? (
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