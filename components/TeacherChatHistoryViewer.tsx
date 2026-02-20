import React, { useState, useEffect } from 'react';
import { doc, getDoc } from "firebase/firestore";
import { db } from '../services/firebase';
import type { User, ChatMessage } from '../types';
import { IconSparkles, IconChevronDown, IconX } from './Icons';

interface TeacherChatHistoryViewerProps {
    user: User;
    onClose: () => void;
}

const TeacherChatHistoryViewer: React.FC<TeacherChatHistoryViewerProps> = ({ user, onClose }) => {
    const [conversations, setConversations] = useState<ChatMessage[][]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadChatHistory = async () => {
            const chatDocId = `${user.uid}_teacher_assistant`;
            const chatDocRef = doc(db, 'chatHistories', chatDocId);

            try {
                const docSnap = await getDoc(chatDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.messages && data.messages.length > 0) {
                        const sortedMessages: ChatMessage[] = data.messages.sort((a: ChatMessage, b: ChatMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        
                        const groupedConversations: ChatMessage[][] = [];
                        let currentConversation: ChatMessage[] = [];

                        sortedMessages.forEach(message => {
                            if (message.isConversationStart && currentConversation.length > 0) {
                                groupedConversations.push(currentConversation);
                                currentConversation = [];
                            }
                            currentConversation.push(message);
                        });

                        if (currentConversation.length > 0) {
                            groupedConversations.push(currentConversation);
                        }

                        setConversations(groupedConversations.reverse()); // Show most recent first
                    } else {
                        setConversations([]);
                    }
                } else {
                    setError("No se encontró historial de chat.");
                }
            } catch (err: any) {
                console.error("Error loading chat history:", err);
                setError("No se pudo cargar el historial de chat.");
            } finally {
                setIsLoading(false);
            }
        };

        loadChatHistory();
    }, [user.uid]);

    return (
        <div className="flex flex-col h-full max-h-[90vh] max-w-4xl mx-auto bg-white dark:bg-dark-card rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
             {/* @ts-ignore */}
            <style jsx>{`
                details > summary::-webkit-details-marker { display: none; }
                details[open] .details-open\\:rotate-180 { transform: rotate(180deg); }
            `}</style>
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Mi Historial de Conversaciones
                </h1>
                <button 
                    onClick={onClose} 
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-label="Cerrar historial"
                >
                    <IconX className="w-6 h-6" />
                </button>
            </header>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500">{error}</div>
                ) : conversations.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">No tienes conversaciones guardadas.</div>
                ) : (
                    conversations.map((conversation, convIndex) => (
                       <details key={convIndex} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg" open={convIndex === 0}>
                            <summary className="w-full flex justify-between items-center p-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-t-lg">
                                <div className="font-semibold text-gray-800 dark:text-white">
                                    Conversación #{conversations.length - convIndex}
                                    <span className="ml-3 text-sm font-normal text-gray-500 dark:text-gray-400">
                                        {new Date(conversation[0]?.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <IconChevronDown className="w-5 h-5 transition-transform details-open:rotate-180 text-gray-500" />
                            </summary>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-6">
                                {conversation.map((message, msgIndex) => (
                                     <div key={msgIndex} className={`flex items-start gap-4 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                                        {message.sender === 'ai' && (
                                            <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
                                                <IconSparkles className="w-6 h-6 text-white" />
                                            </div>
                                        )}
                                        <div className={`max-w-lg lg:max-w-2xl xl:max-w-3xl px-5 py-3 rounded-2xl ${message.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                            {message.imageUrl && (
                                                <a href={message.imageUrl} target="_blank" rel="noopener noreferrer" title="Ver imagen completa">
                                                    <img src={message.imageUrl} alt="Contexto de usuario" className="rounded-lg mb-2 max-w-xs max-h-48 cursor-pointer" />
                                                </a>
                                            )}
                                            {message.text && (
                                                message.sender === 'ai' ? (
                                                    <div
                                                        className="rich-text-content"
                                                        dangerouslySetInnerHTML={{ __html: message.text }}
                                                    />
                                                ) : (
                                                    <p className="whitespace-pre-wrap">{message.text}</p>
                                                )
                                            )}
                                            <p className="text-xs mt-2 opacity-60 text-right">{new Date(message.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                       </details>
                    ))
                )}
            </div>
        </div>
    );
};

export default TeacherChatHistoryViewer;