import React from 'react';
import styles from '../../css/chat.module.css';
import { Users, PlusSquare } from 'lucide-react'; // <-- Importar PlusSquare

// <-- 1. Recibir la nueva prop 'onNewChat'
export default function ChatSidebar({ rooms, currentUser, onSelectRoom, selectedRoomId, isLoading, onNewChat }) {

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

    return (
        <aside className={styles.sidebar}>
            {/* --- 2. MODIFICAR EL HEADER --- */}
            <div className={styles.sidebarHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            {/* --- FIN DE LA MODIFICACIÓN --- */}

            <div className={styles.roomList}>
                {isLoading && <p style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>Cargando...</p>}
                
                {!isLoading && rooms.length === 0 && (
                    // --- 3. Mensaje actualizado ---
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
                        {getRoomName(room)}
                    </div>
                ))}
            </div>
        </aside>
    );
}