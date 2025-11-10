import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/gestionllaves.module.css'; // Reutilizamos estilos de gestión
import { Package, Plus, Edit, Search, Save, XCircle } from 'lucide-react';
import AlertModal from '/src/components/modals/AlertModal.jsx';

// --- Modal para Crear/Editar Repuestos ---
const RepuestoModal = ({ isOpen, onClose, onSave, producto, onAlert }) => {
    const [formData, setFormData] = useState({
        sku: '',
        nombre: '',
        marca: '',
        descripcion: '',
        precio_venta: 0,
        stock: 0,
    });
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        if (producto) {
            // Modo Edición
            setFormData(producto);
            setIsEditMode(true);
        } else {
            // Modo Creación
            setFormData({
                sku: '', nombre: '', marca: '', descripcion: '', precio_venta: 0, stock: 0,
            });
            setIsEditMode(false);
        }
    }, [producto, isOpen]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        let finalValue = value;

        if (type === 'number') {
            finalValue = value === '' ? '' : parseFloat(value);
            if (isNaN(finalValue) || finalValue < 0) finalValue = 0;
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validación simple
        if (!formData.sku || !formData.nombre) {
            onAlert("SKU y Nombre son obligatorios.");
            return;
        }

        try {
            if (isEditMode) {
                // En modo edición, solo podemos actualizar (PATCH)
                // Usamos el SKU como ID, tal como en tu modelo
                await apiClient.patch(`/productos/${formData.sku}/`, formData);
            } else {
                // En modo creación (POST)
                await apiClient.post('/productos/', formData);
            }
            onSave(); // Llama a la función para recargar y cerrar
        } catch (err) {
            const errorMsg = err.response?.data?.sku?.[0] || err.response?.data?.error || "Error al guardar.";
            onAlert(errorMsg);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>{isEditMode ? 'Editar Repuesto' : 'Añadir Nuevo Repuesto'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formField}>
                        <label>SKU (Código Único)</label>
                        <input
                            type="text"
                            name="sku"
                            value={formData.sku}
                            onChange={handleChange}
                            disabled={isEditMode} // No se puede editar el SKU
                            required
                        />
                    </div>
                    <div className={styles.formField}>
                        <label>Nombre del Repuesto</label>
                        <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.formField}>
                        <label>Marca (Opcional)</label>
                        <input
                            type="text"
                            name="marca"
                            value={formData.marca}
                            onChange={handleChange}
                        />
                    </div>
                    <div className={styles.formField}>
                        <label>Precio de Venta</label>
                        <input
                            type="number"
                            name="precio_venta"
                            value={formData.precio_venta}
                            onChange={handleChange}
                            min="0"
                        />
                    </div>
                    <div className={styles.formField}>
                        <label>Stock Actual</label>
                        <input
                            type="number"
                            name="stock"
                            value={formData.stock}
                            onChange={handleChange}
                            min="0"
                        />
                    </div>
                    
                    <div className={styles.modalActions}>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>
                            <XCircle size={16} /> Cancelar
                        </button>
                        <button type="submit" className={styles.saveButton}>
                            <Save size={16} /> Guardar Repuesto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Componente Principal ---
export default function GestionStock() {
    const [productos, setProductos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para los modales
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [alert, setAlert] = useState({ isOpen: false, message: '', intent: 'danger' });

    // Función para cargar los datos
    const fetchProductos = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/productos/');
            setProductos(res.data.results || res.data || []);
        } catch (err) {
            setError("No se pudo cargar el inventario.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProductos();
    }, []);

    // Memo para el filtrado de búsqueda
    const filteredProductos = useMemo(() => {
        return productos.filter(p =>
            p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.marca && p.marca.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [productos, searchTerm]);

    // Handlers para el Modal
    const handleOpenModal = (producto = null) => {
        setProductoSeleccionado(producto);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setProductoSeleccionado(null);
    };

    const handleSaveSuccess = () => {
        handleCloseModal();
        fetchProductos(); // Recarga la lista de productos
        showAlert("¡Repuesto guardado con éxito!", "success");
    };

    // Handlers para Alertas
    const showAlert = (message, intent = 'danger') => {
        setAlert({ isOpen: true, message, intent });
    };
    const closeAlert = () => {
        setAlert({ isOpen: false, message: '', intent: 'danger' });
    };

    if (isLoading) return <p className={styles.centeredMessage}>Cargando inventario...</p>;
    if (error) return <p className={`${styles.centeredMessage} ${styles.error}`}>{error}</p>;

    return (
        <>
            <div className={styles.pageWrapper}>
                <header className={styles.header}>
                    <h1><Package size={32} /> Gestión de Stock (Repuestos)</h1>
                    <button className={styles.addButton} onClick={() => handleOpenModal(null)}>
                        <Plus size={20} /> Añadir Repuesto
                    </button>
                </header>

                <div className={styles.tableCard}>
                    <div className={styles.tableControls}>
                        <div className={styles.searchBox}>
                            <Search size={20} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Buscar por Nombre, SKU o Marca..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>SKU</th>
                                    <th>Nombre</th>
                                    <th>Marca</th>
                                    <th>Precio Venta</th>
                                    <th>Stock</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProductos.length > 0 ? filteredProductos.map(prod => (
                                    <tr key={prod.sku}>
                                        <td>{prod.sku}</td>
                                        <td>{prod.nombre}</td>
                                        <td>{prod.marca || '---'}</td>
                                        <td>${new Intl.NumberFormat('es-CL').format(prod.precio_venta)}</td>
                                        <td>
                                            <span style={{fontWeight: 'bold', color: prod.stock < 5 ? '#b91c1c' : '#16a34a'}}>
                                                {prod.stock}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.actionButtons}>
                                                <button onClick={() => handleOpenModal(prod)} title="Editar Stock/Precio">
                                                    <Edit size={16} /> Editar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className={styles.noResults}>No se encontraron repuestos.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <RepuestoModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveSuccess}
                    producto={productoSeleccionado}
                    onAlert={showAlert} // Pasamos la función de alerta al modal
                />
            )}
            
            <AlertModal
                isOpen={alert.isOpen}
                onClose={closeAlert}
                title={alert.intent === 'danger' ? 'Error' : 'Éxito'}
                message={alert.message}
                intent={alert.intent}
            />
        </>
    );
}