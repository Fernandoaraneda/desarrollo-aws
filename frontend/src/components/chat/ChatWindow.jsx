import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/axios.js';
import styles from '../../css/chat.module.css';
// 1. AÑADIR LOS ICONOS QUE FALTABAN
import { Send, MessageSquare, Paperclip, XCircle } from 'lucide-react';

export default function ChatWindow({ roomId, currentUser }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    // --- 2. LÓGICA DE POLLING INTELIGENTE (OPCIONAL PERO RECOMENDADO) ---
    // Esta ref guardará el timestamp del último mensaje
    const lastFetchTimestamp = useRef(null);

    // Función para hacer scroll al último mensaje
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // --- 3. FUNCIÓN DE CARGAR MENSAJES (MODIFICADA) ---
    const fetchMessages = async (mode = 'replace') => {
        if (!roomId) return;

        // Mostrar carga solo en la primera carga
        if (mode === 'replace') {
            setIsLoading(true);
        }
       
        let url = `/chat/rooms/${roomId}/messages/`;
        
        // Si es 'append' (polling), pedimos solo mensajes nuevos
        if (mode === 'append' && lastFetchTimestamp.current) {
            // Pide mensajes creados DESPUÉS (greater than) del último que tenemos
            url += `?since=${lastFetchTimestamp.current}`;
        }

        try {
            const response = await apiClient.get(url);
            const newMessages = response.data.results || response.data;

            if (newMessages.length > 0) {
                // Actualizamos el timestamp con el del último mensaje recibido
                lastFetchTimestamp.current = newMessages[newMessages.length - 1].creado_en;

                if (mode === 'replace') {
                    setMessages(newMessages); // Reemplaza todos
                } else if (mode === 'append') {
                    // Añade solo los nuevos, evitando duplicados
                    setMessages(prev => [
                        ...prev,
                        ...newMessages.filter(nm => !prev.find(pm => pm.id === nm.id))
                    ]);
                }
            } else if (mode === 'replace') {
                 setMessages([]); // Si es 'replace' y no vino nada, vaciamos
            }
            
        } catch (error) {
            console.error("Error al cargar mensajes:", error);
        } finally {
            if (mode === 'replace') {
                setIsLoading(false);
            }
        }
    };

    // --- 4. POLLING (MODIFICADO) ---
    useEffect(() => {
        if (roomId) {
            // 1. Carga inicial
            lastFetchTimestamp.current = null; // Resetea el timestamp
            fetchMessages('replace');

            // 2. Inicia el "polling" (ahora pide solo nuevos)
            const interval = setInterval(() => {
                fetchMessages('append');
            }, 5000); // 5000ms = 5 segundos

            // 3. Limpia el intervalo
            return () => clearInterval(interval);
        } else {
            // Si no hay sala seleccionada, limpia todo
            setMessages([]);
            lastFetchTimestamp.current = null;
        }
    }, [roomId]); // Este efecto se reinicia CADA VEZ que cambia el roomId

    // Efecto para hacer scroll cuando llegan mensajes nuevos
    useEffect(() => {
        scrollToBottom();
    }, [messages]); // Se ejecuta cada vez que el array 'messages' cambia

    // Función para enviar un mensaje
    const handleSend = async (e) => {
        e.preventDefault();
        // Permitir enviar solo archivo sin texto
        if ((newMessage.trim() === "" && !selectedFile) || isSending) return;

        setIsSending(true);
        
        const formData = new FormData();
        formData.append('contenido', newMessage);
        if (selectedFile) {
            formData.append('archivo', selectedFile);
        }

        try {
            await apiClient.post(`/chat/rooms/${roomId}/messages/`, formData, {
                // No es necesario setear 'Content-Type', el navegador lo hace
            });
            
            setNewMessage(""); 
            setSelectedFile(null); 
            if (fileInputRef.current) {
                fileInputRef.current.value = null; 
            }
            
            // Recargamos solo los mensajes nuevos (incluyendo el nuestro)
            await fetchMessages('append');

        } catch (error) {
            console.error("Error al enviar mensaje:", error);
            alert("No se pudo enviar el mensaje.");
        } finally {
            setIsSending(false);
        }
    };

    // Funciones para manejar el archivo
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    const clearFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = null; 
        }
    };

    // Si no hay sala seleccionada, muestra un placeholder
    if (!roomId) {
        return (
            <div className={styles.chatWindowPlaceholder}>
                <MessageSquare size={48} />
                <p>Selecciona una conversación para empezar a chatear.</p>
            </div>
        );
    }

    return (
        <main className={styles.chatWindow}>
            <div className={styles.messagesContainer}>
                {isLoading && messages.length === 0 && <p>Cargando mensajes...</p>}
                
                {/* --- 5. LÓGICA DE RENDERIZADO (CORREGIDA) --- */}
                {messages.map(msg => {
                    // Esta lógica va DENTRO del map
                    const isImage = msg.archivo && (
                        msg.archivo.endsWith('.jpg') || 
                        msg.archivo.endsWith('.jpeg') || 
                        msg.archivo.endsWith('.png') || 
                        msg.archivo.endsWith('.gif')
                    );
                    
                    return (
                        <div
                            key={msg.id}
                            className={`${styles.messageBubble} ${msg.autor?.username === currentUser.username ? styles.mine : styles.theirs}`}
                        >
                            <div className={styles.messageMeta}>
                                <strong>{msg.autor?.first_name || msg.autor?.username}</strong>
                                {' • '}
                                {new Date(msg.creado_en).toLocaleString('es-CL', { timeStyle: 'short', dateStyle: 'short' })}
                            </div>
                            
                            {/* Renderiza el texto (si existe) */}
                            {msg.contenido}

                            {/* Renderiza el archivo (si existe) */}
                            {msg.archivo && (
                                <div className={styles.fileAttachment}>
                                    {isImage ? (
                                        <a href={msg.archivo} target="_blank" rel="noopener noreferrer">
                                            <img src={msg.archivo} alt="Adjunto" style={{ maxWidth: '200px', borderRadius: '8px', marginTop: '5px' }} />
                                        </a>
                                    ) : (
                                        <a href={msg.archivo} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                                            <Paperclip size={16} />
                                            {/* Extrae el nombre del archivo de la URL */}
                                            {msg.archivo.split('/').pop()}
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                {/* Este div invisible nos ayuda a hacer scroll al final */}
                <div ref={messagesEndRef} />
            </div>

            {/* Vista previa del archivo a enviar */}
            {selectedFile && (
                <div className={styles.filePreview}>
                    <span>{selectedFile.name}</span>
                    <button onClick={clearFile}><XCircle size={16} /></button>
                </div>
            )}

            {/* --- 6. FORMULARIO (CORREGIDO) --- */}
            {/* Solo debe haber UN formulario */}
            <form className={styles.messageForm} onSubmit={handleSend}>
                {/* Input de archivo oculto */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                
                {/* Botón para adjuntar */}
                <button
                    type="button" // Importante: 'type="button"' para que no envíe el form
                    className={styles.attachButton}
                    onClick={triggerFileInput}
                    disabled={isSending}
                >
                    <Paperclip size={18} />
                </button>
                
                {/* Input de texto */}
                <input
                    type="text"
                    className={styles.messageInput}
                    placeholder="Escribe tu mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSending}
                />
                
                {/* Botón de enviar */}
                <button
                    type="submit"
                    className={styles.sendButton}
                    // Lógica de 'disabled' corregida
                    disabled={isSending || (newMessage.trim() === "" && !selectedFile)}
                >
                    <Send size={18} />
                </button>
            </form>
        </main>
    );
}