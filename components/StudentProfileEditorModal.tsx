import React, { useState } from 'react';
import type { User } from '../types';
import { IconDeviceFloppy, IconId, IconTrash, IconUser, IconX, IconClipboard, IconPaperclip } from './Icons';

interface StudentProfileEditorModalProps {
    student: User;
    onClose: () => void;
    onSave: (studentId: string, profileData: Partial<User>) => Promise<void>;
    onAddDocument: (studentId: string, file: File) => Promise<void>;
    onDeleteDocument: (studentId: string, document: { name: string; url: string; uploadedAt: string; }) => Promise<void>;
}

const StudentProfileEditorModal: React.FC<StudentProfileEditorModalProps> = ({ student, onClose, onSave, onAddDocument, onDeleteDocument }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'academic' | 'docs'>('info');
    const [formData, setFormData] = useState({
        tinkerCadUsername: student.tinkerCadUsername || '',
        tinkerCadPassword: student.tinkerCadPassword || '',
        notes: student.notes || '',
        birthdate: student.birthdate ? student.birthdate.split('T')[0] : '', // Format for date input
        address: student.address || '',
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
        await onSave(student.uid, dataToSave);
        setIsSaving(false);
        onClose();
    };

    const handleFileUpload = async () => {
        if (!docFile) return;
        setIsUploading(true);
        await onAddDocument(student.uid, docFile);
        setDocFile(null);
        setIsUploading(false);
    };

    const handleDelete = async (doc: User['personalDocuments'][0]) => {
        await onDeleteDocument(student.uid, doc);
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
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                     <div className="flex items-center gap-3">
                        <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full"/>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Editando Perfil</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{student.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <IconX className="w-6 h-6" />
                    </button>
                </header>

                <div className="border-b border-gray-200 dark:border-gray-700 flex">
                    <TabButton tab="info" label="Personal" icon={<IconUser className="w-5 h-5"/>} />
                    <TabButton tab="academic" label="Académico" icon={<IconClipboard className="w-5 h-5"/>}/>
                    <TabButton tab="docs" label="Documentos" icon={<IconPaperclip className="w-5 h-5"/>} />
                </div>
                
                <main className="flex-grow p-6 overflow-y-auto space-y-4">
                    {activeTab === 'info' && (
                        <div className="space-y-4">
                            <div>
                                <label className="label-style">Fecha de Nacimiento</label>
                                <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} className="input-style"/>
                            </div>
                            <div>
                                <label className="label-style">Dirección</label>
                                <textarea name="address" value={formData.address} onChange={handleChange} className="input-style" rows={3}/>
                            </div>
                        </div>
                    )}
                     {activeTab === 'academic' && (
                        <div className="space-y-4">
                            <div>
                                <label className="label-style">Usuario de TinkerCAD</label>
                                <input type="text" name="tinkerCadUsername" value={formData.tinkerCadUsername} onChange={handleChange} className="input-style"/>
                            </div>
                             <div>
                                <label className="label-style">Contraseña de TinkerCAD</label>
                                <input type="text" name="tinkerCadPassword" value={formData.tinkerCadPassword} onChange={handleChange} className="input-style"/>
                            </div>
                            <div>
                                <label className="label-style">Notas del Profesor (Privado)</label>
                                <textarea name="notes" value={formData.notes} onChange={handleChange} className="input-style" rows={5} placeholder="Anotaciones sobre progreso, comportamiento, etc."/>
                            </div>
                        </div>
                    )}
                     {activeTab === 'docs' && (
                        <div className="space-y-4">
                            <div className="p-4 border-2 border-dashed rounded-lg flex items-center gap-4">
                                <input type="file" onChange={e => setDocFile(e.target.files ? e.target.files[0] : null)} className="input-style" id="doc-upload"/>
                                <button onClick={handleFileUpload} disabled={!docFile || isUploading} className="btn-secondary">
                                    {isUploading ? "Subiendo..." : "Subir"}
                                </button>
                            </div>
                             <div>
                                <h4 className="font-semibold mb-2">Documentos Subidos</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {student.personalDocuments?.length ? student.personalDocuments.map(doc => (
                                        <div key={doc.url} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{doc.name}</a>
                                            <button onClick={() => handleDelete(doc)} className="p-1 text-red-500 hover:text-red-700"><IconTrash className="w-4 h-4"/></button>
                                        </div>
                                    )) : <p className="text-sm text-gray-500 italic">No hay documentos.</p>}
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

export default StudentProfileEditorModal;