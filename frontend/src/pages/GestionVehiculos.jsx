import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// Se corrigen las rutas para que sean absolutas desde la raíz del proyecto
import apiClient from '/src/api/axios.js';
import styles from '/src/css/gestionvehiculos.module.css';
import { Car, Plus, Edit, Trash2, Search } from 'lucide-react';
import ConfirmModal from '/src/components/modals/ConfirmModal.jsx';

// --- Componentes de Carga y Error (sin cambios) ---
const LoadingSpinner = () => (
  <div className={styles.centeredMessage}>Cargando vehículos...</div>
);
const ErrorMessage = ({ message }) => (
  <div className={styles.centeredMessage} style={{ color: 'red' }}>{message}</div>
);

// --- Componente Principal de la Página (Modificado) ---
export default function GestionVehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Se añaden estados para manejar el modal de eliminación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  useEffect(() => {
    const fetchVehiculos = async () => {
      try {
        const response = await apiClient.get('/vehiculos/');
        setVehiculos(response.data.results || response.data);
      } catch (err) {
        setError('No se pudo cargar la flota de vehículos. Verifique su conexión y permisos.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchVehiculos();
  }, []);

  // Lógica para eliminar el vehículo
  const handleDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      // Se envía la petición DELETE a la API de Django
      await apiClient.delete(`/vehiculos/${vehicleToDelete.patente}/`);
      // Se actualiza la lista en el frontend para reflejar la eliminación
      setVehiculos(vehiculos.filter(v => v.patente !== vehicleToDelete.patente));
    } catch (err) {
      alert('No se pudo eliminar el vehículo. Inténtalo de nuevo.');
    } finally {
      setIsModalOpen(false);
      setVehicleToDelete(null);
    }
  };

  // Función para abrir el modal de confirmación
  const openDeleteModal = (vehiculo) => {
    setVehicleToDelete(vehiculo);
    setIsModalOpen(true);
  };

  const filteredVehiculos = useMemo(() => {
    // ... (lógica de filtrado sin cambios)
    return vehiculos.filter(v =>
      v.patente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vehiculos, searchTerm]);

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
          <button className={styles.addButton} onClick={() => navigate('/vehiculos/crear')}>
            <Plus size={20} />
            Añadir Vehículo
          </button>
        </header>
        <div className={styles.controls}>
            {/* ... (barra de búsqueda sin cambios) ... */}
            <div className={styles.searchBox}>
              <Search size={20} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por patente, marca o modelo..."
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
            <th>Chofer a cargo</th>  {/* Cambié la cabecera */}
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
            <td>{vehiculo.chofer_nombre}</td> {/* Aquí usamos el campo del serializer */}
            <td>
              <div className={styles.actionButtons}>
                <button onClick={() => navigate(`/vehiculos/editar/${vehiculo.patente}`)}><Edit size={16} /></button>
                <button onClick={() => openDeleteModal(vehiculo)}><Trash2 size={16} /></button>
              </div>
            </td>
          </tr>
        )) : (
          <tr>
            <td colSpan="6" className={styles.noResults}>No se encontraron vehículos.</td>
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

      {/* Se añade el modal de confirmación al final */}
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDelete}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que quieres eliminar el vehículo con patente ${vehicleToDelete?.patente}? Esta acción es permanente.`}
        confirmButtonText="Sí, Eliminar"
        intent="danger"
      />
    </>
  );
}

