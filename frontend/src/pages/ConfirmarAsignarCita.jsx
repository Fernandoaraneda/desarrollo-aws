import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/ConfirmarAsignarCita.module.css';
import { CalendarCheck, User, Wrench, Image as ImageIcon, Clock, Trash2 } from 'lucide-react';
import AlertModal from '/src/components/modals/AlertModal.jsx';
import ConfirmModal from '/src/components/modals/ConfirmModal.jsx';

import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale/es";
import "react-datepicker/dist/react-datepicker.css"; 


registerLocale("es", es);


const HORA_INICIO = 9;
const HORA_FIN = 19;
const DURACION_CITA_MINUTOS = 60;

export default function ConfirmarAsignarCita() {
    const { id } = useParams();
    const navigate = useNavigate();

    
    const [agendamiento, setAgendamiento] = useState(null);
    const [mecanicos, setMecanicos] = useState([]);

    const [selectedDate, setSelectedDate] = useState(new Date());

    const [selectedMecanicoId, setSelectedMecanicoId] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');

    const [agendaMecanico, setAgendaMecanico] = useState([]);
    const [isLoadingAgenda, setIsLoadingAgenda] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
    const [motivoCambio, setMotivoCambio] = useState('');
    const [fechaOriginal, setFechaOriginal] = useState(null);

 
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

  
    useEffect(() => {
        if (!selectedMecanicoId || !selectedDate) {
            setAgendaMecanico([]);
            return;
        }

      
        const fechaParaAPI = selectedDate.toISOString().split('T')[0];

        const fetchAgendaMecanico = async () => {
            setIsLoadingAgenda(true);
            try {
                const response = await apiClient.get(
                    `/mecanicos/${selectedMecanicoId}/agenda/`,
                    { params: { fecha: fechaParaAPI } } 
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
    }, [selectedMecanicoId, selectedDate]); 


    const availableSlots = useMemo(() => {
        const slots = [];
        
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
            setSuccessMessage("Cita confirmada y asignada con éxito.");
            setIsAlertOpen(true);
        } catch (err) {
            const errorMsg = err.response?.data?.error || "No se pudo completar la acción.";
            setError(errorMsg);
            setIsAlertOpen(true);
        }
    };
    const handleOpenCancelModal = () => {
        setError(null); 
        setSuccessMessage(null);
        setIsConfirmCancelOpen(true);
    };

    
    const handleDoCancel = async () => {
        setIsConfirmCancelOpen(false); 

        try {
            
            await apiClient.post(`/agendamientos/${id}/cancelar/`);

            setSuccessMessage("La cita ha sido cancelada exitosamente.");
            setIsAlertOpen(true);
           

        } catch (err) {
         
            const errorMsg = err.response?.data?.error || "No se pudo cancelar la cita.";
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
                                className={styles.fullWidthImage} 
                            />
                        </a>
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    <hr className={styles.divider} />
                    <h4><CalendarCheck size={16} /> Asignación de Cupo</h4>

                   
                    <div className={styles.formField}>
                        <label htmlFor="selectedDate"><strong>1. Seleccione la Fecha</strong></label>
                       
                        <div className={styles.datePickerWrapper}>
                            <DatePicker
                                id="selectedDate"
                                selected={selectedDate} 
                                onChange={(date) => {
                                    setSelectedDate(date);
                                    setSelectedSlot(''); 
                                }}
                                locale="es" 
                                dateFormat="dd-MM-yyyy" 
                                minDate={new Date()} 
                                className={styles.dateInput}
                                required
                            />
                        </div>
                    </div>
                 


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

                    
                    {fechaOriginal && selectedSlot && selectedSlot !== fechaOriginal && (
                        <div className={styles.formField}>
                            
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
                        <button
                            type="button"
                            className={styles.cancelButton} 
                            style={{ backgroundColor: '#dc2626', color: 'white' }}
                            onClick={handleOpenCancelModal} 
                        >
                            <Trash2 size={16} /> Cancelar Cita
                        </button>
                        <button type="submit" className={styles.submitButton}>Confirmar y Asignar</button>
                    </div>
                </form>
            </div>

            <AlertModal
                isOpen={isAlertOpen}

                onClose={() => {
                    setIsAlertOpen(false);
                    setError(null);

                    if (successMessage) {
                        navigate('/panel-supervisor');
                    }
                    setSuccessMessage(null);
                }}

                title={error ? "Error" : "Éxito"}
                message={error || successMessage}
                intent={error ? "danger" : "success"}
            />
            <ConfirmModal
                isOpen={isConfirmCancelOpen}
                onClose={() => setIsConfirmCancelOpen(false)}
                onConfirm={handleDoCancel}
                title="Confirmar Cancelación"
                message={`¿Estás seguro de que quieres cancelar esta cita? Esta acción marcará la cita como 'Cancelado' y no se podrá revertir.`}
                confirmButtonText="Sí, Cancelar Cita"
                intent="danger"
            />
        </div>
    );
}