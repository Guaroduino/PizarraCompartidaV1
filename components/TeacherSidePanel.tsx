
import React, { useState, useRef, useEffect } from 'react';
import { getTeacherFlashChat, generateTeacherImage } from '../services/geminiService';
import type { ChatMessage } from '../types';
import { IconSend, IconSparkles, IconImage, IconX } from './Icons';

const PREDEFINED_STYLES = ['Ninguno', 'Realista', 'Pixel Art', 'Acuarela', 'Render 3D', 'Anime', 'Dibujo a lápiz', 'Ilustración infantil'];

interface TeacherSidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    onDragImageStart: (e: React.DragEvent, imageUrl: string) => void;
}

const TeacherSidePanel: React.FC<TeacherSidePanelProps> = ({ isOpen, onClose, onDragImageStart }) => {
    const [activeTab, setActiveTab] = useState<'chat' | 'image'>('chat');

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([
        { sender: 'ai', text: '¡Hola! Soy tu asistente rápido. ¿Necesitas ideas para la clase?', timestamp: new Date().toISOString() }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Image Gen State
    const [imagePrompt, setImagePrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('Ninguno');
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && activeTab === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, activeTab]);

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isChatLoading) return;

        const userMsg: ChatMessage = { sender: 'user', text: chatInput, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setIsChatLoading(true);

        try {
            const aiResponse = await getTeacherFlashChat(messages, chatInput);
            setMessages(prev => [...prev, { sender: 'ai', text: aiResponse, timestamp: new Date().toISOString() }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { sender: 'ai', text: "Hubo un error. Intenta de nuevo.", timestamp: new Date().toISOString() }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleImageSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imagePrompt.trim() || isImageLoading) return;

        setIsImageLoading(true);
        setErrorMessage(null);

        try {
            // Combine prompt and style
            const finalPrompt = selectedStyle !== 'Ninguno'
                ? `${imagePrompt}. Estilo visual: ${selectedStyle}`
                : imagePrompt;

            const base64Image = await generateTeacherImage(finalPrompt);
            if (base64Image) {
                setGeneratedImages(prev => [base64Image, ...prev]);
            } else {
                setErrorMessage("No se pudo generar la imagen. Intenta con otro prompt.");
            }
        } catch (error: any) {
            console.error(error);
            let msg = "Error al generar imagen.";
            if (error.message?.includes("API key")) {
                msg = "Error de API Key: Si la URL de la app ha cambiado, asegúrate de actualizar las restricciones HTTP de tu clave en Google Cloud Console.";
            } else if (error.message?.includes("400")) {
                msg = "Error 400: Posible problema de clave API o parámetros inválidos.";
            }
            setErrorMessage(msg);
        } finally {
            setIsImageLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 right-0 h-full w-80 bg-white dark:bg-dark-card border-l border-gray-200 dark:border-gray-700 shadow-2xl z-[60] flex flex-col transition-transform duration-300">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <IconSparkles className="w-5 h-5 text-secondary" />
                    Asistente IA
                </h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <IconX className="w-5 h-5" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    <span className="text-lg">💬</span> Chat
                </button>
                <button
                    onClick={() => setActiveTab('image')}
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'image' ? 'text-secondary border-b-2 border-secondary bg-secondary/5' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    <IconImage className="w-4 h-4" /> Imágenes
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col relative">

                {/* --- CHAT MODE --- */}
                {activeTab === 'chat' && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[90%] px-3 py-2 rounded-xl text-sm ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && (
                                <div className="flex items-center gap-1 text-gray-400 text-xs ml-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100" />
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200" />
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleChatSubmit} className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="Escribe tu consulta..."
                                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <button type="submit" disabled={!chatInput.trim() || isChatLoading} className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
                                <IconSend className="w-4 h-4" />
                            </button>
                        </form>
                    </>
                )}

                {/* --- IMAGE MODE --- */}
                {activeTab === 'image' && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {errorMessage && (
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-300">
                                    {errorMessage}
                                </div>
                            )}

                            {generatedImages.length === 0 && !isImageLoading && !errorMessage && (
                                <div className="text-center text-gray-400 mt-10">
                                    <IconImage className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Genera imágenes para tus clases.</p>
                                    <p className="text-xs mt-1">Arrastra el resultado a la pizarra.</p>
                                </div>
                            )}

                            {isImageLoading && (
                                <div className="bg-gray-100 dark:bg-gray-700 rounded-xl aspect-square flex items-center justify-center animate-pulse">
                                    <IconSparkles className="w-8 h-8 text-gray-400" />
                                </div>
                            )}

                            {generatedImages.map((img, i) => (
                                <div key={i} className="relative group rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-black">
                                    <img
                                        src={img}
                                        alt="Generada por IA"
                                        className="w-full h-auto object-contain cursor-grab active:cursor-grabbing"
                                        draggable
                                        onDragStart={(e) => onDragImageStart(e, img)}
                                        crossOrigin="anonymous"
                                    />
                                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                        Arrástrame
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleImageSubmit} className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col gap-3">

                            {/* Style Manager */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1">Estilo Visual</span>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                                    {PREDEFINED_STYLES.map((style, idx) => (
                                        <div
                                            key={idx}
                                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer transition-all border ${selectedStyle === style ? 'bg-secondary border-secondary text-white shadow-md' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                                            onClick={() => setSelectedStyle(style)}
                                        >
                                            {style}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="relative">
                                <textarea
                                    value={imagePrompt}
                                    onChange={e => setImagePrompt(e.target.value)}
                                    placeholder="Ej: Un volcán en erupción de noche..."
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                                    rows={2}
                                />
                            </div>
                            <button type="submit" disabled={!imagePrompt.trim() || isImageLoading} className="w-full py-2.5 bg-secondary text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm flex items-center justify-center gap-2 shadow-sm transition-colors">
                                <IconSparkles className="w-4 h-4" />
                                Generar Imagen
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default TeacherSidePanel;
