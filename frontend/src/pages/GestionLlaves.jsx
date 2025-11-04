import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/gestionllaves.module.css'; 
import { Key, Search, User, Check, AlertTriangle, Info, RotateCcw } from 'lucide-react';
import AlertModal from '/src/components/modals/AlertModal.jsx';
import ConfirmModal from '/src/components/modals/ConfirmModal.jsx';


const ModalAccionLlave = ({ accion, llave, usuarios, onClose, onConfirm, onAlert }) => {
    const [usuarioId, setUsuarioId] = useState('');
    const [observaciones, setObservaciones] = useState('');

    const handleSubmit = () => {
        if (accion === 'prestar' && !usuarioId) {

            onAlert("Debe seleccionar un usuario."); 
            return;
        }
        onConfirm(accion, llave, { 
            usuario_id: usuarioId, 
            observaciones: observaciones 
        });
    };

    const titulo = accion === 'prestar' ? 'Registrar Préstamo de Llave' : 'Registrar Devolución de Llave';
    const botonTexto = accion === 'prestar' ? 'Confirmar Préstamo' : 'Confirmar Devolución';

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>{titulo}</h2>
                <p>
                    <strong>Patente:</strong> {llave.vehiculo_patente} <br/>
                    <strong>Código:</strong> {llave.codigo_interno}
                </p>

                {accion === 'prestar' && (
                    <div className={styles.formField}>
                        <label htmlFor="usuario_id">Prestar a:</label>
                        <select
                            id="usuario_id"
                            className={styles.modalSelect} 
                            value={usuarioId}
                            onChange={(e) => setUsuarioId(e.target.value)}
                        >
                            <option value="">-- Seleccione un usuario --</option>
                            {usuarios.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.first_name} {u.last_name} ({u.rol || 'Sin Rol'})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                
                <div className={styles.formField}>
                    <label htmlFor="observaciones">Observaciones ({accion === 'prestar' ? 'Retiro' : 'Devolución'}):</label>
                    <textarea
                        id="observaciones"
                        className={styles.modalTextarea} 
                        rows="3"
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                    />
                </div>

                <div className={styles.modalActions}>
                    <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
                    <button onClick={handleSubmit} className={styles.saveButton}>{botonTexto}</button>
                </div>
            </div>
        </div>
    );
};


const ModalReporte = ({ llave, onClose, onConfirmReporte, onConfirmRevertir, onAlert }) => {
    
    const isReportada = llave.estado === 'Perdida' || llave.estado === 'Dañada';
    const [tipoReporte, setTipoReporte] = useState('Dañada');
    const [motivo, setMotivo] = useState('');

    const handleSubmitReporte = () => {
        if (!motivo) {
 
            onAlert("Debe ingresar un motivo para el reporte."); 
            return;
        }
        onConfirmReporte(llave, { estado: tipoReporte, motivo: motivo });
    };

    const handleRevertirClick = () => {
  
        onConfirmRevertir();
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                
                {isReportada ? (
                    <>
                        <h2><Info size={24} /> Detalle del Reporte</h2>
                        <p><strong>Patente:</strong> {llave.vehiculo_patente}</p>
                        <p><strong>Estado:</strong> {llave.estado}</p>
                        <div className={styles.formField}>
                            <label>Motivo del Reporte:</label>
                            <textarea
                                readOnly
                                rows="4"
                                value={llave.motivo_reporte || "No se especificó un motivo."}
                                style={{backgroundColor: '#f4f4f4', cursor: 'not-allowed'}}
                            />
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={onClose} className={styles.cancelButton}>Cerrar</button>
                            <button onClick={handleRevertirClick} className={styles.saveButton} style={{backgroundColor: '#16a34a'}}>
                                <RotateCcw size={16} /> Revertir Reporte
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2><AlertTriangle size={24} /> Reportar Llave</h2>
                        <p><strong>Patente:</strong> {llave.vehiculo_patente}</p>
                        
                        <div className={styles.formField}>
                            <label htmlFor="tipoReporte">Tipo de Reporte:</label>
                            <select
                                id="tipoReporte"
                                className={styles.modalSelect} 
                                value={tipoReporte}
                                onChange={(e) => setTipoReporte(e.target.value)}
                            >
                                <option value="Dañada">Dañada (Rota)</option>
                                <option value="Perdida">Perdida</option>
                            </select>
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="motivo">Motivo (Obligatorio):</label>
                            <textarea
                                id="motivo"
                                className={styles.modalTextarea}
                                rows="3"
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="Ej: El control no funciona, la llave se partió, el chofer reporta extravío."
                            />
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
                            <button onClick={handleSubmitReporte} className={styles.saveButton} style={{backgroundColor: '#b91c1c'}}>
                                Confirmar Reporte
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


// --- Componente Principal de la Página (Actualizado) ---
export default function GestionLlaves() {
    const [llaves, setLlaves] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');


    const [modalAccion, setModalAccion] = useState({ isOpen: false, accion: null, llave: null });
    const [modalReporte, setModalReporte] = useState({ isOpen: false, llave: null });
    
  
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: "" });
    const [confirmModal, setConfirmModal] = useState({ 
        isOpen: false, 
        title: "", 
        message: "", 
        onConfirm: () => {} 
    });

 
    const fetchData = async () => {

        try {
            const [llavesRes, usersRes] = await Promise.all([
                apiClient.get('/llaves/'),
                apiClient.get('/users/list/')
            ]);
            setLlaves(llavesRes.data.results || llavesRes.data || []);
            setUsuarios(usersRes.data || []);
        } catch (err) {
            setError('No se pudo cargar la información.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

  
    const filteredLlaves = useMemo(() => {
        return llaves.filter(llave =>
            llave.vehiculo_patente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (llave.poseedor_info?.toLowerCase() || 'en bodega').includes(searchTerm.toLowerCase()) ||
            llave.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [llaves, searchTerm]);

   
    const showAlert = (message) => setAlertModal({ isOpen: true, message });
    const closeAlert = () => setAlertModal({ isOpen: false, message: "" });

    const showConfirm = (title, message, onConfirm) => {
        setConfirmModal({ isOpen: true, title, message, onConfirm });
    };
    const closeConfirm = () => setConfirmModal({ isOpen: false, title: "", message: "", onConfirm: () => {} });


  
    const abrirModalAccion = (accion, llave) => {
        setModalAccion({ isOpen: true, accion, llave });
    };
    const cerrarModalAccion = () => setModalAccion({ isOpen: false, accion: null, llave: null });

    const abrirModalReporte = (llave) => {
        setModalReporte({ isOpen: true, llave: llave });
    };
    const cerrarModalReporte = () => setModalReporte({ isOpen: false, llave: null });

   

    const handleConfirmarAccion = async (accion, llave, data) => {
        try {
            if (accion === 'prestar') {
               
                await apiClient.post(`/llaves/${llave.id}/registrar-retiro/`, {
                    usuario_id: data.usuario_id,
                    observaciones: data.observaciones
                });
            } 
            else if (accion === 'recibir') {
            
                await apiClient.post(`/llaves/${llave.id}/registrar-devolucion/`, {
                    observaciones: data.observaciones
                });
            }
            fetchData();
            cerrarModalAccion();
        } catch (err) {
            showAlert("Error: " + (err.response?.data?.error || "No se pudo completar la acción."));
        }
    };
    
    const handleConfirmarReporte = async (llave, data) => {
        try {
            await apiClient.post(`/llaves/${llave.id}/reportar-estado/`, {
                estado: data.estado,
                motivo: data.motivo
            });
            fetchData();
            cerrarModalReporte();
        } catch (err) {
        
            showAlert("Error: " + (err.response?.data?.error || "No se pudo reportar la llave."));
        }
    };

 
    const handleConfirmRevertir = () => {
        const llave = modalReporte.llave;
        
        showConfirm(
            "Confirmar Reversión",
            `¿Está seguro de que desea revertir el reporte de la llave ${llave.codigo_interno}? La llave volverá a estar "En Bodega" y disponible para préstamos.`,
            () => { 
                
                doRevertirReporte(llave);
            }
        );
    };

   
    const doRevertirReporte = async (llave) => {
        try {
            await apiClient.post(`/llaves/${llave.id}/revertir-reporte/`);
            fetchData();
            cerrarModalReporte(); 
            closeConfirm(); 
        } catch (err) {
     
            showAlert("Error: " + (err.response?.data?.error || "No se pudo revertir el reporte."));
        }
    };


    if (isLoading) return <div className={styles.centeredMessage}>Cargando...</div>;
    if (error) return <div className={styles.centeredMessage} style={{ color: 'red' }}>{error}</div>;

    const getEstadoStyle = (estado) => {
        switch (estado) {
            case 'En Bodega': return { backgroundColor: '#16a34a' }; 
            case 'Prestada': return { backgroundColor: '#0284c7' }; 
            case 'Dañada': return { backgroundColor: '#f97316' }; 
            case 'Perdida': return { backgroundColor: '#b91c1c' }; 
            default: return { backgroundColor: '#555' }; 
        }
    };

    return (
        <>
            <div className={styles.pageWrapper}>
                <header className={styles.header}>
                    <h1><Key size={32} /> Gestión de Llaves (Pañol)</h1>
                </header>

                <div className={styles.tableCard}>
                    <div className={styles.tableControls}>
                        <div className={styles.searchBox}>
                            <Search size={20} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Buscar por Patente, Poseedor o Código..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Patente</th>
                                    <th>Código Llave</th>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th>Poseedor Actual</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLlaves.length > 0 ? filteredLlaves.map(llave => {
                                    const isReportada = llave.estado === 'Perdida' || llave.estado === 'Dañada';
                                    const isEnBodega = llave.estado === 'En Bodega';
                                    const isPrestada = llave.estado === 'Prestada';

                                    return (
                                        <tr key={llave.id}>
                                            <td>{llave.vehiculo_patente}</td>
                                            <td>{llave.codigo_interno}</td>
                                            <td>{llave.tipo}</td>
                                            <td>
                                                <span 
                                                    className={styles.statusBadge} 
                                                    style={getEstadoStyle(llave.estado)}
                                                >
                                                    {llave.estado}
                                                </span>
                                            </td>
                                            <td>{llave.poseedor_info}</td>
                                            <td>
                                                <div className={styles.actionButtons}>
                                                    
                                                    <button 
                                                        onClick={() => abrirModalAccion('prestar', llave)}
                                                        title="Prestar Llave"
                                                        style={{color: '#16a34a', fontWeight: '600'}}
                                                        disabled={!isEnBodega}
                                                    >
                                                        <User size={16} /> Prestar
                                                    </button>
                                                    
                                                    {isPrestada && (
                                                        <button 
                                                            onClick={() => abrirModalAccion('recibir', llave)}
                                                            title="Recibir Llave"
                                                            style={{color: '#0284c7', fontWeight: '600'}}
                                                        >
                                                            <Check size={16} /> Recibir
                                                        </button>
                                                    )}
                                                    
                                                    <button 
                                                        className={styles.actionButton} 
                                                        title={isReportada ? "Ver Reporte" : "Reportar Llave"}
                                                        style={{color: isReportada ? '#f97316' : '#b91c1c'}}
                                                        onClick={() => abrirModalReporte(llave)}
                                                    >
                                                        {isReportada ? <Info size={16} /> : <AlertTriangle size={16} />}
                                                        {isReportada ? "Ver Reporte" : "Reportar"}
                                                    </button>

                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="6" className={styles.noResults}>
                                            No se encontraron llaves.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

          
            {modalAccion.isOpen && (
                <ModalAccionLlave
                    accion={modalAccion.accion}
                    llave={modalAccion.llave}
                    usuarios={usuarios}
                    onClose={cerrarModalAccion}
                    onConfirm={handleConfirmarAccion}
                    onAlert={showAlert} 
                />
            )}
            
            
            {modalReporte.isOpen && (
                <ModalReporte
                    llave={modalReporte.llave}
                    onClose={cerrarModalReporte}
                    onConfirmReporte={handleConfirmarReporte}
                    onConfirmRevertir={handleConfirmRevertir}
                    onAlert={showAlert} 
                />
            )}

          
            <AlertModal 
                isOpen={alertModal.isOpen}
                onClose={closeAlert}
                title="Aviso"
                message={alertModal.message}
                intent="danger"
            />

           
            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmButtonText="Sí, Revertir"
                intent="success" 
            />
        </>
    );
}

