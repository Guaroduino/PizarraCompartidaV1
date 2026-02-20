import React, { useState, useMemo } from 'react';
import type { User, Course, ForumMessage } from '../types';
import { IconSend, IconPaperclip, IconX, IconCheck, IconTrash, IconChatBubble } from './Icons';
import { useAppContext } from '../contexts/AppContext';

interface ForumModuleProps {
    user: User;
    course: Course;
    messages: ForumMessage[];
    onAddMessage: (courseId: string, text: string, imageFile: File | null) => Promise<void>;
    onUpdateMessageStatus: (courseId: string, messageId: string, status: 'approved' | 'rejected') => Promise<void>;
    onDeleteMessage: (courseId: string, message: ForumMessage) => Promise<void>;
}

const NewMessageForm: React.FC<{ user: User; courseId: string; onAddMessage: ForumModuleProps['onAddMessage']; }> = ({ user, courseId, onAddMessage }) => {
    const [text, setText] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() && !imageFile) return;
        setIsPosting(true);
        await onAddMessage(courseId, text, imageFile);
        setText('');
        setImageFile(null);
        setImagePreview(null);
        setIsPosting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card p-4 rounded-lg shadow-md mt-6">
            <label htmlFor="forum-textarea" className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                Publicando como: <span className="font-bold">{user.name}</span>
            </label>
            <textarea
                id="forum-textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Escribe un mensaje para la clase..."
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                disabled={isPosting}
            />
            {imagePreview && (
                 <div className="relative w-24 h-24 mt-2 p-1 border rounded-md">
                    <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover rounded" />
                    <button onClick={removeImage} type="button" className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5 hover:bg-red-500">
                        <IconX className="w-4 h-4" />
                    </button>
                </div>
            )}
            <div className="flex justify-between items-center mt-2">
                <label htmlFor="forum-file-upload" className="p-2 text-gray-500 hover:text-primary cursor-pointer rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <IconPaperclip className="w-5 h-5" />
                    <input type="file" id="forum-file-upload" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
                <button type="submit" disabled={isPosting || (!text.trim() && !imageFile)} className="flex items-center gap-2 px-4 py-2 font-bold text-white bg-primary rounded-lg hover:bg-primary-dark disabled:bg-primary/50">
                    <IconSend className="w-5 h-5" />
                    {isPosting ? 'Publicando...' : 'Publicar'}
                </button>
            </div>
        </form>
    );
};


const MessageCard: React.FC<{ message: ForumMessage; onImageClick: (url: string) => void; isTeacher: boolean; onDelete: () => void; onApprove?: () => void; onReject?: () => void; }> = ({ message, onImageClick, isTeacher, onDelete, onApprove, onReject }) => {
    const isPending = message.status === 'pending';
    return (
        <div className={`flex items-start gap-4 p-4 bg-white dark:bg-dark-card rounded-lg shadow ${isPending ? 'border-l-4 border-yellow-400' : ''}`}>
            <img src={message.authorAvatarUrl} alt={message.authorName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            <div className="flex-1">
                <div className="flex items-baseline justify-between">
                    <div>
                        <span className="font-bold text-gray-900 dark:text-white">{message.authorName}</span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{new Date(message.timestamp).toLocaleString()}</span>
                    </div>
                     {isTeacher && (
                        <button onClick={onDelete} title="Eliminar Mensaje" className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                            <IconTrash className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{message.text}</p>
                {message.imageUrl && (
                    <button onClick={() => onImageClick(message.imageUrl)} className="mt-2 rounded-lg overflow-hidden max-w-xs group border dark:border-gray-700">
                        <img src={message.imageUrl} alt="Adjunto" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    </button>
                )}
                {isTeacher && isPending && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button onClick={onApprove} className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-green-500 rounded-md hover:bg-green-600">
                            <IconCheck className="w-4 h-4"/> Aprobar
                        </button>
                        <button onClick={onReject} className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600">
                            <IconX className="w-4 h-4"/> Rechazar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


const ForumModule: React.FC<ForumModuleProps> = ({ user, course, messages, onAddMessage, onUpdateMessageStatus, onDeleteMessage }) => {
    const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');
    const { openImageViewer } = useAppContext();

    const isTeacher = user.role === 'teacher';

    const { approvedMessages, pendingMessages, userRejectedMessages } = useMemo(() => {
        const approved = messages.filter(m => m.status === 'approved').slice().reverse();
        
        if (isTeacher) {
            return {
                approvedMessages: approved,
                pendingMessages: messages.filter(m => m.status === 'pending'),
                userRejectedMessages: [], // Teachers don't need this view
            };
        }
        
        // For students
        return {
            approvedMessages: approved,
            pendingMessages: messages.filter(m => m.authorId === user.uid && m.status === 'pending'),
            userRejectedMessages: messages.filter(m => m.authorId === user.uid && m.status === 'rejected'),
        };
    }, [messages, user, isTeacher]);

    const messagesToShow = activeTab === 'approved' ? approvedMessages : pendingMessages;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
                <IconChatBubble className="w-8 h-8 text-primary"/>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Foro del Curso</h1>
                    <p className="text-md text-gray-500 dark:text-gray-400">{course.title}</p>
                </div>
            </div>
            
            {!isTeacher && (pendingMessages.length > 0 || userRejectedMessages.length > 0) && (
                <div className="mb-6 space-y-4">
                    {pendingMessages.length > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
                            <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Tus Mensajes Pendientes de Aprobación</h2>
                            <div className="space-y-3">
                                {pendingMessages.map(message => (
                                    <div key={message.id} className="flex items-start gap-3 p-3 bg-white/60 dark:bg-dark-card/60 rounded-lg text-sm">
                                        <img src={message.authorAvatarUrl} alt="Tu avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{message.text}</p>
                                            {message.imageUrl && <img src={message.imageUrl} alt="Adjunto" className="mt-2 rounded-md max-w-[100px] max-h-20" />}
                                            <div className="text-xs text-gray-400 mt-1">
                                                <span>{new Date(message.timestamp).toLocaleString()}</span> - <span className="font-semibold text-yellow-600 dark:text-yellow-400">Pendiente</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {userRejectedMessages.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-4">
                            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Tus Mensajes Rechazados</h2>
                            <p className="text-sm text-red-700 dark:text-red-300 mb-3">Estos mensajes no son visibles para la clase. Puedes eliminarlos y volver a publicarlos si lo deseas.</p>
                            <div className="space-y-3">
                                {userRejectedMessages.map(message => (
                                    <div key={message.id} className="flex items-start gap-3 p-3 bg-white/60 dark:bg-dark-card/60 rounded-lg text-sm">
                                        <img src={message.authorAvatarUrl} alt="Tu avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{message.text}</p>
                                            {message.imageUrl && <img src={message.imageUrl} alt="Adjunto" className="mt-2 rounded-md max-w-[100px] max-h-20" />}
                                            <div className="text-xs text-gray-400 mt-1">
                                                <span>{new Date(message.timestamp).toLocaleString()}</span> - <span className="font-semibold text-red-600 dark:text-red-400">Rechazado</span>
                                            </div>
                                        </div>
                                        <button onClick={() => onDeleteMessage(course.id, message)} title="Eliminar Mensaje" className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                                            <IconTrash className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isTeacher && (
                <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                         <button onClick={() => setActiveTab('approved')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'approved' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Mensajes Aprobados ({approvedMessages.length})
                        </button>
                         <button onClick={() => setActiveTab('pending')} className={`relative whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            Pendientes de Aprobación
                            {pendingMessages.length > 0 && <span className="absolute top-2 -right-3 ml-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{pendingMessages.length}</span>}
                        </button>
                    </nav>
                </div>
            )}

            <div className="space-y-4">
                {messagesToShow.length > 0 ? (
                    messagesToShow.map(message => (
                        <MessageCard
                            key={message.id}
                            message={message}
                            onImageClick={openImageViewer}
                            isTeacher={isTeacher}
                            onDelete={() => onDeleteMessage(course.id, message)}
                            onApprove={() => onUpdateMessageStatus(course.id, message.id, 'approved')}
                            onReject={() => onUpdateMessageStatus(course.id, message.id, 'rejected')}
                        />
                    ))
                ) : (
                    <div className="text-center py-10 bg-white dark:bg-dark-card rounded-lg shadow-sm">
                        <p className="text-gray-500 dark:text-gray-400">
                            {activeTab === 'pending' ? '¡Todo está al día! No hay mensajes pendientes.' : 'Aún no hay mensajes en el foro. ¡Sé el primero en publicar!'}
                        </p>
                    </div>
                )}
            </div>

            {activeTab === 'approved' && (
                <NewMessageForm user={user} courseId={course.id} onAddMessage={onAddMessage} />
            )}
        </div>
    );
};

export default ForumModule;