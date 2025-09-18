import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Truck, Calendar, Wrench, Clock, RefreshCw } from 'lucide-react';
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

// --- Componente Principal del Dashboard del Supervisor (Con Auto-actualización) ---
export default function SupervisorWidgets() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useUserStore();

  // ✅ 1. Función para obtener los datos del dashboard
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

  // ✅ 2. Efecto para la carga inicial
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // ✅ 3. Efecto para la auto-actualización cada 30 segundos
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, user, fetchData]);

  // ✅ 4. Función para refrescar manualmente
  const handleManualRefresh = () => {
    fetchData(true);
  };

  // ✅ 5. Función para alternar auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
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

  const { kpis, ordenesPorEstado, ordenesUltimaSemana, ordenesRecientes } = data;

  return (
    <div className="w-full">
      {/* ✅ Header con controles de actualización */}
      <div className="flex justify-end mb-4 px-4">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
              isRefreshing 
                ? 'bg-green-500 text-white cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={toggleAutoRefresh}
              className="cursor-pointer"
            />
            Auto-actualizar (30s)
          </label>
          
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Última actualización: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        {/* Fila de KPIs */}
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
        
        {/* Gráfico de Órdenes por Estado */}
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
        
        {/* Gráfico de Flujo de Ingresos */}
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

        {/* Tabla de Órdenes Recientes */}
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