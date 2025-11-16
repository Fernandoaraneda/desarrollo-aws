import React from 'react';
import styles from '../../css/chat.module.css';
import { Users, PlusSquare, X } from 'lucide-react'; // <-- 1. Importar X
import apiClient from '../../api/axios.js'; // <-- 2. Importar apiClient

// 3. Recibir la nueva prop 'onRoomDeleted'
export default function ChatSidebar({ rooms, currentUser, onSelectRoom, selectedRoomId, isLoading, onNewChat, onRoomDeleted }) {

    const getRoomName = (room) => {
        if (room.nombre && room.participantes.length > 2) {
             return room.nombre; // Si es un grupo con nombre
        }

        // Busca el primer participante que NO seas tú
        const otherParticipant = room.participantes.find(
            p => p.username !== currentUser.username
        );

        if (otherParticipant) {
            // Muestra el nombre y apellido si existen, si no, el username
            return `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim() || otherParticipant.username;
        }
        
        return "Chat Personal"; // Si es un chat contigo mismo
    };

    // 4. Función para eliminar
    const handleDeleteRoom = async (e, roomId) => {
        e.stopPropagation(); // Evita que se seleccione la sala al hacer clic en 'X'
        
        if (window.confirm("¿Estás seguro de que quieres abandonar esta conversación?")) {
            try {
                await apiClient.delete(`/chat/rooms/${roomId}/`);
                // Llamamos a la función del padre para actualizar el estado
                onRoomDeleted(roomId);
            } catch (error) {
                console.error("Error al eliminar la sala:", error);
                alert("No se pudo abandonar la conversación.");
            }
        }
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={20} />
                    Conversaciones
                </span>
                <button 
                    onClick={onNewChat} 
                    className={styles.newChatButton}
                    title="Nueva Conversación"
                >
                    <PlusSquare size={20} />
                </button>
            </div>

            <div className={styles.roomList}>
                {isLoading && <p style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>Cargando...</p>}
                
                {!isLoading && rooms.length === 0 && (
                    <p style={{ padding: '1rem 1.5rem', color: '#9ca3af' }}>
                        No tienes conversaciones. Haz clic en [+] para iniciar una.
                    </p>
                )}
                
                {rooms.map(room => (
                    <div
                        key={room.id}
                        className={`${styles.roomItem} ${room.id === selectedRoomId ? styles.active : ''}`}
                        onClick={() => onSelectRoom(room.id)}
                    >
                        {/* 5. Nombre de la sala */}
                        <span>{getRoomName(room)}</span>
                        
                        {/* 6. Botón de eliminar */}
                        <button 
                            className={styles.deleteRoomButton}
                            onClick={(e) => handleDeleteRoom(e, room.id)}
                            title="Abandonar"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </aside>
    );
}