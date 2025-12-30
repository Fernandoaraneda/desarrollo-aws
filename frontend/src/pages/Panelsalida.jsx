import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '/src/api/axios.js';
import { useUserStore } from '/src/store/authStore.js';
import styles from '../css/Panelsalida.module.css';
import { LogOut, Search } from 'lucide-react';
import ConfirmModal from '/src/components/modals/ConfirmModal.jsx';
import AlertModal from '/src/components/modals/AlertModal.jsx';

export default function PanelSalida() {
    const [ordenes, setOrdenes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useUserStore();
    const isReadOnly = user?.rol === 'Invitado';


    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [modalIntent, setModalIntent] = useState("success");
    const [ordenToProcess, setOrdenToProcess] = useState(null);

    const filteredOrdenes = useMemo(() => {
        if (!searchTerm) return ordenes;
        return ordenes.filter(o =>
            (o.vehiculo_patente?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
    }, [ordenes, searchTerm]);

    const fetchOrdenesPorSalir = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/ordenes/pendientes-salida/');
            setOrdenes(response.data);
        } catch (err) {
            setError("No se pudieron cargar las órdenes pendientes de salida.");
            console.error("Error fetching órdenes para salida:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrdenesPorSalir();
    }, []);


    const handleRegistrarSalida = (id) => {

        setOrdenToProcess(id);
        setIsConfirmOpen(true);


    };

    const handleConfirmSalida = async () => {
        if (!ordenToProcess) return;

        setIsConfirmOpen(false);

        try {
            await apiClient.post(`/ordenes/${ordenToProcess}/registrar-salida/`);
            setModalMessage("✅ Salida registrada con éxito.");
            setModalIntent("success");
            setIsAlertOpen(true);


            setOrdenes(prevOrdenes => prevOrdenes.filter(o => o.id !== ordenToProcess));
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Error al registrar la salida.";
            setModalMessage(errorMsg);
            setModalIntent("danger");
            setIsAlertOpen(true);
        } finally {
            setOrdenToProcess(null);
        }
    };

    if (isLoading) return <p>Cargando vehículos listos para salir...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (

        <>
            <div className={styles.pageWrapper}>
                <header className={styles.header}>
                    <h1><LogOut size={32} /> Panel de Salidas</h1>
                    <p>Vehículos con trabajo finalizado listos para retirarse.</p>
                </header>

                <div className={styles.tableCard}>
                    <div className={styles.tableControls}>
                        <div className={styles.searchBox}>
                            <Search size={20} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Buscar por patente..."
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
                                    <th>Chofer</th>
                                    <th>Mecánico Asignado</th>
                                    <th>Diagnóstico</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrdenes.length > 0 ? (
                                    filteredOrdenes.map(o => (
                                        <tr key={o.id}>
                                            <td>{o.vehiculo_patente}</td>
                                            <td>{o.chofer_nombre}</td>
                                            <td>{o.mecanico_nombre}</td>
                                            <td>{o.diagnostico_tecnico || o.descripcion_falla}</td>
                                            <td><span className={styles.estadoFinalizado}>{o.estado}</span></td>
                                            <td>
                                                {!isReadOnly && (
                                                    <button
                                                        className={`${styles.actionButton} ${styles.salidaButton}`}
                                                        onClick={() => handleRegistrarSalida(o.id)}
                                                    >
                                                        <LogOut size={16} /> Registrar Salida
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>
                                            No hay vehículos pendientes de salida.
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
                onConfirm={handleConfirmSalida}
                title="Confirmar Salida"
                G message="¿Está seguro de que desea registrar la SALIDA de este vehículo?"
                confirmButtonText="Sí, Registrar Salida"
                intent="success"
            />

            <AlertModal
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
                title={modalIntent === 'success' ? 'Éxito' : 'Error'}
                GE message={modalMessage}
                intent={modalIntent}
            />


        </>
    );
}