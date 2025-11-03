// src/pages/ConfirmarAsignarCita.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/ConfirmarAsignarCita.module.css';
import { CalendarCheck, User, Wrench, Image as ImageIcon, Clock } from 'lucide-react';
import AlertModal from '/src/components/modals/AlertModal.jsx';

// --- 👇 CAMBIO 1: Importar el calendario y el idioma español ---
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale/es"; // Importa el idioma
import "react-datepicker/dist/react-datepicker.css"; // Importa el CSS base del calendario

// --- 👇 CAMBIO 2: Registrar el idioma español ---
registerLocale("es", es);

// (El resto de tus constantes HORA_INICIO, etc. se mantienen)
const HORA_INICIO = 9;
const HORA_FIN = 17;
const DURACION_CITA_MINUTOS = 60;

export default function ConfirmarAsignarCita() {
    const { id } = useParams();
    const navigate = useNavigate();

    // (Estados principales - sin cambios)
    const [agendamiento, setAgendamiento] = useState(null);
    const [mecanicos, setMecanicos] = useState([]);
    
    // --- 👇 CAMBIO 3: 'selectedDate' ahora guarda un objeto Date, no un string ---
    // (Esto es mejor para que el calendario funcione)
    const [selectedDate, setSelectedDate] = useState(new Date()); 
    
    const [selectedMecanicoId, setSelectedMecanicoId] = useState('');
    const [selectedSlot, setSelectedSlot] = useState(''); 
    
    // (El resto de tus estados se mantienen)
    const [agendaMecanico, setAgendaMecanico] = useState([]);
    const [isLoadingAgenda, setIsLoadingAgenda] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [motivoCambio, setMotivoCambio] = useState('');
    const [fechaOriginal, setFechaOriginal] = useState(null);

    // 1. Carga inicial (Cita y lista de Mecánicos)
    useEffect(() => {
        const loadData = async () => {
            try {
                const [agendamientoRes, mecanicosRes] = await Promise.all([
                    apiClient.get(`/agendamientos/${id}/`),
                    apiClient.get('/mecanicos/')
                ]);
                
                setAgendamiento(agendamientoRes.data);
                setMecanicos(mecanicosRes.data || []);

                if (agendamientoRes.data.fecha_hora_programada) {
                    const fecha = new Date(agendamientoRes.data.fecha_hora_programada);
                    // --- 👇 CAMBIO 4: Guardamos un objeto Date ---
                    setSelectedDate(fecha); 
                    setFechaOriginal(fecha.toISOString());
                } else {
                    setFechaOriginal(null); 
                }

            } catch (err) {
                setError("No se pudo cargar la información de la cita.");
                setIsAlertOpen(true);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [id]);

    // 2. Carga la agenda OCUPADA del mecánico
    useEffect(() => {
        if (!selectedMecanicoId || !selectedDate) {
            setAgendaMecanico([]);
            return;
        }

        // --- 👇 CAMBIO 5: Formateamos la fecha (objeto) a string para la API ---
        const fechaParaAPI = selectedDate.toISOString().split('T')[0];

        const fetchAgendaMecanico = async () => {
            setIsLoadingAgenda(true);
            try {
                const response = await apiClient.get(
                    `/mecanicos/${selectedMecanicoId}/agenda/`, 
                    { params: { fecha: fechaParaAPI } } // Usamos el string formateado
                );
                setAgendaMecanico(response.data.results || response.data || []);
            } catch (err) {
                console.warn("No se pudo cargar la agenda del mecánico", err);
                setAgendaMecanico([]);
            } finally {
                setIsLoadingAgenda(false);
            }
        };

        fetchAgendaMecanico();
    }, [selectedMecanicoId, selectedDate]); // <- Se actualiza con ambos

    // 3. Calcula los slots DISPONIBLES
    const availableSlots = useMemo(() => {
        const slots = [];
        // Usamos el string de la fecha para construir los slots
        const fechaString = selectedDate.toISOString().split('T')[0];
        const dayStart = new Date(`${fechaString}T${String(HORA_INICIO).padStart(2, '0')}:00:00`);
        const dayEnd = new Date(`${fechaString}T${String(HORA_FIN).padStart(2, '0')}:00:00`);
        let currentSlotStart = new Date(dayStart);

        while (currentSlotStart < dayEnd) {
            slots.push(new Date(currentSlotStart));
            currentSlotStart.setMinutes(currentSlotStart.getMinutes() + DURACION_CITA_MINUTOS);
        }

        const bookedTimes = agendaMecanico.map(cita => new Date(cita.fecha_hora_programada).getTime());
        const available = slots.filter(slot => !bookedTimes.includes(slot.getTime()));

        const now = new Date();
        const todayString = now.toISOString().split('T')[0];
        const isToday = (fechaString === todayString);
        const nowWithMargin = new Date(now.getTime() + 5 * 60000);

        if (isToday) {
            return available.filter(slot => slot.getTime() > nowWithMargin.getTime());
        }
        
        return available;
    }, [selectedDate, agendaMecanico]);

    // 4. Envía el formulario (Sin cambios)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsAlertOpen(false);

        if (!selectedMecanicoId || !selectedSlot) {
            setError("Debe seleccionar un mecánico y una hora disponible.");
            setIsAlertOpen(true);
            return;
        }
        
        const fechaCambiada = (selectedSlot !== fechaOriginal);
        if (fechaCambiada && fechaOriginal !== null && !motivoCambio) {
        setError("Debe añadir un motivo si cambia la fecha/hora de la cita.");
        setIsAlertOpen(true);
        return;
        }
        
        try {
            await apiClient.post(`/agendamientos/${id}/confirmar-y-asignar/`, {
                mecanico_id: selectedMecanicoId,
                fecha_hora_asignada: selectedSlot, 
                motivo_reagendamiento: motivoCambio
            });
            alert("Cita confirmada y asignada con éxito.");
            navigate('/panel-supervisor');
        } catch (err) {
            const errorMsg = err.response?.data?.error || "No se pudo completar la acción.";
            setError(errorMsg); 
            setIsAlertOpen(true);
        }
    };

    if (isLoading) return <div>Cargando...</div>;
    if (!agendamiento) return <div>No se encontró la cita.</div>;

    const fechaSolicitadaValida = agendamiento.fecha_hora_programada && new Date(agendamiento.fecha_hora_programada).getFullYear() > 1970;

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.formCard}>
                
                {/* (Tu JSX de .formHeader y .infoSection se mantiene igual) */}
                <div className={styles.formHeader}>
                    <h1><CalendarCheck /> Confirmar y Asignar Cita</h1>
                    <p>Revisa los detalles de la solicitud y asigna un cupo.</p>
                </div>

                <div className={styles.infoSection}>
                    <h4><Wrench /> Detalles de la Solicitud</h4>
                    <p><strong>Vehículo:</strong> {agendamiento.vehiculo_patente}</p>
                    <p><strong>Chofer:</strong> {agendamiento.chofer_nombre}</p>
                    {fechaSolicitadaValida && (
                        <p><strong>Fecha Solicitada:</strong> {new Date(agendamiento.fecha_hora_programada).toLocaleString('es-CL')}</p>
                    )}
                    <p><strong>Motivo:</strong> {agendamiento.motivo_ingreso}</p>
                </div>

                {agendamiento.imagen_averia && (
                    <div className={styles.infoSection}>
                        <h4><ImageIcon /> Imagen Adjunta</h4>
                        <a href={agendamiento.imagen_averia} target="_blank" rel="noopener noreferrer">
                            <img 
                                src={agendamiento.imagen_averia} 
                                alt="Avería reportada" 
                                className={styles.fullWidthImage} // Usamos el estilo que ya existe
                            />
                        </a>
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    
                    <hr className={styles.divider} />
                    <h4><CalendarCheck size={16} /> Asignación de Cupo</h4>

                    {/* --- 👇 CAMBIO 5: Reemplazar el <input> feo por el <DatePicker> bonito --- */}
                    <div className={styles.formField}>
                        <label htmlFor="selectedDate"><strong>1. Seleccione la Fecha</strong></label>
                        {/* Usamos un div 'wrapper' para que el CSS lo tome bien */}
                        <div className={styles.datePickerWrapper}> 
                            <DatePicker
                                id="selectedDate"
                                selected={selectedDate} // El estado (objeto Date)
                                onChange={(date) => {
                                    setSelectedDate(date);
                                    setSelectedSlot(''); // Resetea la hora al cambiar de día
                                }}
                                locale="es" // En español
                                dateFormat="dd-MM-yyyy" // Formato
                                minDate={new Date()} // No se pueden elegir días pasados
                                className={styles.dateInput} // Reutiliza tu estilo de input
                                required
                            />
                        </div>
                    </div>
                    {/* --- Fin del reemplazo --- */}


                    <div className={styles.formField}>
                        <label htmlFor="mecanico"><strong>2. Seleccione el Mecánico</strong></label>
                        <select 
                            id="mecanico" 
                            value={selectedMecanicoId} 
                            onChange={(e) => {
                                setSelectedMecanicoId(e.target.value);
                                setSelectedSlot('');
                            }} 
                            required
                        >
                           {/* ... (opciones de mecánico) ... */}
                            <option value="">-- Seleccione un mecánico --</option>
                            {mecanicos.map(m => (
                                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formField}>
                        <label htmlFor="selectedSlot"><strong>3. Seleccione la Hora Disponible</strong></label>
                        <select 
                            id="selectedSlot" 
                            value={selectedSlot} 
                            onChange={(e) => setSelectedSlot(e.target.value)} 
                            required
                            disabled={!selectedMecanicoId || isLoadingAgenda}
                        >
                            {/* ... (opciones de hora) ... */}
                             <option value="">-- {
                                isLoadingAgenda ? "Cargando horas..." : 
                                !selectedMecanicoId ? "Seleccione un mecánico primero" : 
                                "Seleccione una hora"
                            } --</option>
                            
                            {!isLoadingAgenda && availableSlots.map(slot => (
                                <option key={slot.toISOString()} value={slot.toISOString()}>
                                    {slot.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                </option>
                            ))}

                            {!isLoadingAgenda && selectedMecanicoId && availableSlots.length === 0 && (
                                <option disabled>No hay horas libres para este mecánico en este día.</option>
                            )}
                        </select>
                    </div>
                    
                    {/* (El resto de tu formulario, motivo, alerta de grúa y botones se mantiene igual) */}
                    {fechaOriginal && selectedSlot && selectedSlot !== fechaOriginal && (
                        <div className={styles.formField}>
                           {/* ... (textarea de motivo) ... */}
                           <label htmlFor="motivoCambio"><strong>Motivo del Reagendamiento (Obligatorio)</strong></label>
                            <textarea
                                id="motivoCambio"
                                className={styles.textArea}
                                rows="3"
                                value={motivoCambio}
                                onChange={(e) => setMotivoCambio(e.target.value)}
                                placeholder="La hora solicitada no estaba disponible. Se asigna el cupo más próximo."
                            />
                        </div>
                    )}

                    {agendamiento.solicita_grua && (
                        <div className={styles.alertaGrua}>
                            <p><strong>⚠️ ATENCIÓN:</strong> El chofer indicó que el vehículo necesita asistencia de grúa.</p>
                        </div>
                    )}
                    
                    <div className={styles.formActions}>
                        <button type="button" className={styles.cancelButton} onClick={() => navigate('/panel-supervisor')}>Volver</button>
                        <button type="submit" className={styles.submitButton}>Confirmar y Asignar</button>
                    </div>
                </form>
            </div>
            
            <AlertModal 
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
                title="Aviso"
                message={error}
                intent={error ? "danger" : "success"}
            />
        </div>
    );
}