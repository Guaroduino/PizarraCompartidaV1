
import React, { useState, useEffect, useRef } from 'react';
import type { Course, ThemePreset } from '../types';
import { IconDeviceFloppy, IconTrash, IconPalette, IconX } from './Icons';
import { ColorPickerButton } from './ColorPicker';

interface ThemeModuleProps {
    course: Course;
    globalCourse: Course; // The globally selected course for restoring theme on close
    savedThemes: ThemePreset[];
    onSaveTheme: (name: string, colors: { primary: string; secondary: string }) => Promise<void>;
    onDeleteTheme: (themeId: string) => Promise<void>;
    onActivateTheme: (courseId: string, themeId: string | null) => Promise<void>;
    onPreviewTheme: (colors: { primary: string; secondary: string } | null) => void;
    onClose: () => void;
}

const DEFAULT_COLORS = {
    primary: '#4f46e5',
    secondary: '#10b981',
};

const PreviewPanel: React.FC<{ colors: { primary: string, secondary: string } }> = ({ colors }) => {
    return (
        <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-light-bg dark:bg-dark-bg">
            <h3 className="text-xl font-bold mb-4" style={{ color: colors.primary }}>Vista Previa del Tema</h3>
            <div className="flex flex-wrap gap-4 items-center">
                <button className="px-4 py-2 font-bold text-white rounded-lg" style={{ backgroundColor: colors.primary }}>Botón Primario</button>
                <button className="px-4 py-2 font-bold text-white rounded-lg" style={{ backgroundColor: colors.secondary }}>Botón Secundario</button>
                <span className="font-semibold" style={{ color: colors.secondary }}>Texto de Énfasis</span>
            </div>
            <div className="mt-4">
                 <p className="text-gray-800 dark:text-gray-200">Así se verá un <a href="#" style={{ color: colors.primary }} onClick={e => e.preventDefault()}>enlace primario</a>.</p>
            </div>
        </div>
    );
};

const ThemeModule: React.FC<ThemeModuleProps> = (props) => {
    const { 
        course, globalCourse, savedThemes, onSaveTheme, onDeleteTheme, 
        onActivateTheme, onPreviewTheme, onClose 
    } = props;
    
    const activeTheme = savedThemes.find(t => t.id === course.activeThemeId);
    const [currentColors, setCurrentColors] = useState(activeTheme?.colors || DEFAULT_COLORS);
    const [presetName, setPresetName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const latestProps = useRef({ onPreviewTheme, globalCourse, savedThemes });
    latestProps.current = { onPreviewTheme, globalCourse, savedThemes };

    useEffect(() => {
        const activeThemeForSelectedCourse = savedThemes.find(t => t.id === course.activeThemeId);
        setCurrentColors(activeThemeForSelectedCourse?.colors || DEFAULT_COLORS);
    }, [course.id, savedThemes, course.activeThemeId]);

    useEffect(() => {
        onPreviewTheme(currentColors);
    }, [currentColors, onPreviewTheme]);

    useEffect(() => {
        return () => {
            const { onPreviewTheme: onPreview, globalCourse: gCourse, savedThemes: currentThemes } = latestProps.current;
            const activeGlobalTheme = currentThemes.find(t => t.id === gCourse.activeThemeId);
            onPreview(activeGlobalTheme?.colors || null);
        };
    }, []);

    const handleColorChange = (colorName: 'primary' | 'secondary', value: string) => {
        setCurrentColors(prev => ({ ...prev, [colorName]: value }));
    };
    
    const handleSavePreset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!presetName.trim()) {
            console.warn("Por favor, dale un nombre a tu preajuste de tema.");
            return;
        }
        setIsSaving(true);
        await onSaveTheme(presetName, currentColors);
        setPresetName('');
        setIsSaving(false);
    };

    const handleApplyPreset = (theme: ThemePreset) => {
        setCurrentColors(theme.colors);
        onActivateTheme(course.id, theme.id);
    };

    const handleDeletePreset = (themeId: string) => {
        if (course.activeThemeId === themeId) {
            onActivateTheme(course.id, null);
        }
        onDeleteTheme(themeId);
    };

    const handleResetToDefault = () => {
        setCurrentColors(DEFAULT_COLORS);
        onActivateTheme(course.id, null);
    };

    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                 <div className="flex items-center">
                    <IconPalette className="w-7 h-7 text-primary mr-3" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Personalizar Tema</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">para el curso: <span className="font-semibold">{course.title}</span></p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <IconX className="w-6 h-6" />
                </button>
            </header>
            
            <div className="flex-grow p-6 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Panel: Editor */}
                    <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-lg space-y-6 border dark:border-gray-700">
                        <h2 className="text-2xl font-semibold">Editor de Colores</h2>
                        
                        {/* Color Pickers */}
                        <div className="flex items-center justify-around py-4">
                            <div className="text-center flex flex-col items-center">
                                <label className="block font-medium mb-2 text-sm text-gray-500 uppercase">Primario</label>
                                <ColorPickerButton 
                                    color={currentColors.primary} 
                                    onChange={(c) => handleColorChange('primary', c)} 
                                    className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-500 shadow-md"
                                    position="top"
                                />
                            </div>
                            <div className="text-center flex flex-col items-center">
                                <label className="block font-medium mb-2 text-sm text-gray-500 uppercase">Secundario</label>
                                <ColorPickerButton 
                                    color={currentColors.secondary} 
                                    onChange={(c) => handleColorChange('secondary', c)} 
                                    className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-500 shadow-md"
                                    position="top"
                                />
                            </div>
                        </div>
                        
                        <PreviewPanel colors={currentColors} />

                        <button onClick={handleResetToDefault} className="w-full text-center text-sm text-gray-500 hover:text-red-500 transition-colors">
                            Restablecer tema por defecto para "{course.title}"
                        </button>
                    </div>

                    {/* Right Panel: Presets */}
                    <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-lg space-y-6 border dark:border-gray-700">
                        <h2 className="text-2xl font-semibold">Preajustes de Tema</h2>
                        
                        {/* Save Preset Form */}
                        <form onSubmit={handleSavePreset} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h3 className="font-semibold mb-2">Guardar Tema Actual</h3>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={presetName}
                                    onChange={e => setPresetName(e.target.value)}
                                    placeholder="Nombre del preajuste..." 
                                    className="input-style flex-grow"
                                />
                                <button type="submit" className="btn-primary flex-shrink-0" disabled={isSaving}>
                                    {isSaving ? '...' : <IconDeviceFloppy className="w-5 h-5"/>}
                                </button>
                            </div>
                        </form>

                        {/* Saved Presets List */}
                        <div>
                            <h3 className="font-semibold mb-2">Temas Guardados</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {savedThemes.length > 0 ? savedThemes.map(theme => (
                                    <div key={theme.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded-full" style={{backgroundColor: theme.colors.primary}}></div>
                                            <span className="font-medium">{theme.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleApplyPreset(theme)} className="text-sm font-semibold text-primary hover:underline disabled:text-gray-400" disabled={course.activeThemeId === theme.id}>
                                                {course.activeThemeId === theme.id ? 'Aplicado' : 'Aplicar'}
                                            </button>
                                            <button onClick={() => handleDeletePreset(theme.id)} className="p-1 text-red-500 hover:text-red-700" aria-label={`Eliminar ${theme.name}`}>
                                                <IconTrash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center text-sm text-gray-500 py-4">No tienes preajustes guardados.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* @ts-ignore */}
            <style jsx>{`
                .input-style { background-color: white; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem 0.75rem; width: 100%; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
                .dark .input-style { background-color: #1f2937; border-color: #4b5563; color: #d1d5db; }
                .btn-primary { padding: 0.5rem 1rem; font-weight: 500; color: white; background-color: var(--color-primary); border-radius: 0.375rem; transition: background-color .2s; }
                .btn-primary:hover { background-color: var(--color-primary-dark); }
                .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default ThemeModule;
