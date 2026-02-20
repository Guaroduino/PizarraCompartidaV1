
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, addDoc, writeBatch } from "firebase/firestore";
import { db } from '../../../services/firebase';
import type { LibraryItem, LibraryFolder, User } from '../../../types';
import { IconFolder, IconTrash, IconStar, IconImage, IconGroup, IconX, IconPlus, IconUpload, IconCheck } from '../../Icons';
import { uploadFile } from '../../../services/storageService';

interface LibraryManagerProps {
    user: User;
    onClose: () => void;
    onAddToCanvas: (item: LibraryItem) => void;
}

export const LibraryManager: React.FC<LibraryManagerProps> = ({ user, onClose, onAddToCanvas }) => {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [folders, setFolders] = useState<LibraryFolder[]>([]);
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // null = root
    const [newFolderName, setNewFolderName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [addedId, setAddedId] = useState<string | null>(null);

    // Sync Folders
    useEffect(() => {
        const q = query(collection(db, 'libraryFolders'), where('teacherId', '==', user.uid));
        const unsub = onSnapshot(q, snap => {
            setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() } as LibraryFolder)));
        });
        return () => unsub();
    }, [user.uid]);

    // Sync Items
    useEffect(() => {
        const q = query(collection(db, 'libraryItems'), where('teacherId', '==', user.uid));
        const unsub = onSnapshot(q, snap => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as LibraryItem)));
        });
        return () => unsub();
    }, [user.uid]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        await addDoc(collection(db, 'libraryFolders'), {
            teacherId: user.uid,
            name: newFolderName.trim()
        });
        setNewFolderName('');
    };

    const handleDeleteFolder = async (id: string) => {
        if (!window.confirm("Se borrará la carpeta. Los ítems irán a la raíz.")) return;
        // Move items to root
        const folderItems = items.filter(i => i.folderId === id);
        for (const item of folderItems) {
            await updateDoc(doc(db, 'libraryItems', item.id), { folderId: null });
        }
        await deleteDoc(doc(db, 'libraryFolders', id));
        if (activeFolderId === id) setActiveFolderId(null);
    };

    const handleDeleteItem = async (id: string) => {
        if (!window.confirm("¿Eliminar ítem?")) return;
        await deleteDoc(doc(db, 'libraryItems', id));
    };

    const handleToggleQuick = async (item: LibraryItem) => {
        await updateDoc(doc(db, 'libraryItems', item.id), { isQuick: !item.isQuick });
    };

    const handleBatchFolderQuickToggle = async () => {
        if (!activeFolderId) return;
        
        // Get items in current folder
        const folderItems = items.filter(i => i.folderId === activeFolderId);
        if (folderItems.length === 0) return;

        // Check if ALL are quick (to determine if we turn on or off)
        const allAreQuick = folderItems.every(i => i.isQuick);
        const targetState = !allAreQuick;

        try {
            const batch = writeBatch(db);
            let updateCount = 0;

            folderItems.forEach(item => {
                if (item.isQuick !== targetState) {
                    batch.update(doc(db, 'libraryItems', item.id), { isQuick: targetState });
                    updateCount++;
                }
            });

            if (updateCount > 0) {
                await batch.commit();
            }
        } catch (e) {
            console.error("Error updating folder quick status", e);
            alert("Error al actualizar la carpeta.");
        }
    };

    const handleAddItem = (item: LibraryItem) => {
        onAddToCanvas(item);
        setAddedId(item.id);
        setTimeout(() => setAddedId(null), 1000);
    };

    const handleImageImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setIsUploading(true);
        const file = e.target.files[0];
        try {
            const url = await uploadFile(`library/${user.uid}`, file);
            
            // Create image item data (normalized size 200x200 default)
            const imgData = {
                strokes: [],
                texts: [],
                images: [{
                    id: `lib_img_${Date.now()}`,
                    url: url,
                    x: 0, y: 0, width: 200, height: 200, rotation: 0,
                    opacity: 1, deleted: false
                }]
            };

            await addDoc(collection(db, 'libraryItems'), {
                teacherId: user.uid,
                type: 'image',
                name: file.name,
                thumbnailUrl: url,
                data: imgData,
                isQuick: false,
                folderId: activeFolderId,
                timestamp: Date.now()
            });
        } catch(e) {
            console.error(e);
            alert("Error importando imagen");
        } finally {
            setIsUploading(false);
        }
    };

    const filteredItems = items.filter(i => (activeFolderId ? i.folderId === activeFolderId : !i.folderId));
    
    // Check state for the folder toggle button
    const isFolderActive = !!activeFolderId;
    const folderItems = isFolderActive ? items.filter(i => i.folderId === activeFolderId) : [];
    const isFolderFullyQuick = folderItems.length > 0 && folderItems.every(i => i.isQuick);

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-dark-card w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex overflow-hidden border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                
                {/* Sidebar (Folders) */}
                <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="font-bold text-lg text-gray-800 dark:text-white">Librería</h2>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        <button 
                            onClick={() => setActiveFolderId(null)}
                            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${activeFolderId === null ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            <IconFolder className="w-4 h-4"/> Todo (Raíz)
                        </button>
                        {folders.map(f => (
                            <div key={f.id} className="group flex items-center">
                                <button 
                                    onClick={() => setActiveFolderId(f.id)}
                                    className={`flex-1 text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${activeFolderId === f.id ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                >
                                    <IconFolder className="w-4 h-4 opacity-70"/> {f.name}
                                </button>
                                <button onClick={() => handleDeleteFolder(f.id)} className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <IconTrash className="w-3 h-3"/>
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex gap-1">
                            <input 
                                type="text" 
                                value={newFolderName} 
                                onChange={e => setNewFolderName(e.target.value)}
                                placeholder="Nueva Carpeta"
                                className="flex-1 min-w-0 px-2 py-1 text-sm bg-white dark:bg-gray-900 border rounded border-gray-300 dark:border-gray-600 focus:outline-none focus:border-primary"
                            />
                            <button onClick={handleCreateFolder} className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-primary hover:text-white transition-colors">
                                <IconPlus className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-white dark:bg-dark-card">
                    <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-4">
                            <div>
                                <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    {activeFolderId ? folders.find(f => f.id === activeFolderId)?.name : 'Raíz'}
                                </h3>
                                <p className="text-xs text-gray-500">{filteredItems.length} elementos</p>
                            </div>
                            
                            {isFolderActive && folderItems.length > 0 && (
                                <button 
                                    onClick={handleBatchFolderQuickToggle}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isFolderFullyQuick ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                    title={isFolderFullyQuick ? "Quitar carpeta de barra rápida" : "Añadir toda la carpeta a barra rápida"}
                                >
                                    <IconStar className={`w-3 h-3 ${isFolderFullyQuick ? 'fill-current' : ''}`}/>
                                    {isFolderFullyQuick ? 'En Barra Rápida' : 'Añadir a Barra'}
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary transition-colors shadow-sm">
                                <IconUpload className="w-4 h-4 text-primary"/>
                                <span className="text-sm font-medium">Importar Imagen</span>
                                <input type="file" accept="image/*" onChange={handleImageImport} disabled={isUploading} className="hidden" />
                            </label>
                            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                                <IconX className="w-5 h-5"/>
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredItems.map(item => (
                                <div key={item.id} className="group relative bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all overflow-hidden flex flex-col">
                                    <div className="aspect-square bg-white/50 dark:bg-black/20 p-2 flex items-center justify-center relative">
                                        {/* Thumbnail or Fallback Icon */}
                                        {item.thumbnailUrl ? (
                                            <img src={item.thumbnailUrl} alt={item.name} className="max-w-full max-h-full object-contain pointer-events-none"/>
                                        ) : (
                                            <div className="text-gray-300">
                                                {item.type === 'group' ? <IconGroup className="w-12 h-12"/> : <IconImage className="w-12 h-12"/>}
                                            </div>
                                        )}
                                        
                                        {/* Add to Canvas Overlay (On Hover) */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                            <button 
                                                onClick={() => handleAddItem(item)}
                                                className={`p-3 rounded-full transform transition-transform hover:scale-110 shadow-xl ${addedId === item.id ? 'bg-green-500 text-white' : 'bg-white text-primary'}`}
                                                title="Añadir a la pizarra"
                                            >
                                                {addedId === item.id ? <IconCheck className="w-6 h-6"/> : <IconPlus className="w-6 h-6"/>}
                                            </button>
                                        </div>

                                        {/* Quick Toggle Overlay */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleToggleQuick(item); }}
                                            className={`absolute top-2 right-2 p-1.5 rounded-full shadow-sm transition-colors z-10 ${item.isQuick ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-400 hover:bg-yellow-100 hover:text-yellow-400'}`}
                                            title="Mostrar en barra rápida"
                                        >
                                            <IconStar className="w-4 h-4 fill-current"/>
                                        </button>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-dark-card flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
                                        <span className="text-sm font-medium truncate flex-1 pr-2" title={item.name}>{item.name}</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                                            <IconTrash className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredItems.length === 0 && (
                                <div className="col-span-full py-12 text-center text-gray-400 italic border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                    Carpeta vacía. Guarda selecciones de la pizarra aquí.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
