// src/pages/GestionAgenda.jsx

import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/gestionagenda.module.css';
import { Calendar as CalendarIcon, Clock, User, Paperclip } from 'lucide-react';
import { useUserStore } from '/src/store/authStore.js';

const HORA_INICIO = 9;
const HORA_FIN = 17;
const DURACION_CITA_MINUTOS = 60;

export default function GestionAgenda() {
    const { user } = useUserStore();
    
    const [agendamientos, setAgendamientos] = useState([]);
    const [vehiculos, setVehiculos] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [formData, setFormData] = useState({ vehiculo: '', motivo_ingreso: '', fecha_hora_programada: '' });
    const [imagenFile, setImagenFile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [agendamientosRes, vehiculosRes] = await Promise.all([
                    apiClient.get('/agendamientos/'),
                    apiClient.get('/vehiculos/?limit=1000') 
                ]);
                setAgendamientos(agendamientosRes.data.results || agendamientosRes.data || []);
                setVehiculos(vehiculosRes.data.results || vehiculosRes.data || []);
            } catch (err) {
                setError("No se pudieron cargar los datos necesarios.");
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const handleImageChange = (e) => {
        setImagenFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!formData.vehiculo || !formData.fecha_hora_programada || !formData.motivo_ingreso) {
            setError("Por favor, complete todos los campos obligatorios.");
            return;
        }

        const dataParaEnviar = new FormData();
        dataParaEnviar.append('vehiculo', formData.vehiculo);
        dataParaEnviar.append('motivo_ingreso', formData.motivo_ingreso);
        dataParaEnviar.append('fecha_hora_programada', formData.fecha_hora_programada);
        dataParaEnviar.append('duracion_estimada_minutos', DURACION_CITA_MINUTOS);
        dataParaEnviar.append('solicita_grua', formData.solicita_grua || false);


        if (imagenFile) {
            dataParaEnviar.append('imagen_averia', imagenFile);
        }

        try {
            const response = await apiClient.post('/agendamientos/', dataParaEnviar, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            
            // Refresca la lista de agendamientos para el cálculo de horarios
            setAgendamientos(prev => [...prev, response.data]);
            
            // Limpia el formulario
            setFormData({ vehiculo: '', motivo_ingreso: '', fecha_hora_programada: '' });
            setImagenFile(null); 
            e.target.reset();

            alert("¡Cita agendada con éxito! El supervisor la revisará a la brevedad.");
        } catch (err) {
            const errorMsg = err.response?.data ? Object.values(err.response.data).join(', ') : "Error al agendar la cita.";
            setError(errorMsg);
        }
    };

    const availableSlots = useMemo(() => {
        const slots = [];
        const dayStart = new Date(`${selectedDate}T${String(HORA_INICIO).padStart(2, '0')}:00:00`);
        const dayEnd = new Date(`${selectedDate}T${String(HORA_FIN).padStart(2, '0')}:00:00`);
        let currentSlotStart = new Date(dayStart);

        while (currentSlotStart < dayEnd) {
            slots.push(new Date(currentSlotStart));
            currentSlotStart.setMinutes(currentSlotStart.getMinutes() + DURACION_CITA_MINUTOS);
        }

        const bookedRanges = agendamientos.map(a => ({
            start: new Date(a.fecha_hora_programada).getTime(),
            end: new Date(a.fecha_hora_programada).getTime() + (a.duracion_estimada_minutos * 60 * 1000)
        }));

        return slots.filter(slot => {
            const slotTime = slot.getTime();
            return !bookedRanges.some(range => slotTime >= range.start && slotTime < range.end);
        });
    }, [selectedDate, agendamientos]);

    const vehiculosDelUsuario = useMemo(() => {
        if (!user || !vehiculos.length) return [];
        if (user.rol === 'Supervisor') {
            return vehiculos;
        }
        return vehiculos.filter(v => v.chofer === user.id);
    }, [vehiculos, user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (isLoading) return <p>Cargando...</p>;
    
    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><CalendarIcon size={32} /> Agendar Ingreso al Taller</h1>
            </header>

            <div className={styles.contentGrid}>
                <div className={styles.formCard}>
                    <h2>Crear Nueva Cita</h2>
                    <form onSubmit={handleSubmit}>
                        <div className={styles.formField}>
                            <label htmlFor="fecha">Fecha</label>
                            <input 
                                type="date" id="fecha" value={selectedDate} 
                                onChange={e => setSelectedDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="fecha_hora_programada">Horario Disponible</label>
                            <select name="fecha_hora_programada" value={formData.fecha_hora_programada} onChange={handleChange} required>
                                <option value="">-- Seleccione una hora --</option>
                                {availableSlots.map(slot => (
                                    <option key={slot.toISOString()} value={slot.toISOString()}>
                                        {slot.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="vehiculo">Vehículo</label>
                            <select name="vehiculo" value={formData.vehiculo} onChange={handleChange} required>
                                <option value="">-- Seleccione un vehículo --</option>
                                {vehiculosDelUsuario.map(v => (
                                    <option key={v.patente} value={v.patente}>
                                        {v.patente} - {v.marca} {v.modelo}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="motivo_ingreso">Motivo del Ingreso</label>
                            <textarea 
                                name="motivo_ingreso" rows="4"
                                placeholder="Ej: Falla en el motor, revisión de 100.000km, etc."
                                value={formData.motivo_ingreso} 
                                onChange={handleChange}
                                required
                            ></textarea>
                            <div className={styles.formFieldCheckbox}>
                                <input 
                                    type="checkbox" 
                                    id="solicita_grua"
                                    name="solicita_grua"
                                    checked={formData.solicita_grua || false}
                                    onChange={e => setFormData(prev => ({ ...prev, solicita_grua: e.target.checked }))}
                                />
                                <label htmlFor="solicita_grua">El vehículo no puede moverse por sí mismo y necesita una grúa.</label>
                            </div>
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="imagen_averia"><Paperclip size={16} /> Adjuntar Imagen (Opcional)</label>
                            <input 
                                type="file" 
                                id="imagen_averia"
                                name="imagen_averia"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>
                        {error && <p className={styles.errorMessage}>{error}</p>}
                        <button type="submit" className={styles.submitButton}>Agendar Cita</button>
                    </form>
                </div>
                <div className={styles.infoCard}>
                    <h3><Clock size={20} /> Horarios de Atención</h3>
                    <ul>
                        <li>Lunes a Viernes</li>
                        <li>{HORA_INICIO}:00 AM - {HORA_FIN}:00 PM</li>
                        <li>Citas cada {DURACION_CITA_MINUTOS} minutos</li>
                    </ul>
                    <hr />
                    <h3><User size={20} /> Usuario</h3>
                    <p>Agendando como: <strong>{user?.first_name} {user?.last_name}</strong> ({user?.rol})</p>
                </div>
            </div>
        </div>
    );
}