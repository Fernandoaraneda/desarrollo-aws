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

    const handleRoomDeleted = (deletedRoomId) => {
        // Quita la sala de la lista
        setRooms(prev => prev.filter(r => r.id !== deletedRoomId));
        
        // Si la sala eliminada era la seleccionada, deselecciónala
        if (selectedRoomId === deletedRoomId) {
            setSelectedRoomId(null);
        }
    };

    // 1. BUSCAMOS LA SALA SELECCIONADA PARA SACAR SU NOMBRE
    const selectedRoom = rooms.find(r => r.id === selectedRoomId);

    return (
        <div className={styles.chatLayout}>
            
            {/* 2. ENVOLVEMOS EL SIDEBAR EN UN DIV CON LA CLASE CONDICIONAL */}
            {/* Si hay chat seleccionado, ocultamos el sidebar en móvil */}
            <div className={`${styles.sidebar} ${selectedRoomId ? styles.hiddenOnMobile : ''}`}>
                <ChatSidebar
                    rooms={rooms}
                    currentUser={user}
                    onSelectRoom={setSelectedRoomId}
                    selectedRoomId={selectedRoomId}
                    isLoading={isLoading}
                    onNewChat={() => setIsModalOpen(true)}
                    onRoomDeleted={handleRoomDeleted}
                />
            </div>

            {/* 3. ENVOLVEMOS LA VENTANA EN UN DIV CON LA CLASE CONDICIONAL */}
            {/* Si NO hay chat seleccionado, ocultamos la ventana en móvil */}
            <div className={`${styles.chatWindow} ${!selectedRoomId ? styles.hiddenOnMobile : ''}`}>
                <ChatWindow
                    key={selectedRoomId || 'empty'} 
                    roomId={selectedRoomId}
                    currentUser={user}
                    // 4. PASAMOS PROPS NUEVAS
                    chatName={selectedRoom ? (selectedRoom.nombre || "Chat") : null}
                    onBack={() => setSelectedRoomId(null)} // Al volver, limpiamos la selección
                />
            </div>
            
            <NewChatModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleNewChatSuccess}
            />
        </div>
    );
}