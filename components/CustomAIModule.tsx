import React, { useState, useEffect } from 'react';
// FIX: Replaced non-existent IconBeaker with IconSparkles.
import { IconSettings, IconSparkles } from './Icons';
import type { Course } from '../types';

interface CustomAIModuleProps {
    studentBaseContext: string;
    studentAdditionalContext: string;
    teacherBaseContext: string;
    teacherAdditionalContext: string;
    onSave: (settings: {
        studentAdditionalContext?: string;
        teacherAdditionalContext?: string;
    }) => Promise<void>;
    allCourses: Course[];
    onTestStudentAssistant: (context: string) => void;
}

const CustomAIModule: React.FC<CustomAIModuleProps> = ({ 
    studentBaseContext,
    studentAdditionalContext,
    teacherBaseContext,
    teacherAdditionalContext,
    onSave,
    allCourses,
    onTestStudentAssistant
}) => {
    const [studentAdditionalInput, setStudentAdditionalInput] = useState(studentAdditionalContext);
    const [teacherAdditionalInput, setTeacherAdditionalInput] = useState(teacherAdditionalContext);
    
    const [isStudentSaving, setIsStudentSaving] = useState(false);
    const [isTeacherSaving, setIsTeacherSaving] = useState(false);
    const [isStudentSaved, setIsStudentSaved] = useState(false);
    const [isTeacherSaved, setIsTeacherSaved] = useState(false);

    useEffect(() => {
        setStudentAdditionalInput(studentAdditionalContext);
    }, [studentAdditionalContext]);

    useEffect(() => {
        setTeacherAdditionalInput(teacherAdditionalContext);
    }, [teacherAdditionalContext]);

    const handleStudentSave = async () => {
        setIsStudentSaving(true);
        await onSave({
            studentAdditionalContext: studentAdditionalInput,
        });
        setIsStudentSaving(false);
        setIsStudentSaved(true);
        setTimeout(() => setIsStudentSaved(false), 2500);
    };

    const handleTeacherSave = async () => {
        setIsTeacherSaving(true);
        await onSave({
            teacherAdditionalContext: teacherAdditionalInput,
        });
        setIsTeacherSaving(false);
        setIsTeacherSaved(true);
        setTimeout(() => setIsTeacherSaved(false), 2500);
    };
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center">
                <IconSettings className="w-8 h-8 text-primary mr-3" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Personalizar Asistentes de IA</h1>
            </div>

            {/* Student Assistant Customization */}
            <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-lg">
                 <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Asistente para Estudiantes</h2>
                <p className="mb-4 text-gray-600 dark:text-dark-text">
                    Aquí puedes modificar las directrices completas del asistente que interactúa con los estudiantes.
                </p>

                <div className="mb-4">
                    <label htmlFor="student-base-context" className="block text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Instrucciones Base (Referencia)
                    </label>
                    <textarea
                        id="student-base-context"
                        rows={10}
                        value={studentBaseContext}
                        readOnly
                        className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="student-additional-context" className="block text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Instrucciones Adicionales (Editables)
                    </label>
                    <textarea
                        id="student-additional-context"
                        rows={4}
                        value={studentAdditionalInput}
                        onChange={(e) => setStudentAdditionalInput(e.target.value)}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ej: Recuerda a los estudiantes que deben citar sus fuentes. Sé más conciso en tus respuestas."
                    />
                </div>
                
                <div className="flex items-center justify-end gap-4">
                     {isStudentSaved && <p className="text-green-500 text-sm font-medium transition-opacity duration-500">¡Cambios guardados con éxito!</p>}
                     <button 
                        onClick={() => onTestStudentAssistant(studentAdditionalInput)}
                        className="px-6 py-2 font-bold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors flex items-center gap-2"
                        disabled={allCourses.length === 0}
                        title={allCourses.length === 0 ? "Debes crear al menos un curso para probar el asistente" : "Probar el asistente con la configuración actual"}
                    >
                        {/* FIX: Replaced non-existent IconBeaker with IconSparkles. */}
                        <IconSparkles className="w-5 h-5" />
                        Probar Asistente
                    </button>
                    <button 
                        onClick={handleStudentSave}
                        disabled={isStudentSaving}
                        className="px-6 py-2 font-bold text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
                    >
                        {isStudentSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>

            {/* Teacher Assistant Customization */}
            <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-lg">
                 <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Asistente de Creación de Contenido</h2>
                <p className="mb-4 text-gray-600 dark:text-dark-text">
                   Modifica las directrices de tu asistente personal para refinar el tono, formato y estilo del contenido que genera.
                </p>

                <div className="mb-4">
                    <label htmlFor="teacher-base-context" className="block text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Instrucciones Base (Referencia)
                    </label>
                     <textarea
                        id="teacher-base-context"
                        rows={10}
                        value={teacherBaseContext}
                        readOnly
                        className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="teacher-additional-context" className="block text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                        Instrucciones Adicionales (Editables)
                    </label>
                    <textarea
                        id="teacher-additional-context"
                        rows={4}
                        value={teacherAdditionalInput}
                        onChange={(e) => setTeacherAdditionalInput(e.target.value)}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                        placeholder="Ej: Genera todo el contenido en formato Markdown. Crea siempre tres opciones diferentes para cada solicitud."
                    />
                </div>
                
                <div className="flex items-center justify-end gap-4">
                     {isTeacherSaved && <p className="text-green-500 text-sm font-medium transition-opacity duration-500">¡Cambios guardados con éxito!</p>}
                    <button 
                        onClick={handleTeacherSave}
                        disabled={isTeacherSaving}
                        className="px-6 py-2 font-bold text-white bg-secondary rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-colors disabled:opacity-50"
                    >
                        {isTeacherSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomAIModule;