import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/gestionagenda.module.css';
import { Calendar as CalendarIcon, User, Paperclip } from 'lucide-react';
import { useUserStore } from '/src/store/authStore.js';
import AlertModal from '/src/components/modals/AlertModal.jsx';

export default function GestionAgenda() {
    const { user } = useUserStore();

    // --- Estados Simplificados ---
    const [vehiculos, setVehiculos] = useState([]);
    // El formData NO incluye fecha_hora_programada
    const [formData, setFormData] = useState({ vehiculo: '', motivo_ingreso: '', solicita_grua: false });
    const [imagenFile, setImagenFile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Estados para el Modal de Error
    const [error, setError] = useState(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);
    // Carga inicial (Solo vehículos)
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
    }, []); // <- Se ejecuta solo una vez

    // --- ARREGLO 2: Lógica de 'fetchCapacidad' y 'availableSlots' ELIMINADA ---
    // (Ya no hay código aquí, no se usa 'selectedDate')

    const handleImageChange = (e) => {
        setImagenFile(e.target.files[0]);
    };

    // --- ARREGLO 3: handleSubmit CORREGIDO (estaba faltando en tu archivo) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsAlertOpen(false);

        // 1. Validar que los campos necesarios estén
        if (!formData.vehiculo || !formData.motivo_ingreso) {
            setError("Por favor, complete el vehículo y el motivo.");
            setIsAlertOpen(true);
            return;
        }

        // 2. Construir el FormData para enviar
        const dataParaEnviar = new FormData();
        dataParaEnviar.append('vehiculo', formData.vehiculo);
        dataParaEnviar.append('motivo_ingreso', formData.motivo_ingreso);
        dataParaEnviar.append('solicita_grua', formData.solicita_grua || false);
        dataParaEnviar.append('duracion_estimada_minutos', 60); // Valor fijo

        // NO enviamos 'fecha_hora_programada'. El backend la guardará como NULO.
        // (Asegúrate de haber hecho la migración de 'null=True' en el models.py)

        if (imagenFile) {
            dataParaEnviar.append('imagen_averia', imagenFile);
        }

        // 3. Enviar a la API
        try {
            await apiClient.post('/agendamientos/', dataParaEnviar, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // 4. Limpiar formulario y notificar éxito
            setFormData({ vehiculo: '', motivo_ingreso: '', solicita_grua: false });
            setImagenFile(null);
            if (e.target) e.target.reset(); // Resetea el input de archivo
            setSuccessMessage("¡Solicitud de cita enviada! El supervisor la revisará y le asignará una hora a la brevedad.");
            setIsAlertOpen(true);

        } catch (err) {
            // 5. Manejar errores (ej: el validador de duplicados del Serializer)
            const errorData = err.response?.data;
            let errorMsg = "Error al enviar la solicitud.";
            if (typeof errorData === 'string') {
                errorMsg = errorData;
            } else if (errorData && typeof errorData === 'object') {
                // Captura el error de 'validate' (non_field_errors)
                errorMsg = errorData.non_field_errors?.[0] || Object.values(errorData)[0];
            }

            setError(String(errorMsg)); // Asegurarnos que sea string
            setIsAlertOpen(true);
        }
    };

    // Lógica de vehículos (correcta)
    const vehiculosDelUsuario = useMemo(() => {
        if (!user || !vehiculos.length) return [];
        if (user.rol === 'Supervisor' || user.rol === 'Administrativo') {
            return vehiculos;
        }
        return vehiculos.filter(v => v.chofer === user.id);
    }, [vehiculos, user]);

    // Lógica de 'handleChange' (correcta)
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    if (isLoading) return <p>Cargando...</p>;

    // --- Renderizado Simplificado ---
    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><CalendarIcon size={32} /> Solicitar Ingreso al Taller</h1>
            </header>

            <div className={styles.contentGrid}>
                <div className={styles.formCard}>
                    <h2>Crear Nueva Solicitud</h2>
                    {/* El 'onSubmit' ahora apunta a la función handleSubmit correcta */}
                    <form onSubmit={handleSubmit}>

                        {/* --- CAMPO DE FECHA Y HORA ELIMINADOS --- */}

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
                                    checked={formData.solicita_grua}
                                    onChange={handleChange}
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

                        {/* Texto de error eliminado de aquí */}
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

            {/* El Modal de Alerta ahora maneja todos los errores */}
            <AlertModal
                isOpen={isAlertOpen}
                // Al cerrar, limpiamos AMBOS mensajes
                onClose={() => {
                    setIsAlertOpen(false);
                    setError(null);
                    setSuccessMessage(null);
                }}
                title={error ? "Error" : "Éxito"} // Título dinámico
                message={error || successMessage} // Muestra el mensaje que exista
                intent={error ? "danger" : "success"} // El intent se basa en si hay un error
            />
        </div>
    );
}