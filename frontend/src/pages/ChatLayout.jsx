import React, { useState, useEffect } from 'react';
import apiClient from '../api/axios.js';
import styles from '../css/chat.module.css';
import ChatSidebar from '../components/chat/ChatSidebar.jsx';
import ChatWindow from '../components/chat/ChatWindow.jsx';
import NewChatModal from '../components/chat/NewChatModal.jsx'; 
import { useUserStore } from '../store/authStore.js';

export default function ChatLayout() {
    const { user } = useUserStore();
    const [rooms, setRooms] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false); 

    // Función para recargar las salas
    const fetchRooms = async () => {
        if (!isLoading) setIsLoading(true); 
        try {
            const response = await apiClient.get('/chat/rooms/');
            setRooms(response.data.results || response.data);
        } catch (error) {
            console.error("Error al cargar las salas de chat:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchRooms();
    }, []);

    // Función que se llama cuando el modal crea un chat
    const handleNewChatSuccess = (newRoom) => {
        setIsModalOpen(false); 
        
        if (!rooms.find(r => r.id === newRoom.id)) {
            setRooms(prev => [newRoom, ...prev]);
        }
        
        setSelectedRoomId(newRoom.id);
    };

    // --- 1. AÑADIR ESTA FUNCIÓN ---
    const handleRoomDeleted = (deletedRoomId) => {
        // Quita la sala de la lista
        setRooms(prev => prev.filter(r => r.id !== deletedRoomId));
        
        // Si la sala eliminada era la seleccionada, deselecciónala
        if (selectedRoomId === deletedRoomId) {
            setSelectedRoomId(null);
        }
    };

    return (
        <div className={styles.chatLayout}>
            <ChatSidebar
                rooms={rooms}
                currentUser={user}
                onSelectRoom={setSelectedRoomId}
                selectedRoomId={selectedRoomId}
                isLoading={isLoading}
                onNewChat={() => setIsModalOpen(true)}
                onRoomDeleted={handleRoomDeleted} // <-- 2. Pasar la nueva prop
            />
            <ChatWindow
                key={selectedRoomId} 
                roomId={selectedRoomId}
                currentUser={user}
            />
            
            <NewChatModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleNewChatSuccess}
            />
        </div>
    );
}