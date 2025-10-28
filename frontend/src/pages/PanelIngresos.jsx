import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/panelingreso.module.css';
import { LogIn, CalendarClock, Search } from 'lucide-react'; // ✅ CAMBIO: Se quitó LogOut

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
        setIsLoading(true);
        setError(null);
        try {
            // ✅ CAMBIO: Usamos la vista específica de seguridad que filtra por 'Confirmado' y por día.
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

    // Registrar ingreso
    const handleRegistrarIngreso = async (id) => {
        // Usamos un modal custom en lugar de window.confirm si está disponible,
        // pero mantenemos la lógica de confirmación.
        if (!confirm("¿Está seguro de que desea registrar el ingreso de este vehículo? Esta acción creará una nueva orden de trabajo.")) {
            return;
        }

        try {
            await apiClient.post(`/agendamientos/${id}/registrar-ingreso/`);
            alert("✅ Ingreso registrado con éxito. Se ha creado la orden de trabajo."); // Reemplazar 'alert' por un modal/toast si se prefiere
            // ✅ SOLUCIÓN PROBLEMA 2: Al registrar, filtramos el agendamiento de la UI.
            // Al recargar (F5), la API /agenda/seguridad/ ya no lo devolverá porque su estado cambió.
            setAgendamientos(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Error al registrar el ingreso.";
            alert(`Error: ${errorMsg}`); // Reemplazar 'alert'
        }
    };

    // ❌ CAMBIO: Se eliminó la función handleRegistrarSalida

    if (isLoading) return <p>Cargando citas por ingresar...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                {/* ✅ CAMBIO: Título actualizado */}
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
                                            {/* ✅ CAMBIO: Solo se deja el botón de Ingreso */}
                                            <button
                                                className={`${styles.actionButton} ${styles.ingresoButton}`}
                                                onClick={() => handleRegistrarIngreso(a.id)}
                                            >
                                                <LogIn size={16} /> Ingreso
                                            </button>
                                            {/* ❌ CAMBIO: Botón de Salida eliminado */}
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
    );
}
