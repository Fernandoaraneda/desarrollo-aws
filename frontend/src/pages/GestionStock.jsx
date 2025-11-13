import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '/src/api/axios.js';
import styles from '../css/gestionstock.module.css';
import AlertModal from '/src/components/modals/AlertModal.jsx';
import { Package, Plus, Edit, Search, Save, XCircle, Hash, Bookmark, DollarSign, Boxes, Trash2 } from 'lucide-react'; // <-- Añadir Trash2
import ConfirmModal from '/src/components/modals/ConfirmModal.jsx';
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
            setFormData(producto);
            setIsEditMode(true);
        } else {
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
            if (value === '') {
                finalValue = '';
            } else {
                finalValue = parseFloat(value);
                if (isNaN(finalValue) || finalValue < 0) finalValue = 0;
            }
        }
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        if (e.target.type === 'number' && value === '') {
            setFormData(prev => ({ ...prev, [name]: 0 }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. VALIDACIÓN CAMBIADA: Solo chequear el nombre
        if (!formData.nombre) {
            onAlert("El Nombre es obligatorio.");
            return;
        }

        const dataToSave = {
            ...formData,
            precio_venta: parseFloat(formData.precio_venta) || 0,
            stock: parseInt(formData.stock, 10) || 0,
        };

        // 2. LÓGICA CAMBIADA: Borrar el SKU si es un producto nuevo
        if (!isEditMode) {
            delete dataToSave.sku;
        }

        try {
            if (isEditMode) {
                // Patch (editar) usa el SKU en la URL
                await apiClient.patch(`/productos/${formData.sku}/`, dataToSave);
            } else {
                // Post (crear) ahora va SIN SKU. El backend lo generará.
                await apiClient.post('/productos/', dataToSave);
            }
            onSave();
        } catch (err) {
            const errorMsg = err.response?.data?.nombre?.[0] || err.response?.data?.error || "Error al guardar.";
            onAlert(errorMsg);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>{isEditMode ? 'Editar Repuesto' : 'Añadir Nuevo Repuesto'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGrid}>

                        {/* 3. CAMPO SKU CONDICIONAL */}
                        {isEditMode && (
                            <div className={`${styles.formField} ${styles.spanFull}`}>
                                <label><Hash size={16} /> SKU (Código Único)</label>
                                <input
                                    type="text"
                                    name="sku"
                                    value={formData.sku}
                                    disabled={true} // Siempre deshabilitado
                                    className={styles.formInput}
                                />
                            </div>
                        )}

                        {/* Campo Nombre (siempre ocupa todo el ancho) */}
                        <div className={`${styles.formField} ${styles.spanFull}`}>
                            <label><Package size={16} /> Nombre del Repuesto</label>
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                required
                                className={styles.formInput}
                                placeholder="Ej: Pastillas de Freno Delanteras"
                            />
                        </div>

                        {/* Campo Marca (siempre ocupa todo el ancho) */}
                        <div className={`${styles.formField} ${styles.spanFull}`}>
                            <label><Bookmark size={16} /> Marca (Opcional)</label>
                            <input
                                type="text"
                                name="marca"
                                value={formData.marca}
                                onChange={handleChange}
                                className={styles.formInput}
                                placeholder="Ej: Bosch, Aisin"
                            />
                        </div>

                        {/* Campo Precio */}
                        <div className={styles.formField}>
                            <label><DollarSign size={16} /> Precio de Venta</label>
                            <input
                                type="number"
                                name="precio_venta"
                                value={formData.precio_venta}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                min="0"
                                className={styles.formInput}
                            />
                        </div>

                        {/* Campo Stock */}
                        <div className={styles.formField}>
                            <label><Boxes size={16} /> Stock Actual</label>
                            <input
                                type="number"
                                name="stock"
                                value={formData.stock}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                min="0"
                                className={styles.formInput}
                            />
                        </div>

                    </div> {/* Fin de .formGrid */}

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



export default function GestionStock() {
    const [productos, setProductos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');


    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [alert, setAlert] = useState({ isOpen: false, message: '', intent: 'danger' });

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [productoParaEliminar, setProductoParaEliminar] = useState(null);


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


    const filteredProductos = useMemo(() => {
        return productos.filter(p =>
            p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.marca && p.marca.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [productos, searchTerm]);


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
        fetchProductos();
        showAlert("¡Repuesto guardado con éxito!", "success");
    };


    const showAlert = (message, intent = 'danger') => {
        setAlert({ isOpen: true, message, intent });
    };
    const closeAlert = () => {
        setAlert({ isOpen: false, message: '', intent: 'danger' });
    };

    const handleDeleteClick = (producto) => {
        setProductoParaEliminar(producto);
        setIsConfirmOpen(true);
    };

    // 2. Cierra el modal de confirmación
    const handleCloseConfirm = () => {
        setIsConfirmOpen(false);
        setProductoParaEliminar(null);
    };

    // 3. Al confirmar la eliminación
    const handleConfirmDelete = async () => {
        if (!productoParaEliminar) return;

        try {
            // Llama a la API (DELETE /productos/{sku}/)
            await apiClient.delete(`/productos/${productoParaEliminar.sku}/`);

            // Cierra el modal y recarga los datos
            handleCloseConfirm();
            fetchProductos();

            // Muestra alerta de éxito
            showAlert(`Producto "${productoParaEliminar.nombre}" eliminado con éxito.`, "success");

        } catch (err) {
            // Manejo de errores (ej: El producto no se puede borrar si está en una OrdenItem (PROTECT))
            handleCloseConfirm();
            const errorMsg = err.response?.data?.detail || err.response?.data?.error || "Error al eliminar el producto. Es probable que esté siendo usado en una orden de servicio.";
            showAlert(errorMsg, 'danger');
        }
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
                                            <span style={{ fontWeight: 'bold', color: prod.stock < 5 ? '#b91c1c' : '#16a34a' }}>
                                                {prod.stock}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.actionButtons}>
                                                <button onClick={() => handleOpenModal(prod)} title="Editar Stock/Precio">
                                                    <Edit size={16} /> Editar

                                                </button>
                                                <button
                                                    className={styles.deleteButton}
                                                    onClick={() => handleDeleteClick(prod)}
                                                    title="Eliminar Repuesto">
                                                    <Trash2 size={16} /> Eliminar
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
                    onAlert={showAlert}
                />
            )}

            <AlertModal
                isOpen={alert.isOpen}
                onClose={closeAlert}
                title={alert.intent === 'danger' ? 'Error' : 'Éxito'}
                message={alert.message}
                intent={alert.intent}
            />

            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={handleCloseConfirm}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message={`¿Estás seguro de que deseas eliminar el producto "${productoParaEliminar?.nombre}" (SKU: ${productoParaEliminar?.sku})? Esta acción no se puede deshacer.`}
            />
        </>
    );
}