import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Truck, Calendar, Wrench, Clock } from 'lucide-react';
// Se corrigen las rutas de importación para que sean relativas al archivo actual.
import apiClient from '../../api/axios.js';
import styles from '../../css/supervisor-dashboard.module.css';
import { useUserStore } from '../../store/authStore.js'; // 👈 1. Importa el store de usuario

// --- Componente para las Tarjetas de KPIs (sin cambios) ---
const KpiCard = ({ title, value, icon, color }) => (
// ... (código existente sin cambios)
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

// --- Componente Principal del Dashboard del Supervisor (Modificado) ---
export default function SupervisorWidgets() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUserStore(); // 👈 2. Obtiene el usuario del store

  useEffect(() => {
    // 👇 3. La función solo se ejecuta si tenemos un usuario válido
    if (user) {
      const fetchData = async () => {
        try {
          const response = await apiClient.get('/dashboard/supervisor/');
          setData(response.data);
        } catch (error) {
          console.error("Error al cargar los datos del dashboard", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [user]); // 👈 4. El efecto se re-ejecuta si el 'user' cambia

  if (isLoading) {
    return <p>Cargando panel del supervisor...</p>;
  }

  if (!data) {
    return <p>Error al cargar los datos del dashboard. Revisa la consola para más detalles.</p>;
  }

  const { kpis, ordenesPorEstado, ordenesUltimaSemana, ordenesRecientes } = data;

  return (
    <div className={styles.dashboardGrid}>
      {/* ... (El resto del JSX para mostrar los KPIs, gráficos y tablas no necesita cambios) ... */}
            {/* Fila de KPIs */}
      <KpiCard title="Vehículos en Taller" value={kpis.vehiculosEnTaller} icon={<Truck />} color="#3b82f6" />
      <KpiCard title="Agendamientos para Hoy" value={kpis.agendamientosHoy} icon={<Calendar />} color="#10b981" />
      <KpiCard title="Órdenes Finalizadas (Mes)" value={kpis.ordenesFinalizadasMes} icon={<Wrench />} color="#f97316" />
      <KpiCard title="Tiempo Promedio Reparación" value={kpis.tiempoPromedioRep} icon={<Clock />} color="#8b5cf6" />
      
      {/* Gráfico de Órdenes por Estado */}
      <div className={`${styles.card} ${styles.largeCard}`}>
        <h3 className={styles.chartTitle}>Carga de Trabajo Actual</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ordenesPorEstado} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
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
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ordenesUltimaSemana} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
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
              {ordenesRecientes.map((orden) => (
                <tr key={orden.id}>
                  <td>#{orden.id}</td>
                  <td>{orden.patente}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[orden.estado.toLowerCase().replace(/ /g, '').replace('ó', 'o')]}`}>
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
  );
}

