// src/pages/SupervisorWidgets.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
// --- ✅ 1. 'Bell' AÑADIDO ---
import { Truck, Calendar, Wrench, Clock, RefreshCw, Bell } from 'lucide-react';
import apiClient from '../../api/axios.js';
import styles from '../../css/supervisor-dashboard.module.css';
import { useUserStore } from '../../store/authStore.js';

// --- Componente para las Tarjetas de KPIs ---
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

// --- Componente Principal del Dashboard del Supervisor (Con Auto-actualización y Exportación CSV) ---
export default function SupervisorWidgets() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useUserStore();

  // ✅ 1. Función para obtener los datos del dashboard (SIN CAMBIOS)
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (!user) return;
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      }
      console.log('Obteniendo datos del dashboard...'); // Debug
      const response = await apiClient.get('/dashboard/supervisor/stats/');
      console.log('Datos recibidos:', response.data); // Debug
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

  // ✅ 2. Efecto para la carga inicial (SIN CAMBIOS)
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // ✅ 3. Efecto para la auto-actualización cada 30 segundos (SIN CAMBIOS)
  useEffect(() => {
    if (!autoRefresh || !user) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000); // 30 segundos
    return () => clearInterval(interval);
  }, [autoRefresh, user, fetchData]);

  // ✅ 4. Función para refrescar manually (SIN CAMBIOS)
  const handleManualRefresh = () => {
    fetchData(true);
  };

  // ✅ 5. Función para alternar auto-refresh (SIN CAMBIOS)
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // ✅ 6. Función para exportar los datos visibles en CSV (SIN CAMBIOS)
  const handleDownloadCSV = () => {
    if (!data) return;
    // --- ✅ 'alertas' AÑADIDO A LA EXPORTACIÓN ---
    const { kpis, ordenesPorEstado, ordenesUltimaSemana, ordenesRecientes, alertas } = data;
    const exportData = {
      Alertas: alertas, // <-- Añadido
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-300">Cargando panel del supervisor...</p>
      </div>
    );
  }
  if (error) {
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


  return (
    <div className="w-full">


      <div className={styles.topRowContainer}>


        <div className={styles.alertWidget}>
          <Bell />
          <div>
            <p>
              Tienes <strong>{pendientesAprobacion}</strong> agendamiento(s)
              <br />
              pendientes de aprobación.
            </p>
          </div>
        </div>

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
          title="Vehículos en Taller"
          value={kpis?.vehiculosEnTaller || 0}
          icon={<Truck />}
          color="#3b82f6"
        />
        <KpiCard
          title="Agendamientos para Hoy"
          value={kpis?.agendamientosHoy || 0}
          icon={<Calendar />}
          color="#10b981"
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


        <div className={`${styles.card} ${styles.largeCard}`}>
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


        <div className={`${styles.card} ${styles.fullWidthCard}`}>
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