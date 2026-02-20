import React, { useState } from 'react';
import type { User } from '../types';
import { IconDeviceFloppy, IconUser, IconTrash, IconPaperclip, IconClipboard } from './Icons';

interface ProfileEditorModuleProps {
    user: User;
    onSave: (userId: string, profileData: Partial<User>) => Promise<void>;
    onAddDocument: (userId: string, file: File) => Promise<void>;
    onDeleteDocument: (userId: string, document: { name: string; url: string; uploadedAt: string; }) => Promise<void>;
}

const ProfileEditorModule: React.FC<ProfileEditorModuleProps> = ({ user, onSave, onAddDocument, onDeleteDocument }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'academic' | 'docs'>('info');
    const [formData, setFormData] = useState({
        tinkerCadUsername: user.tinkerCadUsername || '',
        tinkerCadPassword: user.tinkerCadPassword || '',
        birthdate: user.birthdate ? user.birthdate.split('T')[0] : '', // Format for date input
        address: user.address || '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [docFile, setDocFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const dataToSave: Partial<User> = {
            ...formData,
            birthdate: formData.birthdate ? new Date(formData.birthdate).toISOString() : '',
        };
        await onSave(user.uid, dataToSave);
        setIsSaving(false);
    };

    const handleFileUpload = async () => {
        if (!docFile) return;
        setIsUploading(true);
        await onAddDocument(user.uid, docFile);
        setDocFile(null);
        // Clear file input
        const fileInput = document.getElementById('doc-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        setIsUploading(false);
    };

    const handleDelete = async (doc: User['personalDocuments'][0]) => {
        await onDeleteDocument(user.uid, doc);
    };
    
    const TabButton: React.FC<{ tab: 'info'|'academic'|'docs'; label: string; icon: React.ReactNode }> = ({ tab, label, icon }) => (
        <button 
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 p-3 font-semibold transition-colors border-b-2 ${activeTab === tab ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:border-gray-300'}`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl overflow-hidden">
                <header className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
                     <img src={user.avatarUrl} alt={user.name} className="w-20 h-20 rounded-full object-cover"/>
                     <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mi Perfil</h1>
                        <p className="text-lg text-gray-500 dark:text-gray-400">{user.name}</p>
                    </div>
                </header>

                <div className="border-b border-gray-200 dark:border-gray-700 flex">
                    <TabButton tab="info" label="Información Personal" icon={<IconUser className="w-5 h-5"/>} />
                    <TabButton tab="academic" label="Datos Académicos" icon={<IconClipboard className="w-5 h-5"/>}/>
                    <TabButton tab="docs" label="Mis Documentos" icon={<IconPaperclip className="w-5 h-5"/>} />
                </div>
                
                <main className="p-6 space-y-6">
                    {activeTab === 'info' && (
                        <div className="space-y-4">
                            <div>
                                <label className="label-style">Fecha de Nacimiento</label>
                                <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} className="input-style"/>
                            </div>
                            <div>
                                <label className="label-style">Dirección</label>
                                <textarea name="address" value={formData.address} onChange={handleChange} className="input-style" rows={3} placeholder="Tu dirección de residencia"/>
                            </div>
                        </div>
                    )}
                     {activeTab === 'academic' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Esta información es asignada por tu profesor y no puede ser modificada.</p>
                            <div>
                                <label className="label-style">Usuario de TinkerCAD</label>
                                <input type="text" value={formData.tinkerCadUsername} className="input-style" readOnly disabled/>
                            </div>
                             <div>
                                <label className="label-style">Contraseña de TinkerCAD</label>
                                <input type="text" value={formData.tinkerCadPassword} className="input-style" readOnly disabled/>
                            </div>
                        </div>
                    )}
                     {activeTab === 'docs' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Subir Nuevo Documento</h3>
                                <div className="p-4 border-2 border-dashed rounded-lg flex items-center gap-4">
                                    <input type="file" onChange={e => setDocFile(e.target.files ? e.target.files[0] : null)} className="input-style flex-grow" id="doc-upload"/>
                                    <button onClick={handleFileUpload} disabled={!docFile || isUploading} className="btn-secondary">
                                        {isUploading ? "Subiendo..." : "Subir"}
                                    </button>
                                </div>
                            </div>
                             <div>
                                <h3 className="text-lg font-semibold mb-2">Documentos Subidos</h3>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                                    {user.personalDocuments?.length ? user.personalDocuments.map(doc => (
                                        <div key={doc.url} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{doc.name}</a>
                                            <button onClick={() => handleDelete(doc)} className="p-1 text-red-500 hover:text-red-700"><IconTrash className="w-4 h-4"/></button>
                                        </div>
                                    )) : <p className="text-sm text-center text-gray-500 italic py-4">No tienes documentos subidos.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
                
                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex justify-end">
                    <button onClick={handleSave} disabled={isSaving} className="btn-primary flex items-center gap-2">
                        <IconDeviceFloppy className="w-5 h-5"/>
                        {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </footer>
            </div>
             {/* @ts-ignore */}
             <style jsx>{`
                .input-style { display: block; width: 100%; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .input-style { background-color: #1f2937; border-color: #4b5563; color: #d1d5db; }
                .input-style:disabled { background-color: #e5e7eb; color: #6b7280; }
                .dark .input-style:disabled { background-color: #374151; color: #9ca3af; }
                .label-style { display: block; font-weight: 500; margin-bottom: 0.5rem; color: #374151; }
                .dark .label-style { color: #d1d5db; }
                .btn-primary { padding: 0.5rem 1.5rem; font-weight: 600; color: white; background-color: var(--color-primary); border-radius: 0.375rem; }
                .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; font-weight: 500; color: #374151; background-color: #e5e7eb; border-radius: 0.375rem; }
                .dark .btn-secondary { color: #d1d5db; background-color: #4b5563; }
            `}</style>
        </div>
    );
};

export default ProfileEditorModule;