
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '/src/api/axios.js';
import { useUserStore } from '/src/store/authStore.js';
import styles from '../css/gestionvehiculos.module.css';
import { Car, Plus, Edit, Trash2, Search, CheckCircle } from 'lucide-react';
import ConfirmModal from '/src/components/modals/ConfirmModal.jsx';

const LoadingSpinner = () => <div className={styles.centeredMessage}>Cargando...</div>;
const ErrorMessage = ({ message }) => <div className={styles.centeredMessage} style={{ color: 'red' }}>{message}</div>;

export default function GestionVehiculos() {

    const [activeVehicles, setActiveVehicles] = useState([]);
    const [inactiveVehicles, setInactiveVehicles] = useState([]);
    const [view, setView] = useState('activos');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { user } = useUserStore();
    const isReadOnly = user?.rol === 'Invitado';
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState(null);
    const [vehicleToProcess, setVehicleToProcess] = useState(null);

    useEffect(() => {
        const fetchVehiculos = async () => {
            setIsLoading(true);
            try {
                const [activeRes, inactiveRes] = await Promise.all([
                    apiClient.get('/vehiculos/'),
                    apiClient.get('/vehiculos/inactivos/')
                ]);
                setActiveVehicles(activeRes.data.results || activeRes.data);
                setInactiveVehicles(inactiveRes.data.results || inactiveRes.data);
            } catch (err) {
                setError('No se pudo cargar la flota de vehículos.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchVehiculos();
    }, []);

    const handleConfirmAction = async () => {
        if (!vehicleToProcess) return;
        if (modalAction === 'deactivate') {
            try {
                await apiClient.delete(`/vehiculos/${vehicleToProcess.patente}/`);
                setActiveVehicles(prev => prev.filter(v => v.patente !== vehicleToProcess.patente));
                setInactiveVehicles(prev => [...prev, vehicleToProcess]);
            } catch (err) { alert('No se pudo desactivar el vehículo.'); }
        } else if (modalAction === 'reactivate') {
            try {
                const response = await apiClient.post(`/vehiculos/${vehicleToProcess.patente}/reactivar/`);
                setInactiveVehicles(prev => prev.filter(v => v.patente !== vehicleToProcess.patente));
                setActiveVehicles(prev => [...prev, response.data]);
            } catch (err) { alert('No se pudo reactivar el vehículo.'); }
        }
        setIsModalOpen(false);
        setVehicleToProcess(null);
        setModalAction(null);
    };

    const openModal = (vehiculo, action) => {
        setVehicleToProcess(vehiculo);
        setModalAction(action);
        setIsModalOpen(true);
    };

    const vehiculosToShow = view === 'activos' ? activeVehicles : inactiveVehicles;
    const filteredVehiculos = useMemo(() => {
        return vehiculosToShow.filter(v =>
            v.patente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [vehiculosToShow, searchTerm]);

    const currentItems = filteredVehiculos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredVehiculos.length / itemsPerPage);
    const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
    const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <>
            <div className={styles.pageWrapper}>
                <header className={styles.header}>
                    <h1><Car size={32} /> Gestión de Flota</h1>
                    {!isReadOnly && (
                        <button className={styles.addButton} onClick={() => navigate('/vehiculos/crear')}>
                            <Plus size={20} /> Añadir Vehículo
                        </button>
                    )}
                </header>


                <div className={styles.tableCard}>

                    <div className={styles.tableControls}>
                        <div className={styles.segmentedControl}>
                            <button
                                className={`${styles.segment} ${view === 'activos' ? styles.segmentActive : ''}`}
                                onClick={() => { setView('activos'); setCurrentPage(1); }}
                            >
                                Activos ({activeVehicles.length})
                            </button>
                            <button
                                className={`${styles.segment} ${view === 'inactivos' ? styles.segmentActive : ''}`}
                                onClick={() => { setView('inactivos'); setCurrentPage(1); }}
                            >
                                Inactivos ({inactiveVehicles.length})
                            </button>
                        </div>
                        <div className={styles.searchBox}>
                            <Search size={20} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Buscar en esta sección..."
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
                                    <th>Marca</th>
                                    <th>Modelo</th>
                                    <th>Año</th>
                                    <th>Chofer a cargo</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.length > 0 ? currentItems.map(vehiculo => (
                                    <tr key={vehiculo.patente}>
                                        <td>{vehiculo.patente}</td>
                                        <td>{vehiculo.marca}</td>
                                        <td>{vehiculo.modelo}</td>
                                        <td>{vehiculo.anio}</td>
                                        <td>{vehiculo.chofer_nombre}</td>
                                        <td>
                                            {!isReadOnly && (
                                                <div className={styles.actionButtons}>
                                                    {view === 'activos' ? (
                                                        <>
                                                            <button onClick={() => navigate(`/vehiculos/editar/${vehiculo.patente}`)} title="Editar"><Edit size={16} /></button>
                                                            <button onClick={() => openModal(vehiculo, 'deactivate')} title="Desactivar"><Trash2 size={16} /></button>
                                                        </>
                                                    ) : (
                                                        <button onClick={() => openModal(vehiculo, 'reactivate')} title="Reactivar"><CheckCircle size={16} /></button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className={styles.noResults}>
                                            No se encontraron vehículos en esta sección.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>


                    <div className={styles.pagination}>
                        <button onClick={handlePrevPage} disabled={currentPage === 1}>Anterior</button>
                        <span>Página {currentPage} de {totalPages || 1}</span>
                        <button onClick={handleNextPage} disabled={currentPage >= totalPages}>Siguiente</button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmAction}
                title={modalAction === 'deactivate' ? "Confirmar Desactivación" : "Confirmar Reactivación"}
                message={
                    modalAction === 'deactivate' ?
                        `¿Estás seguro de que quieres desactivar el vehículo ${vehicleToProcess?.patente}? Se ocultará de las listas.` :
                        `¿Estás seguro de que quieres reactivar el vehículo ${vehicleToProcess?.patente}? Volverá a estar disponible.`
                }
                confirmButtonText={modalAction === 'deactivate' ? "Sí, Desactivar" : "Sí, Reactivar"}
                intent={modalAction === 'deactivate' ? "danger" : "success"}
            />
        </>
    );
}