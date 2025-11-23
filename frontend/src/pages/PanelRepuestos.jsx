import React, { useState, useEffect } from 'react';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/gestionordenes.module.css'; 
import { Inbox, Check, X, AlertTriangle } from 'lucide-react';
import AlertModal from '/src/components/modals/AlertModal.jsx';
import ConfirmModal from '/src/components/modals/ConfirmModal.jsx';



const RechazarModal = ({ isOpen, onClose, onConfirm }) => {
    const [motivo, setMotivo] = useState('Sin stock. Solicitado a proveedor (3 días aprox.)');
    
    if (!isOpen) return null;

    const handleConfirmar = () => {
        if (!motivo.trim()) {
            alert("Debe ingresar un motivo para el rechazo.");
            return;
        }
        onConfirm(motivo);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>Rechazar Solicitud de Repuesto</h2>
                <p>Por favor, especifica el motivo del rechazo. El mecánico será notificado.</p>
                <div className={styles.formField}>
                    <label htmlFor="motivoRechazo">Motivo (Obligatorio)</label>
                    <textarea
                        id="motivoRechazo"
                        className={styles.modalTextarea}
                        rows="3"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                    />
                </div>
                <div className={styles.modalActions}>
                    <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
                    <button onClick={handleConfirmar} className={styles.saveButton} style={{backgroundColor: '#b91c1c'}}>
                        Confirmar Rechazo
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function PanelRepuestos() {
    const [solicitudes, setSolicitudes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);


    const [alert, setAlert] = useState({ isOpen: false, title: '', message: '', intent: 'danger' });
    const [confirm, setConfirm] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [rechazar, setRechazar] = useState({ isOpen: false, item: null });
    const fetchPendientes = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/orden-items/pendientes/');
            setSolicitudes(res.data || []);
        } catch (err) {
            setError("No se pudieron cargar las solicitudes pendientes.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendientes();
    }, []);

 
    const showAlert = (title, message, intent = 'danger') => {
        setAlert({ isOpen: true, title, message, intent });
    };
    const closeAlert = () => setAlert({ isOpen: false, title: '', message: '', intent: 'danger' });
    const closeConfirm = () => setConfirm({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const closeRechazar = () => setRechazar({ isOpen: false, item: null });


    const handleOpenAprobar = (item) => {
        setConfirm({
            isOpen: true,
            title: "Confirmar Aprobación",
            message: `¿Aprobar ${item.cantidad}x ${item.producto_info.nombre}? El stock se descontará (Stock actual: ${item.producto_info.stock}).`,
            onConfirm: () => handleConfirmarAprobacion(item.id),
            intent: 'success'
        });
    };

    const handleConfirmarAprobacion = async (itemId) => {
        closeConfirm();
        try {
            await apiClient.post(`/orden-items/${itemId}/gestionar-repuesto/`, {
                accion: 'aprobar'
            });
            showAlert("Éxito", "Repuesto aprobado y stock descontado.", "success");
            fetchPendientes();
        } catch (err) {
            showAlert("Error", err.response?.data?.error || "No se pudo aprobar.");
        }
    };


    const handleOpenRechazar = (item) => {
        setRechazar({ isOpen: true, item: item });
    };

    const handleConfirmarRechazo = async (motivo) => {
        const itemId = rechazar.item.id;
        closeRechazar();
        try {
            await apiClient.post(`/orden-items/${itemId}/gestionar-repuesto/`, {
                accion: 'rechazar',
                motivo: motivo
            });
            showAlert("Éxito", "Repuesto rechazado y mecánico notificado.", "success");
            fetchPendientes();
        } catch (err) {
            showAlert("Error", err.response?.data?.error || "No se pudo rechazar.");
        }
    };


    if (isLoading) return <p className={styles.loading}>Cargando solicitudes...</p>; 
    if (error) return <p className={styles.error}>{error}</p>;

    return (
        <>
            <div className={styles.pageWrapper}>
                <header className={styles.header}>
                    <h1><Inbox size={32} /> Solicitudes de Repuestos</h1>
                    <p>Gestiona las solicitudes de repuestos pendientes de los mecánicos.</p>
                </header>
                
                <div className={styles.tableCard}>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Orden #</th>
                                    <th>Mecánico</th>
                                    <th>Producto Solicitado</th>
                                    <th>SKU</th>
                                    <th>Cantidad Pedida</th>
                                    <th>Stock Actual</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {solicitudes.length > 0 ? (
                                    solicitudes.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.orden}</td>
                                            <td>{item.solicitado_por_nombre}</td>
                                            <td>{item.producto_info.nombre}</td>
                                            <td>{item.producto_info.sku}</td>
                                            <td>{item.cantidad}</td>
                                            <td style={{fontWeight: 'bold', color: item.producto_info.stock < item.cantidad ? '#b91c1c' : '#16a34a'}}>
                                                {item.producto_info.stock}
                                                {item.producto_info.stock < item.cantidad && <AlertTriangle size={16} style={{display: 'inline', marginLeft: '5px'}} />}
                                            </td>
                                            <td className={styles.actionsCell}>
                                                <button 
                                                    onClick={() => handleOpenAprobar(item)} 
                                                    className={styles.actionButton} 
                                                    style={{color: '#16a34a'}}
                                                    disabled={item.producto_info.stock < item.cantidad}
                                                    title={item.producto_info.stock < item.cantidad ? "Stock insuficiente" : "Aprobar"}
                                                >
                                                    <Check size={16} /> Aprobar
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenRechazar(item)} 
                                                    className={styles.actionButton} 
                                                    style={{color: '#b91c1c'}}
                                                >
                                                    <X size={16} /> Rechazar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '1rem' }}>
                                            ¡Todo al día! No hay solicitudes de repuestos pendientes.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <AlertModal
                isOpen={alert.isOpen}
                onClose={closeAlert}
                title={alert.title}
                message={alert.message}
                intent={alert.intent}
            />
            <ConfirmModal
                isOpen={confirm.isOpen}
                onClose={closeConfirm}
                onConfirm={confirm.onConfirm}
                title={confirm.title}
                message={confirm.message}
                confirmButtonText="Sí, Confirmar"
                intent={confirm.intent}
            />
            <RechazarModal
                isOpen={rechazar.isOpen}
                onClose={closeRechazar}
                onConfirm={handleConfirmarRechazo}
            />
        </>
    );
}