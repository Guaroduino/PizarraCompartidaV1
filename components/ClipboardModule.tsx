
import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { IconClipboardCopy, IconDeviceFloppy, IconPaperclip, IconTrash, IconX } from './Icons';
import RichTextEditor from './RichTextEditor';
import { uploadFile } from '../services/storageService';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from '../services/firebase';

interface ClipboardModuleProps {
    user: User | null;
    isGuestMode: boolean;
    courseId: string; // Added courseId
}

interface ClipboardData {
    content: string;
    imageUrls: { url: string; uploadedAt: string }[];
}

const ClipboardModule: React.FC<ClipboardModuleProps> = ({ user, isGuestMode, courseId }) => {
    const [content, setContent] = useState('');
    const [imageUrls, setImageUrls] = useState<{ url: string; uploadedAt: string }[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Assume 'teacher' role is Admin for this app
    const canEdit = user?.role === 'teacher';

    // Ref specific to the course
    const clipboardRef = doc(db, 'courses', courseId, 'clipboard', 'data');

    useEffect(() => {
        const unsubscribe = onSnapshot(clipboardRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as ClipboardData;
                setContent(data.content || '');
                setImageUrls(data.imageUrls || []);
            } else {
                setContent('');
                setImageUrls([]);
            }
        });
        return () => unsubscribe();
    }, [courseId]);

    const saveClipboardData = async (newContent: string, newImages: { url: string; uploadedAt: string }[]) => {
        await setDoc(clipboardRef, { content: newContent, imageUrls: newImages }, { merge: true });
    };

    const handleSaveContent = async () => {
        setIsSaving(true);
        await saveClipboardData(content, imageUrls);
        setIsSaving(false);
    };

    const handleImageUpload = async () => {
        if (!imageFile) return;
        setIsUploading(true);
        try {
            const url = await uploadFile(`clipboard-images/${courseId}`, imageFile);
            const newImage = { url, uploadedAt: new Date().toISOString() };
            const newImageUrls = [...imageUrls, newImage];
            setImageUrls(newImageUrls);
            await saveClipboardData(content, newImageUrls);
        } catch (error) {
            console.error("Error uploading image to clipboard:", error);
        } finally {
            setImageFile(null);
            setIsUploading(false);
        }
    };

    const handleImageDelete = async (urlToDelete: string) => {
        const newImageUrls = imageUrls.filter(img => img.url !== urlToDelete);
        setImageUrls(newImageUrls);
        await saveClipboardData(content, newImageUrls);
    };

    const handleCopyHtml = () => {
        const type = "text/html";
        const blob = new Blob([content], { type });
        const data = [new ClipboardItem({ [type]: blob })];
        navigator.clipboard.write(data).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="max-w-5xl mx-auto h-full flex flex-col p-6">
            <div className="flex items-center gap-3 mb-6">
                <IconClipboardCopy className="w-10 h-10 text-primary"/>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Portapapeles de Salón</h1>
                    <p className="text-gray-600 dark:text-dark-text">
                        Recursos rápidos para este curso.
                    </p>
                </div>
            </div>

            {canEdit ? (
                // Admin/Teacher View (Edit Mode)
                <div className="flex-1 bg-white dark:bg-dark-card p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">Editar Contenido</h2>
                        <button onClick={handleSaveContent} disabled={isSaving} className="btn-primary flex items-center gap-2">
                            <IconDeviceFloppy className="w-5 h-5" />
                            {isSaving ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>

                    <div className="flex-1 mb-6 flex flex-col min-h-[300px]">
                        <RichTextEditor 
                            value={content}
                            onChange={setContent}
                            placeholder="Escribe o pega contenido aquí..."
                        />
                    </div>

                    <div className="border-t pt-4 dark:border-gray-700">
                        <h3 className="text-md font-semibold mb-3">Imágenes Adjuntas</h3>
                        <div className="flex flex-wrap gap-4 mb-4">
                            {imageUrls.map(image => (
                                <div key={image.url} className="relative group w-24 h-24">
                                    <img src={image.url} alt="Clipboard asset" className="rounded-lg object-cover w-full h-full border dark:border-gray-600"/>
                                    <button onClick={() => handleImageDelete(image.url)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                        <IconX className="w-3 h-3"/>
                                    </button>
                                </div>
                            ))}
                            <div className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center relative hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 opacity-0 cursor-pointer" title="Subir imagen"/>
                                <IconPaperclip className="w-6 h-6 text-gray-400 mb-1"/>
                                <span className="text-[10px] text-gray-500 font-bold uppercase">{isUploading ? '...' : 'Subir'}</span>
                            </div>
                        </div>
                        {imageFile && (
                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-sm text-blue-600 dark:text-blue-300">
                                <span>Archivo seleccionado: {imageFile.name}</span>
                                <button onClick={handleImageUpload} className="font-bold hover:underline">Confirmar Subida</button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // Student/Guest View (Read Only)
                <div className="flex-1 bg-white dark:bg-dark-card p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Contenido Disponible</h2>
                        <button onClick={handleCopyHtml} className="btn-secondary flex items-center gap-2">
                            <IconClipboardCopy className="w-4 h-4"/>
                            {copied ? "¡Copiado al Portapapeles!" : "Copiar Texto"}
                        </button>
                    </div>
                    <div className="prose dark:prose-invert max-w-none p-4 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/50 flex-1 overflow-y-auto rich-text-content" dangerouslySetInnerHTML={{ __html: content || '<p class="text-gray-400 italic">El portapapeles está vacío por ahora.</p>' }}/>
                    
                    {imageUrls.length > 0 && (
                        <div className="mt-6 pt-4 border-t dark:border-gray-700">
                            <h3 className="text-sm font-bold uppercase text-gray-500 mb-3">Imágenes Disponibles</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                {imageUrls.map(image => (
                                    <a key={image.url} href={image.url} target="_blank" rel="noopener noreferrer" className="relative group block aspect-square">
                                        <img src={image.url} alt="Clipboard asset" className="rounded-lg object-cover w-full h-full border dark:border-gray-600 shadow-sm"/>
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg backdrop-blur-[1px]">
                                            <span className="text-white font-bold text-xs uppercase tracking-wider">Abrir</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
             {/* @ts-ignore */}
             <style jsx>{`
                .btn-primary { padding: 0.5rem 1rem; font-weight: 500; color: white; background-color: var(--color-primary); border-radius: 0.375rem; }
                .btn-primary:hover { background-color: var(--color-primary-dark); }
                .btn-primary:disabled { background-color: var(--color-primary); opacity: 0.6; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; font-weight: 500; color: #374151; background-color: #e5e7eb; border-radius: 0.375rem; }
                .dark .btn-secondary { color: #d1d5db; background-color: #4b5563; }
            `}</style>
        </div>
    );
};

export default ClipboardModule;
