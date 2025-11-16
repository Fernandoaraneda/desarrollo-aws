import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../../api/axios.js';
import styles from '../../css/chat.module.css'; // Reusamos los estilos
import { X, Search } from 'lucide-react';
import { useUserStore } from '../../store/authStore.js';

export default function NewChatModal({ isOpen, onClose, onSuccess }) {
    const { user: currentUser } = useUserStore();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (isOpen) {
            // Cargar la lista de todos los usuarios
            const fetchUsers = async () => {
                setIsLoading(true);
                try {
                    const response = await apiClient.get('/users/list/');
                    // Filtramos al usuario actual de la lista
                    const otherUsers = (response.data.results || response.data).filter(
                        u => u.username !== currentUser.username
                    );
                    setUsers(otherUsers);
                } catch (error) {
                    console.error("Error al cargar la lista de usuarios:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchUsers();
        }
    }, [isOpen, currentUser.username]);

    // Lógica para filtrar usuarios
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter(u =>
            (u.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (u.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (u.username?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    // Función al hacer clic en un usuario
    const handleSelectUser = async (userId) => {
        setIsCreating(true);
        try {
            // Llama al nuevo endpoint del backend
            const response = await apiClient.post('/chat/rooms/', {
                user_id: userId
            });
            // Llama a la función onSuccess (del padre) con la nueva sala
            onSuccess(response.data);
        } catch (error) {
            console.error("Error al crear/encontrar la sala:", error);
            alert("No se pudo iniciar el chat.");
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className={styles.modalCloseButton}>
                    <X size={24} />
                </button>
                <h2 className={styles.modalTitle}>Iniciar Nueva Conversación</h2>

                <div className={styles.searchBox}>
                    <Search size={20} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Buscar usuario por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.messageInput} // Reusamos el estilo del input
                    />
                </div>

                <div className={styles.roomList} style={{ maxHeight: '400px', marginTop: '1rem' }}>
                    {isLoading && <p>Cargando usuarios...</p>}
                    {!isLoading && filteredUsers.length === 0 && (
                        <p style={{ padding: '1rem', color: '#9ca3af' }}>No se encontraron usuarios.</p>
                    )}
                    {filteredUsers.map(user => (
                        <div
                            key={user.id}
                            className={styles.roomItem}
                            onClick={() => handleSelectUser(user.id)}
                            style={{ cursor: isCreating ? 'wait' : 'pointer' }} // Cambia el cursor mientras crea
                        >
                            <p style={{ margin: 0, fontWeight: 600 }}>{user.first_name} {user.last_name}</p>
                            <small style={{ color: '#6b7280' }}>@{user.username} ({user.rol})</small>
                        </div>
                    ))}
                    {isCreating && <p style={{ padding: '1rem', color: '#6b7280' }}>Iniciando chat...</p>}
                </div>
            </div>
        </div>
    );
}