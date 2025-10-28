import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '/src/api/axios.js';
// 1. Asegúrate que este sea el nombre de tu archivo CSS
import styles from '/src/css/panelsalida.module.css'; 
import { LogOut, Search } from 'lucide-react';

export default function PanelSalida() {
    const [ordenes, setOrdenes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filtrado por patente (puedes añadir más campos)
    const filteredOrdenes = useMemo(() => {
        if (!searchTerm) return ordenes;
        return ordenes.filter(o =>
            (o.vehiculo_patente?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            // (Puedes añadir búsqueda por chofer si el serializer lo incluye)
            // || (o.chofer_nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
    }, [ordenes, searchTerm]);

    // Carga de órdenes listas para salir
    const fetchOrdenesPorSalir = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 2. Llama al endpoint GET que creamos
            const response = await apiClient.get('/ordenes/pendientes-salida/');
            setOrdenes(response.data); // Asumimos que la respuesta es una lista [ ]
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

    // Función para registrar la SALIDA
    const handleRegistrarSalida = async (id) => {
        if (!confirm("¿Está seguro de que desea registrar la SALIDA de este vehículo?")) {
            return;
        }

        try {
            // 3. Llama al endpoint POST que creamos
            await apiClient.post(`/ordenes/${id}/registrar-salida/`);
            alert("✅ Salida registrada con éxito.");
            
            // 4. Actualiza la UI: quita la orden de la lista
            setOrdenes(prevOrdenes => prevOrdenes.filter(o => o.id !== id));
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Error al registrar la salida.";
            alert(`Error: ${errorMsg}`);
        }
    };

    if (isLoading) return <p>Cargando vehículos listos para salir...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
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
                                        {/* 5. Asegúrate que estos campos coincidan con el Serializer */}
                                        <td>{o.vehiculo_patente}</td>
                                        <td>{o.chofer_nombre}</td>
                                        <td>{o.mecanico_nombre}</td>
                                        <td>{o.diagnostico_tecnico || o.descripcion_falla}</td>
                                        {/* Puedes crear un estilo CSS para 'estadoFinalizado' */}
                                        <td><span className={styles.estadoFinalizado}>{o.estado}</span></td>
                                        <td>
                                            <button
                                                className={`${styles.actionButton} ${styles.salidaButton}`}
                                                onClick={() => handleRegistrarSalida(o.id)}
                                            >
                                                <LogOut size={16} /> Registrar Salida
                                            </button>
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
    );
}