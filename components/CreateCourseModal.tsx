
import React, { useState, useEffect } from 'react';
import type { NewCourse } from '../types';
import { IconDeviceFloppy, IconSparkles } from './Icons';

interface CreateCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddCourse: (course: NewCourse) => Promise<void>;
}

const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ isOpen, onClose, onAddCourse }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Generate a random code when modal opens
    useEffect(() => {
        if (isOpen) {
            generateCode();
        }
    }, [isOpen]);

    const generateCode = () => {
        // Generate a random 6-character code (uppercase letters and numbers)
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setAccessCode(code);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim() || !accessCode.trim()) {
            console.warn("Por favor, rellena todos los campos.");
            return;
        }
        setIsSaving(true);
        await onAddCourse({ title, description, accessCode });
        setIsSaving(false);
        setTitle('');
        setDescription('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Crear Nueva Sala (Curso)</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Título</label>
                        <input
                            type="text"
                            id="course-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full input-style"
                            required
                            placeholder="Ej: Robótica Avanzada"
                        />
                    </div>
                    <div>
                        <label htmlFor="course-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                        <textarea
                            id="course-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full input-style"
                            required
                            placeholder="Objetivos de la sala..."
                        />
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código de Acceso para Estudiantes</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={accessCode} 
                                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                                className="flex-grow font-mono text-xl font-bold text-center tracking-widest uppercase input-style border-primary"
                                maxLength={8}
                            />
                            <button type="button" onClick={generateCode} className="p-2 text-gray-500 hover:text-primary" title="Generar nuevo código">
                                <IconSparkles className="w-6 h-6"/>
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Comparte este código o el enlace generado para que tus estudiantes se unan.</p>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={onClose} disabled={isSaving} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSaving}>
                            {isSaving ? 'Creando...' : <><IconDeviceFloppy className="w-5 h-5" /> Crear Sala</>}
                        </button>
                    </div>
                </form>
                {/* @ts-ignore */}
                <style jsx>{`
                    .input-style { background-color: white; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem 0.75rem; width: 100%; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
                    .dark .input-style { background-color: #1f2937; border-color: #4b5563; color: #d1d5db; }
                    .input-style:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary); }
                    .btn-primary { padding: 0.5rem 1rem; font-weight: 500; color: white; background-color: var(--color-primary); border-radius: 0.375rem; }
                    .btn-primary:hover { background-color: var(--color-primary-dark); }
                    .btn-primary:disabled { background-color: var(--color-primary); opacity: 0.6; cursor: not-allowed; }
                    .btn-secondary { padding: 0.5rem 1rem; font-weight: 500; color: #374151; background-color: #e5e7eb; border-radius: 0.375rem; }
                    .dark .btn-secondary { color: #d1d5db; background-color: #4b5563; }
                `}</style>
            </div>
        </div>
    );
};

export default CreateCourseModal;
