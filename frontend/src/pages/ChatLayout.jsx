import React, { useState, useEffect } from 'react';
import apiClient from '../api/axios.js';
import styles from '../css/chat.module.css';
import ChatSidebar from '../components/chat/ChatSidebar.jsx';
import ChatWindow from '../components/chat/ChatWindow.jsx';
import NewChatModal from '../components/chat/NewChatModal.jsx'; // <-- 1. Importar el nuevo modal
import { useUserStore } from '../store/authStore.js';

export default function ChatLayout() {
    const { user } = useUserStore();
    const [rooms, setRooms] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false); // <-- 2. Añadir estado para el modal

    // Función para recargar las salas
    const fetchRooms = async () => {
        if (!isLoading) setIsLoading(true); // Mostrar carga si no es la primera vez
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

    // 3. Función que se llama cuando el modal crea un chat
    const handleNewChatSuccess = (newRoom) => {
        setIsModalOpen(false); // Cierra el modal
        
        // Evita duplicados si la sala ya existía
        if (!rooms.find(r => r.id === newRoom.id)) {
            setRooms(prev => [newRoom, ...prev]);
        }
        
        // Selecciona la nueva sala
        setSelectedRoomId(newRoom.id);
    };

    return (
        <div className={styles.chatLayout}>
            <ChatSidebar
                rooms={rooms}
                currentUser={user}
                onSelectRoom={setSelectedRoomId}
                selectedRoomId={selectedRoomId}
                isLoading={isLoading}
                onNewChat={() => setIsModalOpen(true)} // <-- 4. Pasamos la función para abrir el modal
            />
            <ChatWindow
                key={selectedRoomId} 
                roomId={selectedRoomId}
                currentUser={user}
            />
            
            {/* 5. Renderizamos el modal */}
            <NewChatModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleNewChatSuccess}
            />
        </div>
    );
}