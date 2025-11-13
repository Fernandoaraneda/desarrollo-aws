import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '/src/api/axios.js';
import styles from '../css/gestionagenda.module.css';
import { Calendar as CalendarIcon, User, Paperclip, Truck } from 'lucide-react'; 
import { useUserStore } from '/src/store/authStore.js';
import AlertModal from '/src/components/modals/AlertModal.jsx';

export default function GestionAgenda() {
    const { user } = useUserStore();
    const [vehiculos, setVehiculos] = useState([]);

    
    const [formData, setFormData] = useState({
        vehiculo: '',
        motivo_ingreso: '',
        solicita_grua: false,
        direccion_grua: '',
        es_mantenimiento: false
    });
    const [imagenFile, setImagenFile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        const loadVehiculos = async () => {
            setIsLoading(true);
            try {
                const vehiculosRes = await apiClient.get('/vehiculos/?limit=1000');
                setVehiculos(vehiculosRes.data.results || vehiculosRes.data || []);
            } catch (err) {
                setError("No se pudieron cargar los vehículos.");
                setIsAlertOpen(true);
            } finally {
                setIsLoading(false);
            }
        };
        loadVehiculos();
    }, []);

    const handleImageChange = (e) => {
        setImagenFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsAlertOpen(false);

        if (!formData.vehiculo) {
            setError("Por favor, complete el vehículo.");
            setIsAlertOpen(true);
            return;
        }

        
        if (!formData.es_mantenimiento && !formData.motivo_ingreso) {
            setError("Por favor, complete el motivo del ingreso (o marque 'Es Mantenimiento').");
            setIsAlertOpen(true);
            return;
        }

        const dataParaEnviar = new FormData();
        dataParaEnviar.append('vehiculo', formData.vehiculo);
        dataParaEnviar.append('motivo_ingreso', formData.es_mantenimiento ? 'Mantenimiento General' : formData.motivo_ingreso);
        dataParaEnviar.append('solicita_grua', formData.solicita_grua || false);
        dataParaEnviar.append('duracion_estimada_minutos', 60);
        dataParaEnviar.append('es_mantenimiento', formData.es_mantenimiento || false);
        
        if (formData.solicita_grua) {
            dataParaEnviar.append('direccion_grua', formData.direccion_grua);
        }

        if (imagenFile) {
            dataParaEnviar.append('imagen_averia', imagenFile);
        }

        try {
            await apiClient.post('/agendamientos/', dataParaEnviar, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            
            setFormData({ vehiculo: '', motivo_ingreso: '', solicita_grua: false, direccion_grua: '', es_mantenimiento: false });
            setImagenFile(null);
            if (e.target) e.target.reset();
            setSuccessMessage("¡Solicitud de cita enviada! El supervisor la revisará y le asignará una hora a la brevedad.");
            setIsAlertOpen(true);

        } catch (err) {
            const errorData = err.response?.data;
            let errorMsg = "Error al enviar la solicitud.";
            if (typeof errorData === 'string') {
                errorMsg = errorData;
            } else if (errorData && typeof errorData === 'object') {
                errorMsg = errorData.non_field_errors?.[0] || Object.values(errorData)[0];
            }
            setError(String(errorMsg));
            setIsAlertOpen(true);
        }
    };

    const vehiculosDelUsuario = useMemo(() => {
        if (!user || !vehiculos.length) return [];
        if (user.rol === 'Supervisor' || user.rol === 'Administrativo') {
            return vehiculos;
        }
        return vehiculos.filter(v => v.chofer === user.id);
    }, [vehiculos, user]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: type === 'checkbox' ? checked : value };

            
            if (name === 'es_mantenimiento') {
                if (checked) {
                    
                    newState.motivo_ingreso = 'Mantenimiento General';
                } else {
                    
                    newState.motivo_ingreso = '';
                }
            }
            return newState;
        });
    };

    if (isLoading) return <p>Cargando...</p>;

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><CalendarIcon size={32} /> Solicitar Ingreso al Taller</h1>
            </header>

            <div className={styles.contentGrid}>
                <div className={styles.formCard}>
                    <h2>Crear Nueva Solicitud</h2>

                    <form onSubmit={handleSubmit}>

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
                            <div className={styles.formFieldCheckbox}>
                                <input
                                    type="checkbox"
                                    id="es_mantenimiento"
                                    name="es_mantenimiento"
                                    checked={formData.es_mantenimiento}
                                    onChange={handleChange}
                                />
                                <label htmlFor="es_mantenimiento" style={{ fontWeight: 'bold' }}>
                                    Es Mantenimiento General (Revisión, cambio de aceite, filtros)
                                </label>
                            </div>
                            <textarea
                                name="motivo_ingreso" rows="4"
                                placeholder="Ej: Falla en el motor, etc."
                                value={formData.motivo_ingreso}
                                onChange={handleChange}


                                required={!formData.es_mantenimiento} 
                                readOnly={formData.es_mantenimiento} 
                                style={formData.es_mantenimiento ? { backgroundColor: '#f3f4f6', color: '#6b7280' } : {}}
                            ></textarea>

                            <div className={styles.formFieldCheckbox}>
                                <input
                                    type="checkbox"
                                    id="solicita_grua"
                                    name="solicita_grua"
                                    checked={formData.solicita_grua}
                                    onChange={handleChange}
                                />
                                <label htmlFor="solicita_grua"><Truck size={16} style={{ marginRight: '8px' }} /> El vehículo no puede moverse por sí mismo y necesita una grúa.</label>
                            </div>
                        </div>

                        
                        {formData.solicita_grua && (
                            <div className={styles.formField}>
                                <label htmlFor="direccion_grua" style={{ color: '#b91c1c', fontWeight: 'bold' }}>Dirección de Retiro (Grúa)</label>
                                <textarea
                                    id="direccion_grua"
                                    name="direccion_grua"
                                    rows="3"
                                    placeholder="Escriba la dirección exacta donde está el vehículo..."
                                    value={formData.direccion_grua}
                                    onChange={handleChange}
                                    required
                                ></textarea>
                            </div>
                        )}

                        <div className={styles.formField}>
                            <label htmlFor="imagen_averia"><Paperclip size={16} /> Adjuntar Imagen (Opcional)</label>
                            <input
                                type="file"
                                id="imagen_averia"
                                name="imagen_averia"
                                accept=".jpg,.jpeg,.png,.gif,.pdf,.ppt,.pptx,.xls,.xlsx"
                                onChange={handleImageChange}
                            />
                        </div>

                        <button type="submit" className={styles.submitButton} style={{ marginTop: '1rem' }}>Enviar Solicitud</button>
                    </form>
                </div>

                <div className={styles.infoCard}>
                    <h3><User size={20} /> Proceso de Solicitud</h3>
                    <p>1. Envíe su solicitud (vehículo y motivo).</p>
                    <p>2. Un supervisor revisará la solicitud y asignará una fecha, hora y mecánico.</p>
                    <p>3. Recibirá una notificación (y/o correo) con los detalles de su cita.</p>
                </div>
            </div>

            <AlertModal
                isOpen={isAlertOpen}
                onClose={() => {
                    setIsAlertOpen(false);
                    setError(null);
                    setSuccessMessage(null);
                }}
                title={error ? "Error" : "Éxito"}
                message={error || successMessage}
                intent={error ? "danger" : "success"}
            />
        </div>
    );
}
