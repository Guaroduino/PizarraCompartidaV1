
import React, { useState, useRef } from 'react';
import type { Role, Course } from '../types';
import { IconPencil, IconFeed, IconClipboardCopy, IconLogout, IconPlus, IconArrowLeft, IconSettings, IconLink, IconCheck, IconDashboard, IconTrash, IconDownload, IconUpload, IconUserGroup } from './Icons';

interface SidebarProps {
    activeView: string;
    setActiveView: (view: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    userRole: Role | 'guest';
    courses: Course[];
    selectedCourseId: string | null;
    onSelectCourse: (courseId: string | null) => void;
    onCreateCourse: () => void;
    onLogout: () => void;
    // New props for Course Management
    onDeleteCourse?: (courseId: string) => void;
    onExportCourse?: (course: Course) => void;
    onImportCourse?: (file: File) => void;
    onCleanupGuests?: () => void; // New prop for cleaning guests
}

const Sidebar: React.FC<SidebarProps> = ({
    activeView, setActiveView, isOpen, setIsOpen, userRole,
    courses, selectedCourseId, onSelectCourse, onCreateCourse, onLogout,
    onDeleteCourse, onExportCourse, onImportCourse, onCleanupGuests
}) => {
    const isGuest = userRole === 'guest';
    const isTeacher = userRole === 'teacher';
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    const handleCopyCode = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedCourse?.accessCode) return;

        const url = `${window.location.origin}?room=${selectedCourse.accessCode}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onImportCourse) {
            onImportCourse(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const menuItems = [
        { view: 'whiteboard', label: 'Pizarra', icon: <IconPencil /> },
        { view: 'public-feed', label: 'Cartelera', icon: <IconFeed /> },
        { view: 'clipboard', label: 'Portapapeles', icon: <IconClipboardCopy /> },
    ];

    if (isTeacher) {
        menuItems.push({ view: 'content', label: 'Gestión', icon: <IconSettings /> });
    }

    return (
        <>
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${isOpen ? 'block' : 'hidden'}`}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            ></div>

            <div
                className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 text-gray-800 dark:text-white z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-col shadow-xl border-r border-gray-200 dark:border-gray-800 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                role="navigation"
            >
                {/* Header */}
                <div className="flex items-center justify-center h-20 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex-shrink-0">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                        Pizarra
                    </h1>
                </div>

                <div className="flex-1 overflow-y-auto py-4 flex flex-col">
                    <div className="px-4 space-y-4">
                        <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                            <span>Mis Salones</span>
                            {isTeacher && (
                                <div className="flex gap-1">
                                    <button
                                        onClick={handleImportClick}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors text-gray-500 hover:text-green-600"
                                        title="Importar Salón"
                                    >
                                        <IconUpload className="w-4 h-4" />
                                        <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                    </button>
                                    <button
                                        onClick={onCreateCourse}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors text-gray-500 hover:text-primary dark:hover:text-white"
                                        title="Crear Nuevo Salón"
                                    >
                                        <IconPlus className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {courses.length > 0 ? (
                                courses.map(course => {
                                    const isSelected = course.id === selectedCourseId;

                                    return (
                                        <div key={course.id} className="relative flex flex-col gap-2">
                                            <div className="relative group">
                                                <button
                                                    onClick={() => onSelectCourse(isSelected ? null : course.id)}
                                                    className={`w-full text-left px-4 py-3 rounded-xl transition-colors border shadow-sm pr-16 ${isSelected
                                                            ? 'bg-primary/5 dark:bg-primary/10 border-primary shadow-primary/20 ring-1 ring-primary'
                                                            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                                                        }`}
                                                >
                                                    <div className={`font-semibold truncate ${isSelected ? 'text-primary' : 'text-gray-800 dark:text-white'}`}>{course.title}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{course.description || 'Sin descripción'}</div>
                                                </button>

                                                {/* Actions Overlay (Always visible for Teachers) */}
                                                {isTeacher && (
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-1 rounded-lg">
                                                        {onExportCourse && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onExportCourse(course); }}
                                                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                                                title="Exportar Salón"
                                                            >
                                                                <IconDownload className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {onDeleteCourse && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onDeleteCourse(course.id); }}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                                title="Eliminar Salón"
                                                            >
                                                                <IconTrash className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expanded Course Tools (Accordion Content) */}
                                            {isSelected && (
                                                <div className="pl-4 pr-1 animate-in slide-in-from-top-2 fade-in duration-200 flex flex-col gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">

                                                    <div className="px-1 mb-1 mt-1">
                                                        <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest">Herramientas</span>
                                                    </div>

                                                    <nav className="space-y-1">
                                                        {menuItems.map(item => (
                                                            <button
                                                                key={item.view}
                                                                onClick={() => setActiveView(item.view)}
                                                                className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${activeView === item.view
                                                                        ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                                                    }`}
                                                            >
                                                                {React.cloneElement(item.icon as React.ReactElement<any>, { className: "w-4 h-4" })}
                                                                <span className="ml-3">{item.label}</span>
                                                            </button>
                                                        ))}
                                                    </nav>

                                                    {/* Course Code and Cleanup Guests */}
                                                    {course.accessCode && (
                                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 mt-2">
                                                            <div className="flex justify-between items-center text-xs mb-2">
                                                                <span className="text-gray-500 dark:text-gray-400 uppercase font-bold">Código:</span>
                                                                <span className="font-mono bg-white dark:bg-black/30 px-2 py-0.5 rounded text-gray-800 dark:text-secondary select-all border border-gray-200 dark:border-transparent">{course.accessCode}</span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => { handleCopyCode(e); }}
                                                                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${copied ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/50 dark:text-green-400 dark:border-green-800' : 'bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20'}`}
                                                            >
                                                                {copied ? <IconCheck className="w-3 h-3" /> : <IconLink className="w-3 h-3" />}
                                                                {copied ? '¡Copiado!' : 'Copiar Invitación'}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {isTeacher && onCleanupGuests && (
                                                        <button
                                                            onClick={onCleanupGuests}
                                                            className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-600 bg-white hover:bg-red-50 dark:bg-transparent dark:hover:bg-red-900/10 border border-gray-200 hover:border-red-200 dark:border-gray-700 dark:hover:border-red-800 rounded-lg transition-colors"
                                                        >
                                                            <IconUserGroup className="w-4 h-4" />
                                                            Limpiar Invitados
                                                        </button>
                                                    )}

                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                                    <p className="text-sm text-gray-500 mb-2">No tienes salones.</p>
                                    {isTeacher && (
                                        <button onClick={onCreateCourse} className="text-primary text-sm font-bold hover:underline">
                                            Crear uno ahora
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-auto px-4 py-4 border-t border-gray-200 dark:border-gray-800">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-50 text-red-500 border border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all"
                        >
                            <IconLogout className="w-5 h-5" />
                            {isGuest ? "Salir / Login" : "Cerrar Sesión"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
