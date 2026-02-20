
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { ChatMessage, Course } from '../types';
import { getAIAssistance } from '../services/geminiService';
import { IconUser, IconSparkles, IconSend, IconPaperclip, IconX } from './Icons';

interface StudentAssistantPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  allCourses: Course[];
  basePrompt: string;
  customContext: string;
}

const StudentAssistantPreview: React.FC<StudentAssistantPreviewProps> = ({ isOpen, onClose, allCourses, basePrompt, customContext }) => {
    const initialMessage: ChatMessage = { sender: 'ai', text: 'Esta es una vista previa del Asistente para Estudiantes. Tus conversaciones aquí son temporales y no se guardarán.', timestamp: new Date().toISOString(), isConversationStart: true };
    const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(allCourses[0]?.id || null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedCourse = useMemo(() => {
        return allCourses.find(c => c.id === selectedCourseId) || null;
    }, [allCourses, selectedCourseId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
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
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
            timestamp: new Date().toISOString()
        };
        if (fileToSend) {
            userMessage.imageUrl = URL.createObjectURL(fileToSend);
        }
        
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setImageFile(null);
        setImagePreview(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
        
        try {
            const aiResponseText = await getAIAssistance(history, query, JSON.stringify(selectedCourse), basePrompt, customContext, fileToSend);
            const aiMessage: ChatMessage = { sender: 'ai', text: aiResponseText, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Error in assistant preview:", error);
            const errorMessage: ChatMessage = { sender: 'ai', text: 'Lo siento, algo salió mal durante la prueba.', timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div 
                className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] max-h-[700px] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                            <IconSparkles className="w-6 h-6 text-primary mr-2" />
                            Prueba del Asistente para Estudiantes
                        </h2>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Contexto del curso:
                             <select 
                                value={selectedCourseId || ''} 
                                onChange={e => setSelectedCourseId(e.target.value)}
                                className="ml-2 bg-transparent dark:bg-dark-card border-b border-gray-400 dark:border-gray-600 focus:outline-none"
                            >
                                {allCourses.map(course => (
                                    <option key={course.id} value={course.id}>{course.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <IconX className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((message, index) => (
                        <div key={index} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                            {message.sender === 'ai' && (
                                <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center">
                                    <IconSparkles className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div className={`max-w-md md:max-w-lg lg:max-w-xl px-4 py-2 rounded-xl ${message.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                {message.imageUrl && (
                                    <img src={message.imageUrl} alt="Contexto de usuario" className="rounded-lg mb-2 max-w-xs max-h-40" />
                                )}
                                {message.text && <p className="whitespace-pre-wrap text-sm">{message.text}</p>}
                            </div>
                            {message.sender === 'user' && (
                               <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 flex items-center justify-center">
                                    <IconUser className="w-5 h-5 text-gray-800 dark:text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center">
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

                <footer className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                     {imagePreview && (
                        <div className="relative w-20 h-20 mb-2 p-1 border rounded-md ml-2">
                            <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover rounded" />
                            <button onClick={removeImage} className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5 hover:bg-red-500">
                                <IconX className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <div className="flex items-end space-x-2">
                         <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors"
                            aria-label="Adjuntar imagen"
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
                            placeholder="Haz una pregunta como si fueras un estudiante..."
                            className="flex-1 w-full px-4 py-2 text-sm text-gray-900 dark:text-gray-50 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none max-h-24"
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoading || (!userInput.trim() && !imageFile)}
                            className="p-2 bg-primary text-white rounded-full hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            aria-label="Enviar mensaje"
                        >
                            <IconSend className="w-5 h-5" />
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default StudentAssistantPreview;
