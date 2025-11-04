import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/gestionllaves.module.css'; 
import { History, Search, Clock, LogIn, LogOut } from 'lucide-react';

export default function HistorialSeguridad() {
    const [historial, setHistorial] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        
    
        const fetchHistorial = async () => {
            try {
            
                const response = await apiClient.get('/historial-seguridad/', {
                    params: { search: searchTerm }
                });
                setHistorial(response.data.results || response.data || []);
            } catch (err) {
                setError("No se pudo cargar el historial de movimientos.");
            } finally {
                setIsLoading(false);
            }
        };

        const timerId = setTimeout(() => {
            fetchHistorial();
        }, 300);r

        return () => clearTimeout(timerId); 
    }, [searchTerm]);

    const formatFecha = (fechaISO) => {
        if (!fechaISO) return null;
        return new Date(fechaISO).toLocaleString('es-CL');
    };

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><History size={32} /> Historial de Movimientos</h1>
                <p>Registro de todos los ingresos y salidas del taller.</p>
            </header>

            <div className={styles.tableCard}>
                <div className={styles.tableControls}>
                    <div className={styles.searchBox}>
                        <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Buscar por Patente o Nombre de Chofer..."
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
                                <th>Fecha Ingreso</th>
                                <th>Fecha Salida</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="4" className={styles.noResults}>Cargando...</td></tr>
                            ) : error ? (
                                <tr><td colSpan="4" className={styles.noResults} style={{color: 'red'}}>{error}</td></tr>
                            ) : historial.length > 0 ? (
                                historial.map(orden => (
                                    <tr key={orden.id}>
                                        <td>{orden.vehiculo_patente}</td>
                                        <td>{orden.chofer_nombre}</td>
                                        <td style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                            <LogIn size={16} color="#16a34a" />
                                            {formatFecha(orden.fecha_ingreso)}
                                        </td>
                                        <td>
                                            {orden.fecha_entrega_real ? (
                                                <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                                    <LogOut size={16} color="#dc2626" />
                                                    {formatFecha(orden.fecha_entrega_real)}
                                                </span>
                                            ) : (
                                                <span style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#f97316'}}>
                                                    <Clock size={16} />
                                                    En Taller
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" className={styles.noResults}>No se encontraron movimientos.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}