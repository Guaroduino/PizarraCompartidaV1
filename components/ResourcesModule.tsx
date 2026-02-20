
import React, { useState, useRef } from 'react';
import type { ResourceLink, User } from '../types';
import { IconPlus, IconTrash, IconLink, IconX, IconPaperclip, IconPencil } from './Icons';
import { uploadFile } from '../services/storageService';

interface ResourcesModuleProps {
    resources: ResourceLink[];
    user: User;
    title: string;
    description: string;
    onAddResource: (resource: Omit<ResourceLink, 'id'>) => Promise<void>;
    onUpdateResource: (resource: ResourceLink) => Promise<void>;
    onDeleteResource: (resourceId: string) => Promise<void>;
}

const ResourcesModule: React.FC<ResourcesModuleProps> = ({ resources, user, title, description, onAddResource, onUpdateResource, onDeleteResource }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', url: '', description: '' });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [editingResource, setEditingResource] = useState<ResourceLink | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isTeacher = user.role === 'teacher';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleOpenModal = (resource?: ResourceLink) => {
        if (resource) {
            setEditingResource(resource);
            setFormData({
                title: resource.title,
                url: resource.url,
                description: resource.description || ''
            });
            setImagePreview(resource.imageUrl || null);
        } else {
            setEditingResource(null);
            setFormData({ title: '', url: '', description: '' });
            setImagePreview(null);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingResource(null);
        setFormData({ title: '', url: '', description: '' });
        setImageFile(null);
        setImagePreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.url) return;
        
        setIsSaving(true);
        try {
            let uploadedImageUrl = editingResource?.imageUrl || ''; // Keep existing image by default
            
            if (imageFile) {
                uploadedImageUrl = await uploadFile('resource-thumbnails', imageFile);
            }

            if (editingResource) {
                await onUpdateResource({
                    ...editingResource,
                    ...formData,
                    imageUrl: uploadedImageUrl || undefined
                });
            } else {
                await onAddResource({ 
                    ...formData, 
                    imageUrl: uploadedImageUrl || undefined 
                });
            }

            handleCloseModal();
        } catch (error) {
            console.error("Error saving resource:", error);
            alert("Hubo un error al guardar el recurso.");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to get a high-res favicon from Google
    const getFaviconUrl = (url: string) => {
        try {
            // Ensure url starts with http/https for URL constructor
            const validUrl = url.startsWith('http') ? url : `https://${url}`;
            const domain = new URL(validUrl).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        } catch (e) {
            return '';
        }
    };

    // Helper to generate a deterministic color from string
    const getResourceColor = (title: string) => {
        const colors = [
            'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 
            'bg-violet-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
            'bg-orange-500', 'bg-cyan-500'
        ];
        let hash = 0;
        for (let i = 0; i < title.length; i++) {
            hash = title.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                </div>
                {isTeacher && (
                    <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                        <IconPlus className="w-5 h-5" /> Añadir Recurso
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.length > 0 ? (
                    resources.map((resource) => {
                        const hasCustomImage = !!resource.imageUrl;
                        const bgColorClass = getResourceColor(resource.title);
                        
                        return (
                            <div key={resource.id} className="bg-white dark:bg-dark-card rounded-xl shadow-md flex flex-col border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow relative overflow-hidden group h-full">
                                {isTeacher && (
                                    <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleOpenModal(resource)}
                                            className="bg-white/90 dark:bg-black/70 text-gray-600 dark:text-gray-300 hover:text-blue-500 hover:bg-white rounded-full p-1.5 shadow-sm backdrop-blur-sm transition-colors"
                                            title="Editar recurso"
                                        >
                                            <IconPencil className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => onDeleteResource(resource.id)}
                                            className="bg-white/90 dark:bg-black/70 text-gray-600 dark:text-gray-300 hover:text-red-500 hover:bg-white rounded-full p-1.5 shadow-sm backdrop-blur-sm transition-colors"
                                            title="Eliminar recurso"
                                        >
                                            <IconTrash className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                
                                {/* Header (Image or Solid Color) */}
                                <div className={`h-40 w-full relative overflow-hidden flex items-center justify-center ${hasCustomImage ? 'bg-gray-100 dark:bg-gray-800' : bgColorClass}`}>
                                    {hasCustomImage ? (
                                        <img 
                                            src={resource.imageUrl} 
                                            alt={resource.title} 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        // Fallback: Solid Color + Favicon/Icon
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="bg-white p-2 rounded-xl shadow-sm mb-1">
                                                <img 
                                                    src={getFaviconUrl(resource.url)} 
                                                    alt="" 
                                                    className="w-12 h-12 object-contain"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                                {/* Fallback if favicon fails */}
                                                <IconLink className="w-12 h-12 text-gray-400 hidden" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 flex flex-col flex-grow">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1" title={resource.title}>{resource.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 flex-grow line-clamp-3">{resource.description}</p>
                                    <a 
                                        href={resource.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-auto text-center w-full py-2 px-4 bg-gray-50 dark:bg-gray-800 text-primary border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-colors font-medium"
                                    >
                                        Abrir Enlace
                                    </a>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <IconLink className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No hay recursos añadidos aún</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            {isTeacher ? 'Añade herramientas útiles o enlaces importantes para tus estudiantes.' : 'Tu profesor aún no ha compartido recursos en esta sección.'}
                        </p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{editingResource ? 'Editar Recurso' : 'Añadir Nuevo Recurso'}</h2>
                            <button onClick={handleCloseModal}><IconX className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Título</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="input-style" 
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    placeholder="Ej: Simulador de Circuitos"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">URL</label>
                                <input 
                                    type="url" 
                                    required 
                                    className="input-style" 
                                    value={formData.url}
                                    onChange={e => setFormData({...formData, url: e.target.value})}
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Descripción</label>
                                <textarea 
                                    className="input-style" 
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    placeholder="Breve descripción de la herramienta..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Imagen (Opcional)</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-20 h-20 border rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                                        {imagePreview ? (
                                            <>
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                <button 
                                                    type="button" 
                                                    onClick={removeImage}
                                                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-md hover:bg-red-600"
                                                >
                                                    <IconX className="w-3 h-3" />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                <IconLink className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden" 
                                            id="resource-image-upload"
                                        />
                                        <label 
                                            htmlFor="resource-image-upload" 
                                            className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            <IconPaperclip className="w-4 h-4" />
                                            {imagePreview ? 'Cambiar Imagen' : 'Subir Imagen'}
                                        </label>
                                        <p className="text-xs text-gray-500 mt-1">Si no subes una, se generará una tarjeta automática.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="btn-primary">
                                    {isSaving ? 'Guardando...' : (editingResource ? 'Actualizar' : 'Añadir')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
             {/* @ts-ignore */}
             <style jsx>{`
                .input-style { background-color: white; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem 0.75rem; width: 100%; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
                .dark .input-style { background-color: #1f2937; border-color: #4b5563; color: #d1d5db; }
                .input-style:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary); }
                .btn-primary { padding: 0.5rem 1rem; font-weight: 500; color: white; background-color: var(--color-primary); border-radius: 0.375rem; }
                .btn-primary:hover { background-color: var(--color-primary-dark); }
                .btn-secondary { padding: 0.5rem 1rem; font-weight: 500; color: #374151; background-color: #e5e7eb; border-radius: 0.375rem; }
                .dark .btn-secondary { color: #d1d5db; background-color: #4b5563; }
            `}</style>
        </div>
    );
};

export default ResourcesModule;
