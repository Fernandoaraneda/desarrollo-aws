// src/pages/ConfirmarAsignarCita.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/ConfirmarAsignarCita.module.css';
import { CalendarCheck, User, Wrench, Image as ImageIcon } from 'lucide-react';

export default function ConfirmarAsignarCita() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [agendamiento, setAgendamiento] = useState(null);
    const [mecanicos, setMecanicos] = useState([]);
    const [selectedMecanicoId, setSelectedMecanicoId] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [agendamientoRes, mecanicosRes] = await Promise.all([
                    apiClient.get(`/agendamientos/${id}/`),
                    apiClient.get('/mecanicos/')
                ]);
                setAgendamiento(agendamientoRes.data);
                setMecanicos(mecanicosRes.data || []);
            } catch (err) {
                setError("No se pudo cargar la información de la cita.");
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMecanicoId) {
            setError("Debes seleccionar un mecánico para asignar.");
            return;
        }
        try {
            await apiClient.post(`/agendamientos/${id}/confirmar-y-asignar/`, {
                mecanico_id: selectedMecanicoId
            });
            alert("Cita confirmada y asignada con éxito.");
            navigate('/panel-supervisor'); // Volver al panel
        } catch (err) {
            setError(err.response?.data?.error || "No se pudo completar la acción.");
        }
    };

    if (isLoading) return <div>Cargando...</div>;
    if (error) return <p style={{color: 'red'}}>{error}</p>;
    if (!agendamiento) return <div>No se encontró la cita.</div>;

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.formCard}>
                <div className={styles.formHeader}>
                    <h1><CalendarCheck /> Confirmar y Asignar Cita</h1>
                    <p>Revisa los detalles de la cita y asigna un mecánico para el trabajo.</p>
                </div>

                <div className={styles.infoSection}>
                    <h4><Wrench /> Detalles del Agendamiento</h4>
                    <p><strong>Vehículo:</strong> {agendamiento.vehiculo_patente}</p>
                    <p><strong>Chofer:</strong> {agendamiento.chofer_nombre}</p>
                    <p><strong>Fecha y Hora:</strong> {new Date(agendamiento.fecha_hora_programada).toLocaleString('es-CL')}</p>
                    <p><strong>Motivo:</strong> {agendamiento.motivo_ingreso}</p>
                </div>

                {agendamiento.imagen_averia && (
                    <div className={styles.infoSection}>
                        <h4><ImageIcon /> Imagen Adjunta</h4>
                        <img src={agendamiento.imagen_averia} alt="Avería reportada" className={styles.fullWidthImage} />
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    <div className={styles.formField} style={{marginTop: '2rem'}}>
                        <label htmlFor="mecanico"><strong>Asignar a Mecánico</strong></label>
                        <select id="mecanico" value={selectedMecanicoId} onChange={(e) => setSelectedMecanicoId(e.target.value)} required>
                            <option value="">-- Seleccione un mecánico --</option>
                            {mecanicos.map(m => (
                                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                            ))}
                        </select>
                    </div>

                    {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
                    
                    <div className={styles.formActions}>
                        <button type="button" className={styles.cancelButton} onClick={() => navigate('/panel-supervisor')}>Volver</button>
                        <button type="submit" className={styles.submitButton}>Confirmar y Asignar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Sugerencia: Añade estos estilos a tu `creareditarvehiculo.module.css` para la imagen y la sección de info
/*
.infoSection {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}
.infoSection h4 {
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.fullWidthImage {
  width: 100%;
  max-height: 500px;
  object-fit: contain;
  border-radius: 8px;
  background-color: #f3f4f6;
}
*/