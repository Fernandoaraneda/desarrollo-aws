import React, { useState, useEffect } from 'react';
import apiClient from '/src/api/axios.js';
import styles from '../css/gestionllaves.module.css';
import { History, FileWarning, Search } from 'lucide-react';

const HistorialPrestamos = ({ searchTerm }) => {
    const [prestamos, setPrestamos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        
        apiClient.get('/prestamos-llaves/', {
            params: { search: searchTerm } 
        })
            .then(res => setPrestamos(res.data.results || res.data))
            .catch(err => console.error("Error cargando préstamos", err))
            .finally(() => setIsLoading(false));
    }, [searchTerm]);

    if (isLoading) return <p className={styles.centeredMessage}>Cargando historial de préstamos...</p>;

    return (
        <div className={styles.tableCard}>
            <h2 style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <History size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Historial de Préstamos (Quién la tuvo)
            </h2>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Llave</th>
                            <th>Usuario</th>
                            <th>Fecha Retiro</th>
                            <th>Fecha Devolución</th>
                            <th>Obs. Retiro</th>
                        </tr>
                    </thead>
                    <tbody>
                        {prestamos.length > 0 ? prestamos.map(p => (
                            <tr key={p.id}>
                                <td>{p.llave_info}</td>
                                <td>{p.usuario_nombre}</td>
                                <td>{new Date(p.fecha_hora_retiro).toLocaleString('es-CL')}</td>
                                <td>{p.fecha_hora_devolucion ? new Date(p.fecha_hora_devolucion).toLocaleString('es-CL') : 'AÚN PRESTADA'}</td>
                                <td>{p.observaciones_retiro || '---'}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="5" className={styles.noResults}>No hay historial de préstamos.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const HistorialReportes = ({ searchTerm }) => {
    const [reportes, setReportes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        apiClient.get('/llaves-historial-estado/', {
            params: { search: searchTerm }
        })
            .then(res => setReportes(res.data.results || res.data))
            .catch(err => console.error("Error cargando reportes", err))
            .finally(() => setIsLoading(false));
    }, [searchTerm]); 

    if (isLoading) return <p className={styles.centeredMessage}>Cargando historial de reportes...</p>;

    return (
        <div className={styles.tableCard}>
            <h2 style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <FileWarning size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Historial de Reportes (Dañadas, Perdidas, Revertidas)
            </h2>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Llave</th>
                            <th>Usuario</th>
                            <th>Fecha</th>
                            <th>Estado Anterior</th>
                            <th>Estado Nuevo</th>
                            <th>Motivo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportes.length > 0 ? reportes.map(r => (
                            <tr key={r.id}>
                                <td>{r.llave_info}</td>
                                <td>{r.usuario_nombre}</td>
                                <td>{new Date(r.fecha).toLocaleString('es-CL')}</td>
                                <td>{r.estado_anterior || 'N/A'}</td>
                                <td>{r.estado_nuevo}</td>
                                <td>{r.motivo || '---'}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" className={styles.noResults}>No hay historial de reportes.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


export default function GestionLlavesHistorial() {
    
    
    const [searchTerm, setSearchTerm] = useState('');
    


    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <h1><History size={32} /> Historial General de Llaves</h1>
            </header>
            
           
            <div className={styles.tableCard} style={{ marginBottom: '2rem' }}>
                <div className={styles.tableControls}>
                    <div className={styles.searchBox}>
                        <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Buscar por Patente o Nombre de Usuario..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            
           
            <HistorialPrestamos searchTerm={searchTerm} />
            <br />
            <HistorialReportes searchTerm={searchTerm} />
        </div>
    );
}