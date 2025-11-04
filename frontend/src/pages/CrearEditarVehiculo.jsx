import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '/src/api/axios.js';
import styles from '/src/css/creareditarvehiculo.module.css';

// --- Constantes para validación ---
// Permite modelos hasta el próximo año (ej: 2026 si estamos en 2025)
const ANO_MAXIMO = new Date().getFullYear() + 1; 
const ANO_MINIMO = 1980; // Un año razonable para un vehículo de flota

// --- Funciones Helper de Formato (usadas al escribir) ---

/**
 * Formatea la patente en tiempo real.
 * Solo permite letras (A-Z) y números (0-9).
 * Convierte a mayúsculas y limita a 6 caracteres.
 * (Válido para formatos BBCC12 y BB1234)
 */
const formatPatente = (value) => {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
};

/**
 * Formatea campos de texto (Marca, Modelo, Color).
 * Solo permite letras, acentos, 'ñ' y espacios.
 * Limita a 50 caracteres.
 */
const formatTextoVehiculo = (value) => {
  // Permite letras, números, espacios, guiones, acentos y 'ñ'
  return value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '').slice(0, 50);
};

const formatNumero = (value) => {
  return value.replace(/\D/g, ''); // \D = "no dígito"
};

const formatVIN = (value) => {
  return value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
};

// --- Componente Principal ---

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
    chofer: null
  });
  const [choferes, setChoferes] = useState([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState(null);

  // ... (Tu useEffect de Cargar datos del vehículo se mantiene igual) ...
  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true); // Asegurarse de mostrar carga
      apiClient.get(`/vehiculos/${patente}/`)
        .then(res => {
          setVehiculoData({
            ...res.data,
            // Aseguramos que los valores nulos se muestren como strings vacíos
            chofer: res.data.chofer || '',
            anio: res.data.anio || '',
            kilometraje: res.data.kilometraje || '',
            color: res.data.color || '',
            vin: res.data.vin || '',
          });
        })
        .catch(() => {
          setError('No se pudo cargar la información del vehículo.');
        })
        .finally(() => {
           setIsLoading(false);
        });
    }
  }, [patente, isEditMode]);

  // ... (Tu useEffect de Cargar choferes se mantiene igual) ...
  useEffect(() => {
    apiClient.get('/choferes/')
      .then(res => {
        setChoferes(res.data.results || res.data); // Ajustado para paginación si existe
      })
      .catch(() => {
        // No sobreescribir el error principal si ya existe
        setError(prev => prev || 'No se pudieron cargar los choferes disponibles.');
      });
  }, []);

  
  /**
   * --- ✅ HandleChange MODIFICADO ---
   * Ahora usa las funciones de formato en tiempo real.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Aplicar formato según el campo
    switch (name) {
      case 'patente':
        finalValue = formatPatente(value);
        break;
      case 'marca':
      case 'modelo':
      case 'color':
        finalValue = formatTextoVehiculo(value); 
        break;
      case 'anio':
        finalValue = formatNumero(value).slice(0, 4);
        break;
      case 'kilometraje':
        finalValue = formatNumero(value).slice(0, 7);
        break;
      case 'vin':
        finalValue = formatVIN(value);
        break;
      default:
        finalValue = value;
    }
    
    setVehiculoData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // --- 1. Validaciones de Formato y Lógica ---
    const { anio, kilometraje, patente: patenteValue, vin } = vehiculoData;
    
    // Regex para patentes chilenas: (XX1111 o XXXX11)
    const patenteRegex = /(^[A-Z]{4}\d{2}$)|(^[A-Z]{2}\d{4}$)/;
    if (!patenteRegex.test(patenteValue)) {
      setError("Formato de Patente inválido. Debe ser XX1111 o XXXX11.");
      return;
    }

    const anioNum = parseInt(anio, 10);
    if (isNaN(anioNum) || anioNum < ANO_MINIMO || anioNum > ANO_MAXIMO) {
      setError(`El Año debe ser un número válido entre ${ANO_MINIMO} y ${ANO_MAXIMO}.`);
      return;
    }

    if (isNaN(parseInt(kilometraje, 10)) || parseInt(kilometraje, 10) < 0) {
      setError("El Kilometraje debe ser un número positivo.");
      return;
    }
    
    if (vin && vin.length !== 17) {
        setError("El VIN (Número de Chasis) debe tener 17 caracteres.");
        return;
    }
    
    // --- 2. Preparar datos para enviar ---
    const dataParaEnviar = {
        ...vehiculoData,
        anio: anioNum,
        kilometraje: parseInt(kilometraje, 10),
        // Convertir '' (Sin asignar) de nuevo a 'null' para el backend
        chofer: vehiculoData.chofer || null, 
    };

    // --- 3. Lógica de Envío (sin cambios) ---
    try {
      if (isEditMode) {
        await apiClient.put(`/vehiculos/${patente}/`, dataParaEnviar);
      } else {
        await apiClient.post('/vehiculos/', dataParaEnviar);
      }
      navigate('/vehiculos');
    } catch (err) {
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        const messages = Object.entries(errorData).map(([key, value]) => {
            const errorMsg = Array.isArray(value) ? value.join(', ') : String(value);
            return `${key}: ${errorMsg}`;
        });
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
            
            {/* --- 👇 Campos de Input Actualizados --- */}
            
            <div className={styles.formField}>
              <label htmlFor="patente">Patente</label>
              <input 
                type="text" 
                name="patente" 
                id="patente" 
                value={vehiculoData.patente} 
                onChange={handleChange} 
                required 
                disabled={isEditMode}
                maxLength={6} // Límite visual
                placeholder="BBCC12 o BB1234"
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="marca">Marca</label>
              <input 
                type="text" 
                name="marca" 
                id="marca" 
                value={vehiculoData.marca} 
                onChange={handleChange} 
                required 
                disabled={isEditMode}
                maxLength={50}
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="modelo">Modelo</label>
              <input 
                type="text" 
                name="modelo" 
                id="modelo" 
                value={vehiculoData.modelo} 
                onChange={handleChange} 
                required 
                disabled={isEditMode}
                maxLength={50}
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="anio">Año</label>
              <input 
                type="text" // Cambiado a text para permitir el formateo
                name="anio" 
                id="anio" 
                value={vehiculoData.anio} 
                onChange={handleChange} 
                required 
                disabled={isEditMode}
                maxLength={4} // Límite visual
                placeholder={`Ej: ${new Date().getFullYear()}`}
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="kilometraje">Kilometraje</label>
              <input 
                type="text" // Cambiado a text para permitir el formateo
                name="kilometraje" 
                id="kilometraje" 
                value={vehiculoData.kilometraje} 
                onChange={handleChange} 
                required 
                maxLength={7} // Límite visual
                placeholder="Ej: 150000"
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="color">Color</label>
              <input 
                type="text" 
                name="color" 
                id="color" 
                value={vehiculoData.color} 
                onChange={handleChange}
                maxLength={50}
              />
            </div>
            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label htmlFor="vin">VIN (Número de Chasis)</label>
              <input 
                type="text" 
                name="vin" 
                id="vin" 
                value={vehiculoData.vin} 
                onChange={handleChange}
                disabled={isEditMode}
                maxLength={17} // Límite visual
                placeholder="17 caracteres alfanuméricos"
              />
            </div>
            
            {/* --- Fin de Campos Actualizados --- */}
            
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