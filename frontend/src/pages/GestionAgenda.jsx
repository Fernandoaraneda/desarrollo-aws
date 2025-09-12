import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// Se corrigen las rutas para que sean absolutas desde la raíz del proyecto
import apiClient from '/src/api/axios.js';
import styles from '/src/css/gestionagenda.module.css';
import { Calendar as CalendarIcon, Clock, Truck, User } from 'lucide-react';
import { useUserStore } from '/src/store/authStore.js';

// --- CONFIGURACIÓN DEL SISTEMA ---
const HORA_INICIO = 9; // 9 AM
const HORA_FIN = 17;   // 5 PM
const DURACION_CITA_MINUTOS = 60;

// --- Componente Principal ---
export default function GestionAgenda() {
  const navigate = useNavigate();
  const { user } = useUserStore(); // Obtenemos el usuario logueado
  
  // Estados de la página
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
    // Carga inicial de agendamientos y vehículos
    const loadInitialData = async () => {
      try {
        const [agendamientosRes, vehiculosRes] = await Promise.all([
          apiClient.get('/agendamientos/'),
          apiClient.get('/vehiculos/')
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

  // Genera los horarios disponibles para el día seleccionado
  const availableSlots = useMemo(() => {
    const slots = [];
    const dayStart = new Date(`${selectedDate}T${String(HORA_INICIO).padStart(2, '0')}:00:00`);
    const dayEnd = new Date(`${selectedDate}T${String(HORA_FIN).padStart(2, '0')}:00:00`);
    
    let currentSlot = new Date(dayStart);

    while (currentSlot < dayEnd) {
      slots.push(new Date(currentSlot));
      currentSlot.setMinutes(currentSlot.getMinutes() + DURACION_CITA_MINUTOS);
    }

    const bookedSlots = agendamientos
      .filter(a => new Date(a.fecha_hora_programada).toISOString().split('T')[0] === selectedDate)
      .map(a => new Date(a.fecha_hora_programada).getTime());

    return slots.filter(slot => !bookedSlots.includes(slot.getTime()));
  }, [selectedDate, agendamientos]);

  // Manejo de cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.vehiculo || !formData.fecha_hora_programada || !formData.motivo_ingreso) {
      setError("Por favor, complete todos los campos.");
      return;
    }

    try {
      const response = await apiClient.post('/agendamientos/', {
        ...formData,
        // El backend asigna 'creado_por' automáticamente
      });
      // Actualiza la lista de agendamientos en el estado
      setAgendamientos([...agendamientos, response.data]);
      // Limpia el formulario
      setFormData({ vehiculo: '', motivo_ingreso: '', fecha_hora_programada: '' });
      alert("¡Cita agendada con éxito!");
    } catch (err) {
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : "Error al agendar la cita.";
      setError(errorMsg);
    }
  };

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p style={{color: 'red'}}>{error}</p>;

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <h1><CalendarIcon size={32} /> Agendar Ingreso al Taller</h1>
      </header>

      <div className={styles.contentGrid}>
        <div className={styles.formCard}>
          <h2>Seleccione Fecha y Hora</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.formField}>
              <label htmlFor="fecha">Fecha</label>
              <input 
                type="date" 
                id="fecha"
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} // No se pueden seleccionar fechas pasadas
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
                {vehiculos.map(v => (
                  <option key={v.patente} value={v.patente}>
                    {v.patente} - {v.marca} {v.modelo}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label htmlFor="motivo_ingreso">Motivo del Ingreso</label>
              <textarea 
                name="motivo_ingreso" 
                rows="4"
                placeholder="Ej: Falla en el motor, revisión de 100.000km, etc."
                value={formData.motivo_ingreso} 
                onChange={handleChange}
                required
              ></textarea>
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
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
           <hr style={{margin: '1rem 0'}}/>
          <h3><User size={20} /> Usuario</h3>
          <p>Agendando como: <strong>{user?.first_name} {user?.last_name}</strong> ({user?.rol})</p>
        </div>
      </div>
      
      <div className={styles.tableContainer}>
        <h2>Citas Programadas para el {new Date(selectedDate).toLocaleDateString('es-CL')}</h2>
        <table className={styles.table}>
            <thead>
                <tr>
                    <th>Hora</th>
                    <th>Patente</th>
                    <th>Motivo</th>
                </tr>
            </thead>
            <tbody>
                {agendamientos.filter(a => new Date(a.fecha_hora_programada).toISOString().split('T')[0] === selectedDate)
                .sort((a,b) => new Date(a.fecha_hora_programada) - new Date(b.fecha_hora_programada))
                .map(a => (
                    <tr key={a.id}>
                        <td>{new Date(a.fecha_hora_programada).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{a.vehiculo_patente}</td>
                        <td>{a.motivo_ingreso}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}

