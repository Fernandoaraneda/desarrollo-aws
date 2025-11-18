import React, { useState } from 'react'; // <-- 1. Importamos useState
import styles from '../../css/chat.module.css';
// <-- 2. Importamos el icono 'Search'
import { Users, PlusSquare, X, Search } from 'lucide-react'; 
import apiClient from '../../api/axios.js';

export default function ChatSidebar({ rooms, currentUser, onSelectRoom, selectedRoomId, isLoading, onNewChat, onRoomDeleted }) {
    // <-- 3. Estado para el buscador
    const [searchTerm, setSearchTerm] = useState("");

    const getRoomName = (room) => {
        if (room.nombre && room.participantes.length > 2) {
             return room.nombre; 
        }

        const otherParticipant = room.participantes.find(
            p => p.username !== currentUser.username
        );

        if (otherParticipant) {
            return `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim() || otherParticipant.username;
        }
        
        return "Chat Personal"; 
    };

    // <-- 4. Lógica de filtrado
    // Filtramos las salas cuyo nombre coincida con lo que escribe el usuario
    const filteredRooms = rooms.filter(room => {
        const roomName = getRoomName(room).toLowerCase();
        return roomName.includes(searchTerm.toLowerCase());
    });

    const handleDeleteRoom = async (e, roomId) => {
        e.stopPropagation(); 
        
        if (window.confirm("¿Estás seguro de que quieres abandonar esta conversación?")) {
            try {
                await apiClient.delete(`/chat/rooms/${roomId}/`);
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

            {/* <-- 5. AÑADIMOS EL CAMPO DE BÚSQUEDA AQUÍ --> */}
            <div className={styles.sidebarSearchContainer}>
                <div className={styles.searchBox}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        placeholder="Buscar chat..."
                        className={styles.sidebarSearchInput} /* <-- Clase CSS nueva */
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.roomList}>
                {isLoading && <p style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>Cargando...</p>}
                
                {/* Mensaje si no hay chats en absoluto */}
                {!isLoading && rooms.length === 0 && (
                    <p style={{ padding: '1rem 1.5rem', color: '#9ca3af' }}>
                        No tienes conversaciones. Haz clic en [+] para iniciar una.
                    </p>
                )}

                {/* Mensaje si hay chats pero la búsqueda no encuentra nada */}
                {!isLoading && rooms.length > 0 && filteredRooms.length === 0 && (
                    <p style={{ padding: '1rem 1.5rem', color: '#9ca3af', textAlign: 'center' }}>
                        No se encontraron resultados.
                    </p>
                )}
                
                {/* <-- 6. Renderizamos la lista FILTRADA (filteredRooms) en vez de rooms */}
                {filteredRooms.map(room => (
                    <div
                        key={room.id}
                        className={`${styles.roomItem} ${room.id === selectedRoomId ? styles.active : ''}`}
                        onClick={() => onSelectRoom(room.id)}
                    >
                        <span>{getRoomName(room)}</span>
                        
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