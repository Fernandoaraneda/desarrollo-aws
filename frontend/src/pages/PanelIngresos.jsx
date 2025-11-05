import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '/src/api/axios.js';
import styles from '../css/panelingreso.module.css';
import { LogIn, CalendarClock, Search } from 'lucide-react';
import ConfirmModal from '/src/components/modals/ConfirmModal.jsx';
import AlertModal from '/src/components/modals/AlertModal.jsx';



export default function PanelIngresos() {
    const [agendamientos, setAgendamientos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');


    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [modalIntent, setModalIntent] = useState("success");
    const [agendamientoToProcess, setAgendamientoToProcess] = useState(null);


    const filteredAgendamientos = useMemo(() => {
        if (!searchTerm) return agendamientos;
        return agendamientos.filter(a =>
            (a.vehiculo_patente?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (a.chofer_nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
    }, [agendamientos, searchTerm]);

 
    const fetchCitasPorIngresar = async () => {
        setIsLoading(true);
        setError(null);
        try {
            
            const response = await apiClient.get('/agenda/seguridad/');
            setAgendamientos(response.data.results || response.data || []);
        } catch (err) {
            setError("No se pudieron cargar las citas pendientes de ingreso.");
            console.error("Error fetching citas para ingreso:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCitasPorIngresar();
    }, []);


    const handleRegistrarIngreso = (id) => {
        setAgendamientoToProcess(id); 
        setIsConfirmOpen(true);
    };


    const handleConfirmIngreso = async () => {
        if (!agendamientoToProcess) return;

        setIsConfirmOpen(false); 

        try {
            await apiClient.post(`/agendamientos/${agendamientoToProcess}/registrar-ingreso/`);

         
            setModalMessage("✅ Ingreso registrado con éxito. Se ha creado la orden de trabajo.");
            setModalIntent("success");
            setIsAlertOpen(true);

            
            setAgendamientos(prev => prev.filter(a => a.id !== agendamientoToProcess));

        } catch (err) {
            const errorMsg = err.response?.data?.error || "Error al registrar el ingreso.";

        
            setModalMessage(errorMsg);
            setModalIntent("danger");
            setIsAlertOpen(true);
        } finally {
            setAgendamientoToProcess(null);
        }
    };



    if (isLoading) return <p>Cargando citas por ingresar...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <>
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
           
                <h1><LogIn size={32} /> Panel de Ingresos</h1>
                <p>Vehículos con cita confirmada para hoy esperando ingreso.</p>
            </header>

            <div className={styles.tableCard}>
                <div className={styles.tableControls}>
                    <div className={styles.searchBox}>
                        <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Buscar por patente o chofer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Fecha y Hora Programada</th>
                                <th>Patente</th>
                                <th>Chofer</th>
                                <th>Mecánico Asignado</th>
                                <th>Motivo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAgendamientos.length > 0 ? (
                                filteredAgendamientos.map(a => (
                                    <tr key={a.id}>
                                        <td>{new Date(a.fecha_hora_programada).toLocaleString('es-CL')}</td>
                                        <td>{a.vehiculo_patente}</td>
                                        <td>{a.chofer_nombre}</td>
                                        <td>{a.mecanico_nombre}</td>
                                        <td>{a.motivo_ingreso}</td>
                                        <td>
                                           
                                            <button
                                                className={`${styles.actionButton} ${styles.ingresoButton}`}
                                                onClick={() => handleRegistrarIngreso(a.id)}
                                            >
                                                <LogIn size={16} /> Ingreso
                                            </button>
                                      
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>
                                        No hay citas pendientes de ingreso para hoy.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
            <ConfirmModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmIngreso}
                    title="Confirmar Ingreso"
                    message="¿Está seguro de que desea registrar el ingreso de este vehículo? Esta acción creará una nueva orden de trabajo."
                    confirmButtonText="Sí, Registrar Ingreso"
                    intent="success" 
                />
                
                <AlertModal
                    isOpen={isAlertOpen}
                    onClose={() => setIsAlertOpen(false)}
                    title={modalIntent === 'success' ? 'Éxito' : 'Error'}
                    message={modalMessage}
                    intent={modalIntent}
                />
                
        </>
    );
}
