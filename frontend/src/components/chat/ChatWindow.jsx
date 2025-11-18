import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/axios.js';
import styles from '../../css/chat.module.css';
import { Send, MessageSquare, Paperclip, XCircle, ArrowLeft } from 'lucide-react';
import AuthenticatedImage from '../AuthenticatedImage';
import AlertModal from '../modals/AlertModal'; 

export default function ChatWindow({ roomId, currentUser, chatName, onBack }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const [errorModal, setErrorModal] = useState({ isOpen: false, message: "" });


    const MAX_FILE_SIZE_MB = 10;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    const ALLOWED_FILE_TYPES = [
        "image/*",
        ".pdf",
        ".doc",
        ".docx",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ].join(',');

    const textInputRef = useRef(null);
    const lastFetchTimestamp = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async (mode = 'replace') => {
        if (!roomId) return;
        if (mode === 'replace') setIsLoading(true);
        
        let url = `/chat/rooms/${roomId}/messages/`;
        if (mode === 'append' && lastFetchTimestamp.current) {
            url += `?since=${lastFetchTimestamp.current}`;
        }

        try {
            const response = await apiClient.get(url);
            const newMessages = response.data.results || response.data;

            if (newMessages.length > 0) {
                lastFetchTimestamp.current = newMessages[newMessages.length - 1].creado_en;
                if (mode === 'replace') {
                    setMessages(newMessages);
                } else if (mode === 'append') {
                    setMessages(prev => [
                        ...prev,
                        ...newMessages.filter(nm => !prev.find(pm => pm.id === nm.id))
                    ]);
                }
            } else if (mode === 'replace') {
                 setMessages([]);
            }
        } catch (error) {
            console.error("Error al cargar mensajes:", error);
            setErrorModal({ isOpen: true, message: "No se pudieron cargar los mensajes." });
        } finally {
            if (mode === 'replace') setIsLoading(false);
        }
    };

    useEffect(() => {
        if (roomId) {
            lastFetchTimestamp.current = null;
            fetchMessages('replace');
            const interval = setInterval(() => {
                fetchMessages('append');
            }, 5000); 
            return () => clearInterval(interval);
        } else {
            setMessages([]);
            lastFetchTimestamp.current = null;
        }
    }, [roomId]); 

    useEffect(() => {
        scrollToBottom();
    }, [messages]); 

    const handleSend = async (e) => {
        e.preventDefault();
        if ((newMessage.trim() === "" && !selectedFile) || isSending) return;

        setIsSending(true);
        
        const formData = new FormData();
        formData.append('contenido', newMessage);
        if (selectedFile) {
            formData.append('archivo', selectedFile);
        }

        try {
            await apiClient.post(`/chat/rooms/${roomId}/messages/`, formData, {
                headers: {
                    'Content-Type': undefined 
                }
            });
            
            setNewMessage(""); 
            setSelectedFile(null); 
            if (fileInputRef.current) {
                fileInputRef.current.value = null; 
            }
            
            await fetchMessages('append');

        } catch (error) {
            console.error("Error al enviar mensaje:", error);
            const errorMessage = 
                error.response?.data?.archivo?.[0] || 
                error.response?.data?.detail || 
                error.response?.data?.error || 
                "No se pudo enviar el mensaje. Revisa el archivo o tu conexión."; 

            setErrorModal({ isOpen: true, message: errorMessage });
        } finally {
            setIsSending(false);
            setTimeout(() => {
                textInputRef.current?.focus();
            }, 0); 
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (file.size > MAX_FILE_SIZE_BYTES) {
                const message = `Error: El archivo es demasiado grande. Peso máximo: ${MAX_FILE_SIZE_MB}MB.`;
                setErrorModal({ isOpen: true, message: message });
                
                if (fileInputRef.current) {
                    fileInputRef.current.value = null;
                }
                setSelectedFile(null);
                return; 
            }
            
            setSelectedFile(file);
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

    const handleAuthenticatedDownload = async (e, fileUrl) => {
        e.preventDefault(); 
        const fileName = fileUrl.split('/').pop();
        
        try {
            const response = await apiClient.get(fileUrl, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click(); 
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error al descargar archivo:", error);
            setErrorModal({ isOpen: true, message: "No se pudo descargar el archivo." });
        }
    };


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
       
            <div className={styles.chatHeader}>
                <button onClick={onBack} className={styles.backButton}>
                    <ArrowLeft size={24} />
                </button>
                <h3 className={styles.chatTitle}>
                    {chatName || "Chat"}
                </h3>
            </div>

            <div className={styles.messagesContainer}>
                {isLoading && messages.length === 0 && <p style={{textAlign:'center', color:'#9ca3af'}}>Cargando mensajes...</p>}
                
                {messages.map(msg => {
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
                            
                            {msg.contenido}
                            {msg.archivo && (
                                <div className={styles.fileAttachment}>
                                    {isImage ? (
                                        <a href={msg.archivo} onClick={(e) => handleAuthenticatedDownload(e, msg.archivo)} target="_blank" rel="noopener noreferrer">
                                            <AuthenticatedImage 
                                                src={msg.archivo} 
                                                alt="Adjunto" 
                                                className={styles.chatImage} 
                                            />
                                        </a>
                                    ) : (
                                        <a 
                                            href={msg.archivo} 
                                            onClick={(e) => handleAuthenticatedDownload(e, msg.archivo)}
                                            className={styles.fileLink}
                                        >
                                            <Paperclip size={16} />
                                            {msg.archivo.split('/').pop()}
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {selectedFile && (
                <div className={styles.filePreview}>
                    <span>{selectedFile.name}</span>
                    <button onClick={clearFile}><XCircle size={16} /></button>
                </div>
            )}

            <form className={styles.messageForm} onSubmit={handleSend}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept={ALLOWED_FILE_TYPES}
                />
                
                <button
                    type="button" 
                    className={styles.attachButton}
                    onClick={triggerFileInput}
                    disabled={isSending}
                >
                    <Paperclip size={18} />
                </button>
                
                <input
                    type="text"
                    ref={textInputRef}
                    className={styles.messageInput}
                    placeholder="Escribe tu mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSending}
                />
                
                <button
                    type="submit"
                    className={styles.sendButton}
                    disabled={isSending || (newMessage.trim() === "" && !selectedFile)}
                >
                    <Send size={18} />
                </button>
            </form>

            <AlertModal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal({ isOpen: false, message: "" })}
                title="Error al Enviar Mensaje"
                message={errorModal.message}
            />
        </main>
    );
}