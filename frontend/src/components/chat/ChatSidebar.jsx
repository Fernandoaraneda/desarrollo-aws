import React, { useState } from 'react';
import styles from '../../css/chat.module.css';
import { Users, PlusSquare, X, Search } from 'lucide-react'; 
import apiClient from '../../api/axios.js';
import ConfirmModal from '../modals/ConfirmModal.jsx'; 

export default function ChatSidebar({ rooms, currentUser, onSelectRoom, selectedRoomId, isLoading, onNewChat, onRoomDeleted }) {
    const [searchTerm, setSearchTerm] = useState("");
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [chatToDeleteId, setChatToDeleteId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const filteredRooms = rooms.filter(room => {
        const roomName = getRoomName(room).toLowerCase();
        return roomName.includes(searchTerm.toLowerCase());
    });


    const handleDeleteClick = (e, roomId) => {
        e.stopPropagation(); 
        setChatToDeleteId(roomId);
        setIsDeleteModalOpen(true);
    };

   
    const confirmDelete = async () => {
        if (!chatToDeleteId) return;

        setIsDeleting(true);
        try {
            await apiClient.delete(`/chat/rooms/${chatToDeleteId}/`);
            onRoomDeleted(chatToDeleteId); 
            setIsDeleteModalOpen(false);   
            setChatToDeleteId(null);       
        } catch (error) {
            console.error("Error al eliminar la sala:", error);
            alert("Hubo un error al intentar abandonar la conversación.");
        } finally {
            setIsDeleting(false);
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

            <div className={styles.sidebarSearchContainer}>
                <div className={styles.searchBox}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        placeholder="Buscar chat..."
                        className={styles.sidebarSearchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.roomList}>
                {isLoading && <p style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>Cargando...</p>}
                
                {!isLoading && rooms.length === 0 && (
                    <p style={{ padding: '1rem 1.5rem', color: '#9ca3af' }}>
                        No tienes conversaciones. Haz clic en [+] para iniciar una.
                    </p>
                )}

                {!isLoading && rooms.length > 0 && filteredRooms.length === 0 && (
                    <p style={{ padding: '1rem 1.5rem', color: '#9ca3af', textAlign: 'center' }}>
                        No se encontraron resultados.
                    </p>
                )}
                
                {filteredRooms.map(room => (
                    <div
                        key={room.id}
                        className={`${styles.roomItem} ${room.id === selectedRoomId ? styles.active : ''}`}
                        onClick={() => onSelectRoom(room.id)}
                    >
                        <span>{getRoomName(room)}</span>
                        
                        <button 
                            className={styles.deleteRoomButton}
                            onClick={(e) => handleDeleteClick(e, room.id)}
                            title="Abandonar"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

           
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Abandonar Conversación"
                message="¿Estás seguro de que quieres abandonar este chat? El historial se eliminará para ti."
                confirmButtonText="Sí, abandonar"
                intent="danger"       
                isConfirming={isDeleting}
            />
        </aside>
    );
}