import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/gestionagenda.module.css';
import { Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { useUserStore } from '/src/store/authStore.js';

const HORA_INICIO = 9; // 9 AM
const HORA_FIN = 17;   // 5 PM
const DURACION_CITA_MINUTOS = 60;

export default function GestionAgenda() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  
  const [agendamientos, setAgendamientos] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    vehiculo: '',
    motivo_ingreso: '',
    fecha_hora_programada: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [agendamientosRes, vehiculosRes] = await Promise.all([
          apiClient.get('/agendamientos/'),
          apiClient.get('/vehiculos/?limit=1000') // Pedimos todos los vehículos
        ]);
        setAgendamientos(agendamientosRes.data);
        setVehiculos(vehiculosRes.data.results || vehiculosRes.data);
      } catch (err) {
        setError("No se pudieron cargar los datos necesarios.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.vehiculo || !formData.fecha_hora_programada || !formData.motivo_ingreso) {
      setError("Por favor, complete todos los campos.");
      return;
    }

    try {
      const payload = {
          ...formData,
          duracion_estimada_minutos: DURACION_CITA_MINUTOS
      };
      const response = await apiClient.post('/agendamientos/', payload);
      setAgendamientos([...agendamientos, response.data]);
      setFormData({ vehiculo: '', motivo_ingreso: '', fecha_hora_programada: '' });
      alert("¡Cita agendada con éxito!");
    } catch (err) {
      const errorMsg = err.response?.data ? Object.values(err.response.data).join(', ') : "Error al agendar la cita.";
      setError(errorMsg);
    }
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

      {/* --- ✅ SECCIÓN NUEVA: TABLA SOLO PARA SUPERVISORES --- */}
      {user.rol === 'Supervisor' && (
        <div className={styles.tableCard}>
          <h2>Citas Programadas para el {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Patente</th>
                        <th>Chofer</th>
                        <th>Motivo</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {agendamientos
                     .filter(a => new Date(a.fecha_hora_programada).toISOString().split('T')[0] === selectedDate)
                     .sort((a,b) => new Date(a.fecha_hora_programada) - new Date(b.fecha_hora_programada))
                     .map(a => (
                        <tr key={a.id}>
                            <td>{new Date(a.fecha_hora_programada).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td>{a.vehiculo_patente}</td>
                            <td>{a.chofer_nombre}</td>
                            <td>{a.motivo_ingreso}</td>
                            <td><span className={`${styles.statusBadge} ${styles[a.estado.toLowerCase()]}`}>{a.estado}</span></td>
                        </tr>
                    ))}
                    {agendamientos.filter(a => new Date(a.fecha_hora_programada).toISOString().split('T')[0] === selectedDate).length === 0 && (
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>No hay citas programadas para esta fecha.</td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}