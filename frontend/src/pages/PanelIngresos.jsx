// src/pages/PanelIngresos.jsx

import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/panelingreso.module.css';
import { LogIn, LogOut, CalendarClock, Search } from 'lucide-react';

export default function PanelIngresos() {
    const [agendamientos, setAgendamientos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filtrado por patente o chofer
    const filteredAgendamientos = useMemo(() => {
        if (!searchTerm) return agendamientos;
        return agendamientos.filter(a =>
            (a.vehiculo_patente?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (a.chofer_nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
    }, [agendamientos, searchTerm]);

    // Carga de citas confirmadas
    const fetchCitasPorIngresar = async () => {
        try {
            const response = await apiClient.get('/agendamientos/', {
                params: { estado: 'Confirmado' }
            });
            setAgendamientos(response.data.results || response.data || []);
        } catch (err) {
            setError("No se pudieron cargar las citas pendientes de ingreso.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCitasPorIngresar();
    }, []);

    // Registrar ingreso
    const handleRegistrarIngreso = async (id) => {
        if (!window.confirm("¿Está seguro de que desea registrar el ingreso de este vehículo? Esta acción creará una nueva orden de trabajo.")) {
            return;
        }

        try {
            await apiClient.post(`/agendamientos/${id}/registrar-ingreso/`);
            alert("✅ Ingreso registrado con éxito. Se ha creado la orden de trabajo.");
            setAgendamientos(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Error al registrar el ingreso.";
            alert(`Error: ${errorMsg}`);
        }
    };

    // Registrar salida
    const handleRegistrarSalida = async (id) => {
        if (!window.confirm("¿Está seguro de que desea registrar la salida de este vehículo?")) {
            return;
        }

        try {
            await apiClient.post(`/agendamientos/${id}/registrar-salida/`);
            alert("🚗 Salida registrada con éxito.");
            setAgendamientos(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Error al registrar la salida.";
            alert(`Error: ${errorMsg}`);
        }
    };

    if (isLoading) return <p>Cargando citas por ingresar...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><CalendarClock size={32} /> Panel de Ingresos y Salidas</h1>
                <p>Vehículos con cita confirmada esperando ingreso o salida.</p>
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
                                            <button
                                                className={`${styles.actionButton} ${styles.salidaButton}`}
                                                onClick={() => handleRegistrarSalida(a.id)}
                                                style={{ marginLeft: '8px' }}
                                            >
                                                <LogOut size={16} /> Salida
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>
                                        No se encontraron citas que coincidan con la búsqueda.
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
