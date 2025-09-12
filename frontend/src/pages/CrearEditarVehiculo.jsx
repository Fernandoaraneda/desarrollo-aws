import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/creareditarvehiculo.module.css';

export default function CrearEditarVehiculo() {
  const { patente } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(patente);

  const [vehiculoData, setVehiculoData] = useState({
    patente: '',
    marca: '',
    modelo: '',
    anio: '',
    kilometraje: '',
    color: '',
    vin: '',
    chofer: null // ID del chofer
  });
  const [choferes, setChoferes] = useState([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState(null);

  // Cargar datos del vehículo si es edición
// Cargar datos del vehículo si es edición
useEffect(() => {
  if (isEditMode) {
    apiClient.get(`/vehiculos/${patente}/`)
      .then(res => {
        setVehiculoData({
          ...res.data,
          chofer: res.data.chofer?.id || null
        });
        setIsLoading(false);
      })
      .catch(() => {
        setError('No se pudo cargar la información del vehículo.');
        setIsLoading(false);
      });
  }
}, [patente, isEditMode]);

// Cargar choferes disponibles
useEffect(() => {
  apiClient.get('/choferes/') // <- Cambiado aquí
    .then(res => {
      setChoferes(res.data); // Asume que tu endpoint ya devuelve solo los choferes
    })
    .catch(() => {
      setError('No se pudieron cargar los choferes disponibles.');
    });
}, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setVehiculoData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isNaN(vehiculoData.anio) || isNaN(vehiculoData.kilometraje)) {
      setError("El año y el kilometraje deben ser números.");
      return;
    }

    try {
      if (isEditMode) {
        await apiClient.put(`/vehiculos/${patente}/`, vehiculoData);
      } else {
        await apiClient.post('/vehiculos/', vehiculoData);
      }
      navigate('/vehiculos');
    } catch (err) {
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        const messages = Object.entries(errorData).map(([key, value]) => `${key}: ${value.join(', ')}`);
        setError(messages.join(' | '));
      } else {
        setError('Ocurrió un error al guardar el vehículo.');
      }
    }
  };

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.formCard}>
        <div className={styles.formHeader}>
          <h1>{isEditMode ? 'Editar Vehículo' : 'Añadir Nuevo Vehículo'}</h1>
          <p>{isEditMode ? `Modificando datos de la patente ${vehiculoData.patente}` : 'Completa los datos para registrar un nuevo vehículo en la flota.'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="patente">Patente</label>
              <input type="text" name="patente" id="patente" value={vehiculoData.patente} onChange={handleChange} required disabled={isEditMode} />
            </div>
            <div className={styles.formField}>
              <label htmlFor="marca">Marca</label>
              <input type="text" name="marca" id="marca" value={vehiculoData.marca} onChange={handleChange} required />
            </div>
            <div className={styles.formField}>
              <label htmlFor="modelo">Modelo</label>
              <input type="text" name="modelo" id="modelo" value={vehiculoData.modelo} onChange={handleChange} required />
            </div>
            <div className={styles.formField}>
              <label htmlFor="anio">Año</label>
              <input type="number" name="anio" id="anio" value={vehiculoData.anio} onChange={handleChange} required />
            </div>
            <div className={styles.formField}>
              <label htmlFor="kilometraje">Kilometraje</label>
              <input type="number" name="kilometraje" id="kilometraje" value={vehiculoData.kilometraje} onChange={handleChange} required />
            </div>
            <div className={styles.formField}>
              <label htmlFor="color">Color</label>
              <input type="text" name="color" id="color" value={vehiculoData.color} onChange={handleChange} />
            </div>
            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label htmlFor="vin">VIN (Número de Chasis)</label>
              <input type="text" name="vin" id="vin" value={vehiculoData.vin} onChange={handleChange} />
            </div>
            <div className={styles.formField}>
              <label htmlFor="chofer">Chofer a cargo</label>
              <select name="chofer" id="chofer" value={vehiculoData.chofer || ''} onChange={handleChange}>
                <option value="">Sin asignar</option>
                {choferes.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={() => navigate('/vehiculos')}>Cancelar</button>
            <button type="submit" className={styles.submitButton}>Guardar Vehículo</button>
          </div>
        </form>
      </div>
    </div>
  );
}
