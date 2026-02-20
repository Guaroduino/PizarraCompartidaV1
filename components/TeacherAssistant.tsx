
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import type { ChatMessage } from '../types';
import { getAIContentCreationAssistance } from '../services/geminiService';
import { IconSparkles, IconSend, IconPaperclip, IconX, IconPlus, IconDownload, IconClipboardCopy, IconCheck, IconClock } from './Icons';
import { uploadFile } from '../services/storageService';
import { auth, db } from '../services/firebase';

interface TeacherAssistantProps {
  basePrompt: string;
  customContext: string;
  courseContext: string;
  onHeightChange: (height: number) => void;
  onViewHistory: () => void;
}

const MIN_HEIGHT = 80; // Minimum height of the panel in pixels
const DEFAULT_HEIGHT = 350; // Default height
const COLLAPSED_HEIGHT = 56;

const TeacherAssistant: React.FC<TeacherAssistantProps> = ({ basePrompt, customContext, courseContext, onHeightChange, onViewHistory }) => {
    const initialMessage: ChatMessage = { sender: 'ai', text: '¡Hola! Soy tu asistente de creación de contenido. ¿En qué te puedo ayudar a crear hoy?', timestamp: new Date().toISOString(), isConversationStart: true };
    const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const resizeHandleRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        const loadChatHistory = async () => {
            if (!auth.currentUser) return;
            const userId = auth.currentUser.uid;
            const chatDocId = `${userId}_teacher_assistant`;
            const chatDocRef = doc(db, 'chatHistories', chatDocId);

            try {
                const docSnap = await getDoc(chatDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                     if (data.messages && data.messages.length > 0) {
                        const sortedMessages: ChatMessage[] = data.messages.sort((a: ChatMessage, b: ChatMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        
                        let lastConversationStartIndex = 0;
                        for (let i = sortedMessages.length - 1; i >= 0; i--) {
                            if (sortedMessages[i].isConversationStart) {
                                lastConversationStartIndex = i;
                                break;
                            }
                        }
                        const latestConversation = sortedMessages.slice(lastConversationStartIndex);
                        setMessages(latestConversation);
                    }
                }
            } catch (error) {
                console.error("Error loading teacher chat history:", error);
            }
        };
        loadChatHistory();
    }, []);

    useEffect(() => {
        onHeightChange(isCollapsed ? COLLAPSED_HEIGHT : height);
    }, [isCollapsed, height, onHeightChange]);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleNewConversation = async () => {
        if (isLoading) return;
        const newGreeting: ChatMessage = {
            sender: 'ai',
            text: '¡Perfecto! Una pizarra en blanco. ¿Qué necesitas crear ahora?',
            timestamp: new Date().toISOString(),
            isConversationStart: true,
        };
        setMessages([newGreeting]);

        if (auth.currentUser) {
            const userId = auth.currentUser.uid;
            const chatDocId = `${userId}_teacher_assistant`;
            const chatDocRef = doc(db, 'chatHistories', chatDocId);
            try {
                const docSnap = await getDoc(chatDocRef);
                if (docSnap.exists()) {
                    await updateDoc(chatDocRef, {
                        messages: arrayUnion(newGreeting)
                    });
                } else {
                     await setDoc(chatDocRef, { 
                        userId, 
                        type: 'teacher_assistant', 
                        messages: [newGreeting],
                        lastUpdated: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error("Error saving new teacher conversation greeting:", error);
            }
        }
    };

    const handleDownloadChat = () => {
        const fileContent = messages.map(message => {
            const date = new Date(message.timestamp).toLocaleString();
            const sender = message.sender === 'ai' ? 'Asistente' : 'Profesor';
            const text = message.text || '';
            const imageUrl = message.imageUrl ? `\n[Imagen adjunta: ${message.imageUrl}]` : '';
            return `[${date}] ${sender}:\n${text}${imageUrl}\n\n--------------------------------------\n`;
        }).join('');

        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historial-chat-profesor-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    const handleSendMessage = async () => {
        if ((userInput.trim() === '' && !imageFile) || isLoading) return;
    
        setIsLoading(true);
        const history = messages;
        const query = userInput;
        const fileToSend = imageFile;

        const userMessage: ChatMessage = {
            sender: 'user',
            text: query,
            timestamp: new Date().toISOString(),
        };
        if (fileToSend) {
            userMessage.imageUrl = URL.createObjectURL(fileToSend);
        }

        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setImageFile(null);
        setImagePreview(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
        
        const uploadedImageUrl = userMessage.imageUrl;
        delete userMessage.imageUrl; // Don't save blob url to Firestore
    
        if (fileToSend) {
             try {
                const firebaseUrl = await uploadFile(`assistant-uploads/teacher-${auth.currentUser?.uid || 'unknown'}`, fileToSend);
                userMessage.imageUrl = firebaseUrl;
                 setMessages(prev => prev.map(msg => msg.timestamp === userMessage.timestamp ? { ...msg, imageUrl: firebaseUrl } : (msg.timestamp === userMessage.timestamp && uploadedImageUrl ? {...msg, imageUrl: uploadedImageUrl} : msg) ));
            } catch (error) {
                console.error("Error uploading assistant image:", error);
                const errorMessage: ChatMessage = { sender: 'ai', text: 'Lo siento, hubo un problema al subir tu imagen.', timestamp: new Date().toISOString() };
                setMessages(prev => [...prev, errorMessage]);
                setIsLoading(false);
                return;
            }
        }
    
        try {
            const aiResponse = await getAIContentCreationAssistance(history, query, courseContext, basePrompt, customContext, fileToSend);
            const aiMessage: ChatMessage = { sender: 'ai', text: aiResponse, timestamp: new Date().toISOString() };
    
            setMessages(prev => [...prev, aiMessage]);
            
            if (auth.currentUser) {
                const userId = auth.currentUser.uid;
                const chatDocId = `${userId}_teacher_assistant`;
                const chatDocRef = doc(db, 'chatHistories', chatDocId);
                
                const messageToSave: ChatMessage = { ...userMessage };
                if (messageToSave.imageUrl === undefined) {
                    delete messageToSave.imageUrl;
                }

                const docSnap = await getDoc(chatDocRef);
                if (docSnap.exists()) {
                     await updateDoc(chatDocRef, {
                        messages: arrayUnion(messageToSave, aiMessage),
                        lastUpdated: new Date().toISOString()
                    });
                } else {
                    await setDoc(chatDocRef, { 
                        userId, 
                        type: 'teacher_assistant', 
                        messages: [history[0], messageToSave, aiMessage],
                        lastUpdated: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            console.error("Error in handleSendMessage (Teacher):", error);
            const errorMessage: ChatMessage = { sender: 'ai', text: 'Lo siento, algo salió mal.', timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleResize = useCallback((e: MouseEvent) => {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight >= MIN_HEIGHT) {
            setHeight(newHeight);
        }
    }, []);

    const stopResize = useCallback(() => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', stopResize);
    }, [handleResize]);
    
    const startResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        window.addEventListener('mousemove', handleResize);
        window.addEventListener('mouseup', stopResize);
    }, [handleResize, stopResize]);
    
    const handleCopy = (text: string, timestamp: string) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                setCopiedMessageId(timestamp);
                setTimeout(() => setCopiedMessageId(null), 2000);
            })
            .catch(err => console.error('Failed to copy text: ', err));
    };


    return (
        <div 
            className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-dark-card shadow-[0_-5px_15px_-3px_rgba(0,0,0,0.1)] border-t border-gray-200 dark:border-gray-700 transition-all duration-300"
            style={{ height: isCollapsed ? `${COLLAPSED_HEIGHT}px` : `${height}px` }}
        >
             <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <div 
                ref={resizeHandleRef}
                onMouseDown={startResize}
                className="absolute -top-1 left-0 w-full h-2 cursor-row-resize flex items-center justify-center group"
                hidden={isCollapsed}
            >
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-primary transition-colors"></div>
            </div>

            <div className="flex flex-col h-full">
                <header 
                    className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center"
                >
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                            <IconSparkles className="w-6 h-6 text-secondary mr-2" />
                            Asistente de Creación de Contenido
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="flex items-center gap-2" hidden={isCollapsed}>
                             <button 
                                onClick={onViewHistory}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                aria-label="Ver historial de conversaciones"
                            >
                                <IconClock className="w-4 h-4"/>
                                Historial
                            </button>
                             <button 
                                onClick={handleDownloadChat}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                                disabled={isLoading || messages.length <= 1}
                                aria-label="Descargar conversación"
                            >
                                <IconDownload className="w-4 h-4"/>
                                Descargar
                            </button>
                            <button 
                                onClick={handleNewConversation} 
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-secondary bg-secondary/10 hover:bg-secondary/20 rounded-md disabled:opacity-50" 
                                disabled={isLoading}
                            >
                                <IconPlus className="w-4 h-4"/>
                                Nuevo
                            </button>
                        </div>
                        <button 
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                            aria-label={isCollapsed ? "Expandir asistente" : "Contraer asistente"}
                        >
                            <svg className={`w-6 h-6 transform transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </button>
                    </div>
                </header>

                {!isCollapsed && (
                    <>
                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {messages.map((message, index) => (
                                <div key={index} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                                    {message.sender === 'ai' && (
                                        <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
                                            <IconSparkles className="w-5 h-5 text-white" />
                                        </div>
                                    )}
                                    <div className={`relative max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl rounded-xl ${message.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                        <div className="px-4 py-3">
                                            {message.imageUrl && (
                                                <img src={message.imageUrl} alt="Contexto de usuario" className="rounded-lg mb-2 max-w-xs max-h-40" />
                                            )}
                                            {message.text && (
                                                <div
                                                    className="text-sm rich-text-content"
                                                    dangerouslySetInnerHTML={{ __html: message.text }}
                                                />
                                            )}
                                        </div>
                                        {message.sender === 'ai' && !message.isConversationStart && message.text && (
                                            <div className="absolute -bottom-3 right-3">
                                                <button
                                                    onClick={() => handleCopy(message.text, message.timestamp)}
                                                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 bg-white hover:bg-gray-200 rounded-md shadow border dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:border-gray-500 transition-all duration-200"
                                                    title="Copiar contenido HTML"
                                                >
                                                    {copiedMessageId === message.timestamp ? (
                                                        <>
                                                            <IconCheck className="w-3.5 h-3.5 text-green-500" />
                                                            <span>¡Copiado!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <IconClipboardCopy className="w-3.5 h-3.5" />
                                                            <span>Copiar</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
                                    <IconSparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="max-w-lg px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 rounded-bl-none">
                                    <div className="flex items-center justify-center space-x-1.5">
                                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                            {/* FIX: Fixed typo w-1.S5 to w-1.5 in loading indicator. */}
                                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse"></div>
                                    </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                             {imagePreview && (
                                <div className="relative w-20 h-20 mb-2 p-1 border rounded-md">
                                    <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover rounded" />
                                    <button onClick={removeImage} className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5 hover:bg-red-500">
                                        <IconX className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-end space-x-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading}
                                    className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors"
                                >
                                    <IconPaperclip className="w-5 h-5" />
                                </button>
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Pide ideas para una unidad, una tarea, un proyecto..."
                                    className="flex-1 w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-50 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary resize-none max-h-24"
                                    rows={1}
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isLoading || (!userInput.trim() && !imageFile)}
                                    className="p-2 bg-secondary text-white rounded-full hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                    <IconSend className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TeacherAssistant;
