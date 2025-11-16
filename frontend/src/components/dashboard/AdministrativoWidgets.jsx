import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Truck, Calendar, Wrench, Clock, RefreshCw, Download, Package, Navigation, KeyRound, Clipboard } from 'lucide-react';
import apiClient from '../../api/axios.js';
import styles from '../../css/administrativo-dashboard.module.css';
import { useUserStore } from '../../store/authStore.js';

// --- COMPONENTE DE KPI (SIN CAMBIOS) ---
const KpiCard = ({ title, value, icon, color }) => (
  <div className={styles.card}>
    <div className={styles.cardIcon} style={{ backgroundColor: color }}>
      {icon}
    </div>
    <div>
      <p className={styles.cardTitle}>{title}</p>
      <p className={styles.cardValue}>{value}</p>
    </div>
  </div>
);

// --- 1. NUEVO COMPONENTE REUTILIZABLE PARA FECHAS ---
const DateRangePicker = ({ fechas, onFechasChange }) => (
  <div className={styles.datePickers}>
    <label>
      Desde:
      <input
        type="date"
        value={fechas.inicio}
        onChange={(e) => onFechasChange({ ...fechas, inicio: e.target.value })}
        className={styles.dateInput}
      />
    </label>
    <label>
      Hasta:
      <input
        type="date"
        value={fechas.fin}
        onChange={(e) => onFechasChange({ ...fechas, fin: e.target.value })}
        className={styles.dateInput}
      />
    </label>
  </div>
);


export default function AdministrativoWidgets() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useUserStore();

  const today = new Date().toISOString().split('T')[0];

  // --- 2. ELIMINAMOS EL ESTADO DE FECHA ÚNICO ---
  // const [fechaInicio, setFechaInicio] = useState(today);
  // const [fechaFin, setFechaFin] = useState(today);

  // --- 3. AÑADIMOS ESTADOS DE FECHA INDIVIDUALES ---
  const [fechasSeguridad, setFechasSeguridad] = useState({ inicio: today, fin: today });
  const [fechasGruas, setFechasGruas] = useState({ inicio: today, fin: today });
  const [fechasLlaves, setFechasLlaves] = useState({ inicio: today, fin: today });
  const [fechasFlota, setFechasFlota] = useState({ inicio: today, fin: today });
  const [fechasRepuestos, setFechasRepuestos] = useState({ inicio: today, fin: today });
  const [fechasMecanicos, setFechasMecanicos] = useState({ inicio: today, fin: today });
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isDownloadingRepuestos, setIsDownloadingRepuestos] = useState(false);
  const [isDownloadingInventario, setIsDownloadingInventario] = useState(false);
  const [isDownloadingQuiebres, setIsDownloadingQuiebres] = useState(false);
  const [isDownloadingProductividad, setIsDownloadingProductividad] = useState(false);
  const [isDownloadingTiempos, setIsDownloadingTiempos] = useState(false);
  const [isDownloadingGruas, setIsDownloadingGruas] = useState(false);
  const [isDownloadingPrestamos, setIsDownloadingPrestamos] = useState(false);
  const [isDownloadingInventarioLlaves, setIsDownloadingInventarioLlaves] = useState(false);
  const [patenteHojaVida, setPatenteHojaVida] = useState('');
  const [isDownloadingFrecuencia, setIsDownloadingFrecuencia] = useState(false);
  const [isDownloadingHojaVida, setIsDownloadingHojaVida] = useState(false);

  // --- (fetchData y useEffects sin cambios) ---
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    // ... (sin cambios) ...
    if (!user) return;
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      }
      const response = await apiClient.get('/dashboard/supervisor/stats/');
      setData(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error("Error al cargar los datos del dashboard", error);
      setError(error.response?.data?.error || 'Error al cargar los datos');
    } finally {
      setIsLoading(false);
      if (showRefreshIndicator) {
        setIsRefreshing(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  useEffect(() => {
    if (!autoRefresh || !user) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, user, fetchData]);

  const handleManualRefresh = () => {
    fetchData(true);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };
  
  // --- (handleDownloadCSV sin cambios) ---
  const handleDownloadCSV = () => {
    // ... (sin cambios) ...
    if (!data) return;
    const { kpis, ordenesPorEstado, ordenesUltimaSemana, ordenesRecientes, alertas } = data;
    const exportData = {
      Alertas: alertas,
      KPIs: kpis,
      OrdenesPorEstado: ordenesPorEstado,
      OrdenesUltimaSemana: ordenesUltimaSemana,
      OrdenesRecientes: ordenesRecientes,
    };
    let csvContent = "data:text/csv;charset=utf-8,";
    Object.entries(exportData).forEach(([sectionName, sectionData]) => {
      csvContent += `\n--- ${sectionName} ---\n`;
      if (Array.isArray(sectionData)) {
        if (sectionData.length === 0) {
          csvContent += "Sin datos\n";
        } else {
          const headers = Object.keys(sectionData[0]).join(",");
          csvContent += headers + "\n";
          sectionData.forEach(obj => {
            const row = Object.values(obj).map(value => `"${value ?? ''}"`).join(",");
            csvContent += row + "\n";
          });
        }
      } else if (typeof sectionData === "object" && sectionData !== null) {
        Object.entries(sectionData).forEach(([key, value]) => {
          csvContent += `${key},${value}\n`;
        });
      } else {
        csvContent += `${sectionData}\n`;
      }
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "dashboard_supervisor.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 4. ACTUALIZAMOS LAS FUNCIONES DE DESCARGA ---

  const handleDownloadSeguridad = async () => {
    // Usa el estado 'fechasSeguridad'
    if (!fechasSeguridad.inicio || !fechasSeguridad.fin) {
      setDownloadError("Por favor, seleccione ambas fechas.");
      return;
    }
    setDownloadError(null);
    setIsDownloading(true);

    try {
      const params = new URLSearchParams({
        fecha_inicio: fechasSeguridad.inicio,
        fecha_fin: fechasSeguridad.fin,
      });

      const response = await apiClient.get(`/reportes/seguridad/?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `Reporte_Seguridad_${fechasSeguridad.inicio}_a_${fechasSeguridad.fin}.xlsx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error al descargar el reporte:", err);
      setDownloadError("Error al generar el reporte. Verifique los filtros o intente más tarde.");
    } finally {
      setIsDownloading(false);
    }
  };

  // (Sin cambios, no usa fecha)
  const handleDownloadSnapshotPDF = async () => {
    // ... (sin cambios) ...
    setDownloadError(null);
    setIsDownloadingPDF(true);

    try {
      const response = await apiClient.get('/reportes/seguridad/snapshot-pdf/', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = "Snapshot_Taller.pdf";
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error al descargar el snapshot PDF:", err);
      setDownloadError("Error al generar el reporte snapshot.");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleDownloadRepuestos = async () => {
    // Usa el estado 'fechasRepuestos'
    if (!fechasRepuestos.inicio || !fechasRepuestos.fin) {
      setDownloadError("Por favor, seleccione ambas fechas.");
      return;
    }
    setDownloadError(null);
    setIsDownloadingRepuestos(true);

    try {
      const params = new URLSearchParams({
        fecha_inicio: fechasRepuestos.inicio,
        fecha_fin: fechasRepuestos.fin,
      });

      const response = await apiClient.get(`/reportes/repuestos/consumo/?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `Reporte_Consumo_Repuestos.xlsx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error al descargar el reporte de repuestos:", err);
      setDownloadError("Error al generar el reporte de repuestos.");
    } finally {
      setIsDownloadingRepuestos(false);
    }
  };

  // (Sin cambios, no usa fecha)
  const handleDownloadInventario = async () => {
    // ... (sin cambios) ...
    setDownloadError(null);
    setIsDownloadingInventario(true);

    try {
      const response = await apiClient.get('/reportes/repuestos/inventario-valorizado/', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = "Reporte_Inventario_Valorizado.xlsx";
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error al descargar el reporte de inventario:", err);
      setDownloadError("Error al generar el reporte de inventario.");
    } finally {
      setIsDownloadingInventario(false);
    }
  };

  const handleDownloadQuiebres = async () => {
    // Usa el estado 'fechasRepuestos'
    if (!fechasRepuestos.inicio || !fechasRepuestos.fin) {
      setDownloadError("Por favor, seleccione ambas fechas.");
      return;
    }
    setDownloadError(null);
    setIsDownloadingQuiebres(true);

    try {
      const params = new URLSearchParams({
        fecha_inicio: fechasRepuestos.inicio,
        fecha_fin: fechasRepuestos.fin,
      });

      const response = await apiClient.get(`/reportes/repuestos/quiebres-stock/?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `Reporte_Quiebres_Stock.xlsx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error al descargar el reporte de quiebres:", err);
      setDownloadError("Error al generar el reporte de quiebres.");
    } finally {
      setIsDownloadingQuiebres(false);
    }
  };

  const handleDownloadProductividad = async () => {
    // Usa el estado 'fechasMecanicos'
    if (!fechasMecanicos.inicio || !fechasMecanicos.fin) {
      setDownloadError("Por favor, seleccione ambas fechas.");
      return;
    }
    setDownloadError(null);
    setIsDownloadingProductividad(true);

    try {
      const params = new URLSearchParams({
        fecha_inicio: fechasMecanicos.inicio,
        fecha_fin: fechasMecanicos.fin,
      });

      const response = await apiClient.get(`/reportes/mecanicos/productividad/?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `Reporte_Productividad_Mecanicos.xlsx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error al descargar el reporte de productividad:", err);
      setDownloadError("Error al generar el reporte de productividad.");
    } finally {
      setIsDownloadingProductividad(false);
    }
  };

  const handleDownloadTiempos = async () => {
    // Usa el estado 'fechasMecanicos'
    if (!fechasMecanicos.inicio || !fechasMecanicos.fin) {
      setDownloadError("Por favor, seleccione ambas fechas.");
      return;
    }
    setDownloadError(null);
    setIsDownloadingTiempos(true);

    try {
      const params = new URLSearchParams({
        fecha_inicio: fechasMecanicos.inicio,
        fecha_fin: fechasMecanicos.fin,
      });

      const response = await apiClient.get(`/reportes/mecanicos/tiempos-taller/?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `Reporte_Tiempos_Taller.xlsx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error al descargar el reporte de tiempos:", err);
      setDownloadError("Error al generar el reporte de tiempos.");
    } finally {
      setIsDownloadingTiempos(false);
    }
  };

  const handleDownloadGruas = async () => {
    // Usa el estado 'fechasGruas'
    if (!fechasGruas.inicio || !fechasGruas.fin) {
      setDownloadError("Por favor, seleccione ambas fechas.");
      return;
    }
    setDownloadError(null);
    setIsDownloadingGruas(true);

    try {
      const params = new URLSearchParams({
        fecha_inicio: fechasGruas.inicio,
        fecha_fin: fechasGruas.fin,
      });

      const response = await apiClient.get(`/reportes/gruas/solicitudes/?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `Reporte_Solicitudes_Grua.xlsx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error al descargar el reporte de grúas:", err);
      setDownloadError("Error al generar el reporte de grúas.");
    } finally {
      setIsDownloadingGruas(false);
    }
  };

  const handleDownloadPrestamos = async () => {
    // Usa el estado 'fechasLlaves'
    if (!fechasLlaves.inicio || !fechasLlaves.fin) {
      setDownloadError("Por favor, seleccione ambas fechas.");
      return;
    }
    setDownloadError(null);
    setIsDownloadingPrestamos(true);

    try {
      const params = new URLSearchParams({
        fecha_inicio: fechasLlaves.inicio,
        fecha_fin: fechasLlaves.fin,
      });

      const response = await apiClient.get(`/reportes/llaves/historial-prestamos/?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `Reporte_Historial_Llaves.xlsx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error al descargar el historial de préstamos:", err);
      setDownloadError("Error al generar el historial de préstamos.");
    } finally {
      setIsDownloadingPrestamos(false);
    }
  };

  // (Sin cambios, no usa fecha)
  const handleDownloadInventarioLlaves = async () => {
    // ... (sin cambios) ...
    setDownloadError(null);
    setIsDownloadingInventarioLlaves(true);

    try {
      const response = await apiClient.get('/reportes/llaves/inventario-pdf/', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `Snapshot_Inventario_Llaves.pdf`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error al descargar el inventario de llaves:", err);
      setDownloadError("Error al generar el inventario de llaves.");
    } finally {
      setIsDownloadingInventarioLlaves(false);
    }
  };

  const handleDownloadFrecuencia = async () => {
    // Usa el estado 'fechasFlota'
    if (!fechasFlota.inicio || !fechasFlota.fin) {
      setDownloadError("Por favor, seleccione ambas fechas.");
      return;
    }
    setDownloadError(null);
    setIsDownloadingFrecuencia(true);

    try {
      const params = new URLSearchParams({
        fecha_inicio: fechasFlota.inicio,
        fecha_fin: fechasFlota.fin,
      });

      const response = await apiClient.get(`/reportes/flota/frecuencia-fallas/?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `Reporte_Frecuencia_Fallas.xlsx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error al descargar el reporte de frecuencia:", err);
      setDownloadError("Error al generar el reporte de frecuencia.");
    } finally {
      setIsDownloadingFrecuencia(false);
    }
  };

  // (Sin cambios, usa patente)
  const handleDownloadHojaVida = async () => {
    // ... (sin cambios) ...
    if (!patenteHojaVida) {
      setDownloadError("Por favor, ingrese una patente para generar la Hoja de Vida.");
      return;
    }
    setDownloadError(null);
    setIsDownloadingHojaVida(true);

    try {
      const params = new URLSearchParams({
        patente: patenteHojaVida,
      });

      const response = await apiClient.get(`/reportes/flota/hoja-vida-pdf/?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let fileName = `Hoja_De_Vida_${patenteHojaVida}.pdf`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error al descargar la hoja de vida:", err);
      if (err.response && err.response.status === 404) {
        setDownloadError("Error: Patente no encontrada. Verifique la patente e intente de nuevo.");
      } else {
        setDownloadError("Error al generar la Hoja de Vida.");
      }
    } finally {
      setIsDownloadingHojaVida(false);
    }
  };

  // --- (Código de renderizado de 'Cargando', 'Error', etc. sin cambios) ---
  if (isLoading) {
    // ... (sin cambios) ...
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-300">Cargando panel...</p>
      </div>
    );
  }
  if (error) {
    // ... (sin cambios) ...
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-red-400 mb-4">Error: {error}</p>
        <button
          onClick={handleManualRefresh}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (!data) {
    // ... (sin cambios) ...
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-gray-300 mb-4">No se pudieron cargar los datos del dashboard.</p>
        <button
          onClick={handleManualRefresh}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Reintentar
        </button>
      </div>
    );
  }


  const { kpis, ordenesPorEstado, ordenesUltimaSemana, ordenesRecientes, alertas } = data;
  const pendientesAprobacion = alertas?.pendientesAprobacion || 0;


  // --- 5. ACTUALIZAMOS EL JSX (LA VISTA) ---
  return (
    <div className="w-full">

      {/* --- Controles y KPIs (sin cambios) --- */}
      <div className={styles.topRowContainer}>
        {/* ... (sin cambios) ... */}
        <div className={styles.controlsToolbar}>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${isRefreshing
                ? 'bg-green-500 text-white cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </button>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-3 py-2 rounded text-sm bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
            title="Descargar datos en CSV"
          >
            📥 Descargar CSV
          </button>

          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={toggleAutoRefresh}
              className="cursor-pointer"
            />
            Auto-actualizar (30s)
          </label>

          {lastUpdated && (
            <span>
              Última actualización: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      
      <div className={styles.dashboardGrid}>
        
        <KpiCard
          title="Pendientes de Aprobación"
          value={pendientesAprobacion}
          icon={<Calendar />}
          color="#10b981"
        />
        <KpiCard
          title="Vehículos en Taller"
          value={kpis?.vehiculosEnTaller || 0}
          icon={<Truck />}
          color="#3b82f6"
        />
        <KpiCard
          title="Órdenes Finalizadas (Mes)"
          value={kpis?.ordenesFinalizadasMes || 0}
          icon={<Wrench />}
          color="#f97316"
        />
        <KpiCard
          title="Tiempo Promedio Reparación"
          value={kpis?.tiempoPromedioRep || "N/A"}
          icon={<Clock />}
          color="#8b5cf6"
        />

        {/* --- Gráficos (sin cambios) --- */}
        <div className={`${styles.card} ${styles.largeCard}`}>
          {/* ... (gráfico de barras) ... */}
          <h3 className={styles.chartTitle}>Carga de Trabajo Actual</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ordenesPorEstado || []} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="estado" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="cantidad" fill="#3b82f6" name="Órdenes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={`${styles.card} ${styles.largeCard}`}>
          {/* ... (gráfico de líneas) ... */}
          <h3 className={styles.chartTitle}>Ingresos en la Última Semana</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={ordenesUltimaSemana || []} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="creadas" stroke="#10b981" strokeWidth={2} name="Órdenes Creadas" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* --- INICIO: SECCIÓN CENTRO DE REPORTES (MODIFICADO) --- */}
        <div className={`${styles.card} ${styles.reportCard} ${styles.fullWidthCard}`}>
          <h2 className={styles.reportHeader}>Centro de Reportes Administrativos</h2>
          {/* Mostramos el error general de descarga aquí arriba */}
          {downloadError && <p className={styles.downloadError}>{downloadError}</p>}

          <div className={styles.reportGrid}>

            {/* --- ÁREA DE SEGURIDAD --- */}
            <div className={styles.reportSection}>
              <h3 className={styles.reportSectionTitle}>
                <Truck size={18} />
                Área de Seguridad
              </h3>
              <p className={styles.reportDescription}>
                Genera la bitácora de todos los ingresos y salidas del taller.
              </p>
              
              {/* Usamos el componente de fechas con el estado 'fechasSeguridad' */}
              <DateRangePicker fechas={fechasSeguridad} onFechasChange={setFechasSeguridad} />

              <button
                onClick={handleDownloadSeguridad}
                disabled={isDownloading || !fechasSeguridad.inicio || !fechasSeguridad.fin}
                className={styles.downloadButton}
              >
                {isDownloading ? (
                  <> <RefreshCw size={16} className="animate-spin" /> Generando... </>
                ) : (
                  <> <Download size={16} /> Descargar Bitácora (Excel) </>
                )}
              </button>

              <hr style={{ borderColor: '#4a5568', margin: '1rem 0' }} />
              <p className={styles.reportDescription}>
                Obtener una foto actual de todos los vehículos en taller (no usa fechas).
              </p>
              <button
                onClick={handleDownloadSnapshotPDF}
                disabled={isDownloadingPDF}
                className={styles.downloadButton}
                style={{ backgroundColor: '#9B2C2C' }}
              >
                {isDownloadingPDF ? (
                  <> <RefreshCw size={16} className="animate-spin" /> Generando... </>
                ) : (
                  <> <Download size={16} /> Snapshot Vehículos en Taller (PDF) </>
                )}
              </button>
            </div>

            {/* --- ÁREA DE GRÚAS --- */}
            <div className={styles.reportSection}>
              <h3 className={styles.reportSectionTitle}>
                <Navigation size={18} />
                Área de Grúas
              </h3>
              <p className={styles.reportDescription}>
                Historial de solicitudes de grúa (filtrado por fecha de solicitud).
              </p>
              
              {/* Usamos el componente de fechas con el estado 'fechasGruas' */}
              <DateRangePicker fechas={fechasGruas} onFechasChange={setFechasGruas} />

              <button
                onClick={handleDownloadGruas}
                disabled={isDownloadingGruas || !fechasGruas.inicio || !fechasGruas.fin}
                className={styles.downloadButton}
                style={{ backgroundColor: '#4F46E5' }}
              >
                {isDownloadingGruas ? (
                  <> <RefreshCw size={16} className="animate-spin" /> Generando... </>
                ) : (
                  <> <Download size={16} /> Solicitudes de Grúa (Excel) </>
                )}
              </button>
            </div>

            {/* --- ÁREA DE CONTROL DE LLAVES --- */}
            <div className={styles.reportSection}>
              <h3 className={styles.reportSectionTitle}>
                <KeyRound size={18} />
                Área de Control de Llaves (Pañol)
              </h3>
              <p className={styles.reportDescription}>
                Bitácora de préstamos (filtrado por fecha de retiro).
              </p>
              
              {/* Usamos el componente de fechas con el estado 'fechasLlaves' */}
              <DateRangePicker fechas={fechasLlaves} onFechasChange={setFechasLlaves} />
              
              <button
                onClick={handleDownloadPrestamos}
                disabled={isDownloadingPrestamos || !fechasLlaves.inicio || !fechasLlaves.fin}
                className={styles.downloadButton}
              >
                {isDownloadingPrestamos ? (
                  <> <RefreshCw size={16} className="animate-spin" /> Generando... </>
                ) : (
                  <> <Download size={16} /> Historial de Préstamos (Excel) </>
                )}
              </button>
              <hr className={styles.reportSeparator} />
              <p className={styles.reportDescription}>
                Snapshot del estado actual de todas las llaves (no usa fechas).
              </p>
              <button
                onClick={handleDownloadInventarioLlaves}
                disabled={isDownloadingInventarioLlaves}
                className={styles.downloadButton}
                style={{ backgroundColor: '#6B7280' }}
              >
                {isDownloadingInventarioLlaves ? (
                  <> <RefreshCw size={16} className="animate-spin" /> Generando... </>
                ) : (
                  <> <Download size={16} /> Inventario de Llaves (PDF) </>
                )}
              </button>
            </div>

            {/* --- ÁREA DE FLOTA --- */}
            <div className={styles.reportSection}>
              <h3 className={styles.reportSectionTitle}>
                <Clipboard size={18} />
                Área de Flota (Vehículos)
              </h3>
              <p className={styles.reportDescription}>
                Historial completo de un vehículo (no usa fechas).
              </p>
              <div className={styles.patentePicker}>
                <label>
                  Patente del Vehículo:
                  <input
                    type="text"
                    value={patenteHojaVida}
                    onChange={(e) => setPatenteHojaVida(e.target.value.toUpperCase())}
                    className={styles.patenteInput}
                    placeholder="BCDF10"
                    maxLength={10}
                  />
                </label>
              </div>
              <button
                onClick={handleDownloadHojaVida}
                disabled={isDownloadingHojaVida || !patenteHojaVida}
                className={styles.downloadButton}
                style={{ backgroundColor: '#DC2626' }}
              >
                {isDownloadingHojaVida ? (
                  <> <RefreshCw size={16} className="animate-spin" /> Generando... </>
                ) : (
                  <> <Download size={16} /> Generar Hoja de Vida (PDF) </>
                )}
              </button>
              <hr className={styles.reportSeparator} />
              <p className={styles.reportDescription}>
                Ranking de vehículos que más ingresan al taller (filtrado por fecha).
              </p>
              
              {/* Usamos el componente de fechas con el estado 'fechasFlota' */}
              <DateRangePicker fechas={fechasFlota} onFechasChange={setFechasFlota} />

              <button
                onClick={handleDownloadFrecuencia}
                disabled={isDownloadingFrecuencia || !fechasFlota.inicio || !fechasFlota.fin}
                className={styles.downloadButton}
              >
                {isDownloadingFrecuencia ? (
                  <> <RefreshCw size={16} className="animate-spin" /> Generando... </>
                ) : (
                  <> <Download size={16} /> Frecuencia de Fallas (Excel) </>
                )}
              </button>
            </div>

            {/* --- ÁREA DE REPUESTOS --- */}
            <div className={styles.reportSection}>
              <h3 className={styles.reportSectionTitle}>
                <Package size={18} />
                Área de Repuestos (Bodega)
              </h3>
              <p className={styles.reportDescription}>
                Filtros de fecha para reportes de Consumo y Quiebres:
              </p>
              
              {/* Usamos el componente de fechas con el estado 'fechasRepuestos' */}
              <DateRangePicker fechas={fechasRepuestos} onFechasChange={setFechasRepuestos} />
              
              <button
                onClick={handleDownloadRepuestos}
                disabled={isDownloadingRepuestos || !fechasRepuestos.inicio || !fechasRepuestos.fin}
                className={styles.downloadButton}
              >
                {isDownloadingRepuestos ? (
                  <> <RefreshCw size={16} className="animate-spin" /> Generando... </>
                ) : (
                  <> <Download size={16} /> Descargar Consumo (Excel) </>
                )}
              </button>
              <button
                onClick={handleDownloadQuiebres}
                disabled={isDownloadingQuiebres || !fechasRepuestos.inicio || !fechasRepuestos.fin}
                className={styles.downloadButton}
                style={{ backgroundColor: '#D97706', marginTop: '0.5rem' }}
              >
                {isDownloadingQuiebres ? (
                  <> <RefreshCw size={16} className="animate-spin" /> Generando... </>
                ) : (
                  <> <Download size={16} /> Quiebres de Stock (Excel) </>
                )}
              </button>
              
              <hr className={styles.reportSeparator} />
              <p className={styles.reportDescription}>
                Snapshot del inventario actual (no usa fechas).
              </p>
              <button
                onClick={handleDownloadInventario}
                disabled={isDownloadingInventario}
                className={styles.downloadButton}
                style={{ backgroundColor: '#B83280' }}
              >
                {isDownloadingInventario ? (
                  <> <RefreshCw size={16} className="animate-spin" /> Generando... </>
                ) : (
                  <> <Download size={16} /> Inventario Valorizado (Excel) </>
                )}
              </button>
            </div>

            {/* --- ÁREA DE MECÁNICOS --- */}
            <div className={styles.reportSection}>
              <h3 className={styles.reportSectionTitle}>
                <Wrench size={18} />
                Área de Mecánicos (Productividad)
              </h3>
              <p className={styles.reportDescription}>
                Filtros de fecha para reportes de Productividad y Tiempos:
              </p>

              {/* Usamos el componente de fechas con el estado 'fechasMecanicos' */}
              <DateRangePicker fechas={fechasMecanicos} onFechasChange={setFechasMecanicos} />

              <button
                onClick={handleDownloadProductividad}
                disabled={isDownloadingProductividad || !fechasMecanicos.inicio || !fechasMecanicos.fin}
                className={styles.downloadButton}
              >
                {isDownloadingProductividad ? (
                  <> <RefreshCw size={16} className="animate-spin" /> Generando... </>
                ) : (
                  <> <Download size={16} /> Productividad por Mecánico (Excel) </>
                )}
              </button>
              
              <button
                onClick={handleDownloadTiempos}
                disabled={isDownloadingTiempos || !fechasMecanicos.inicio || !fechasMecanicos.fin}
                className={styles.downloadButton}
                style={{ backgroundColor: '#0D9488', marginTop: '0.5rem' }}
              >
                {isDownloadingTiempos ? (
                  <> <RefreshCw size={16} className="animate-spin" /> Generando... </>
                ) : (
                  <> <Download size={16} /> Reporte Tiempos de Taller (Excel) </>
                )}
              </button>
            </div>

          </div> 
        </div> 
        {/* --- FIN: SECCIÓN CENTRO DE REPORTES --- */}
        

        {/* --- Tabla de Órdenes Recientes (sin cambios) --- */}
        <div className={`${styles.card} ${styles.fullWidthCard}`}>
          {/* ... (sin cambios) ... */}
          <h3 className={styles.chartTitle}>Órdenes de Servicio Recientes</h3>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID Orden</th>
                  <th>Patente Vehículo</th>
                  <th>Estado Actual</th>
                  <th>Mecánico Asignado</th>
                </tr>
              </thead>
              <tbody>
                {(ordenesRecientes || []).map((orden) => (
                  <tr key={orden.id}>
                    <td>#{orden.id}</td>
                    <td>{orden.patente}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[orden.estado?.toLowerCase().replace(/ /g, '').replace('ó', 'o')] || ''}`}>
                        {orden.estado}
                      </span>
                    </td>
                    <td>{orden.mecanico}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}