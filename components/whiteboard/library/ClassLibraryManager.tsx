
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from '../../../services/firebase';
import type { LibraryClass, User } from '../../../types';
import { IconTrash, IconX, IconPlus, IconBriefcase, IconCheck, IconBook } from '../../Icons';

interface ClassLibraryManagerProps {
    user: User;
    onClose: () => void;
    onLoadClass: (item: LibraryClass) => void;
}

export const ClassLibraryManager: React.FC<ClassLibraryManagerProps> = ({ user, onClose, onLoadClass }) => {
    const [items, setItems] = useState<LibraryClass[]>([]);
    const [loadedId, setLoadedId] = useState<string | null>(null);

    // Sync Library Classes
    useEffect(() => {
        const q = query(collection(db, 'libraryClasses'), where('teacherId', '==', user.uid), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, snap => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as LibraryClass)));
        });
        return () => unsub();
    }, [user.uid]);

    const handleDeleteItem = async (id: string) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar esta clase guardada?")) return;
        await deleteDoc(doc(db, 'libraryClasses', id));
    };

    const handleLoadItem = (item: LibraryClass) => {
        if (window.confirm(`¿Quieres crear una nueva pizarra basada en "${item.name}"?`)) {
            onLoadClass(item);
            setLoadedId(item.id);
            setTimeout(() => {
                setLoadedId(null);
                onClose();
            }, 1000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <IconBook className="w-6 h-6"/>
                        </div>
                        <div>
                            <h2 className="font-bold text-xl text-gray-800 dark:text-white">Librería de Clases</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Tus plantillas de pizarra completas</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <IconX className="w-6 h-6"/>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-gray-900">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                            <IconBriefcase className="w-16 h-16 opacity-50"/>
                            <p className="text-lg font-medium">No tienes clases guardadas.</p>
                            <p className="text-sm max-w-xs text-center">Usa el botón de "Guardar en Librería" en la barra de herramientas principal para guardar tu pizarra actual como una plantilla.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items.map(item => (
                                <div key={item.id} className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all flex flex-col group overflow-hidden">
                                    {/* Preview Header */}
                                    <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center relative">
                                        <IconBook className="w-12 h-12 text-blue-200 dark:text-gray-600"/>
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/5 transition-colors"/>
                                    </div>
                                    
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-1">{item.name}</h3>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} 
                                                className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Eliminar clase"
                                            >
                                                <IconTrash className="w-4 h-4"/>
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                                            <span>Guardado: {new Date(item.timestamp).toLocaleDateString()}</span>
                                        </p>
                                        
                                        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <button 
                                                onClick={() => handleLoadItem(item)}
                                                className={`w-full py-2 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${loadedId === item.id ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-dark'}`}
                                            >
                                                {loadedId === item.id ? <><IconCheck className="w-4 h-4"/> Cargada</> : <><IconPlus className="w-4 h-4"/> Crear Pizarra</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
