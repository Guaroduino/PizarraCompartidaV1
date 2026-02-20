import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { ContentUnit, User, Topic, Subtitle, Course, ThemePreset, Attachment } from '../types';
import { IconBook, IconPlus, IconTrash, IconPencil, IconDeviceFloppy, IconChevronRight, IconChevronDown, IconPalette, IconChevronUp, IconAlignLeft, IconAlignCenter, IconAlignRight, IconX, IconPaperclip, IconClock, IconCheck } from './Icons';
import { uploadFile } from '../services/storageService';
import ContentUnitDetail from './ContentUnitDetail';
import ThemeModule from './ThemeModule';
import RichTextEditor from './RichTextEditor';


// --- EDITOR COMPONENT (replaces modal) ---

interface ContentEditorProps {
    initialUnit: ContentUnit | Omit<ContentUnit, 'id'>;
    onSave: (unit: ContentUnit | Omit<ContentUnit, 'id'>, closeModal: boolean) => Promise<void>;
    onCancel: () => void;
    courseTitle: string;
}

const ContentEditor: React.FC<ContentEditorProps> = ({ initialUnit, onSave, onCancel, courseTitle }) => {
    const [unit, setUnit] = useState(initialUnit);
    const [isSaving, setIsSaving] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [imageFileMap, setImageFileMap] = useState<Map<string, File>>(new Map());
    const [textFileMap, setTextFileMap] = useState<Map<string, File[]>>(new Map());

    const isNewUnit = !('id' in unit);
    const FILE_EXTENSIONS = ".txt,.js,.jsx,.ts,.tsx,.html,.css,.json,.py,.java,.c,.cpp,.h,.hpp,.cs,.swift,.kt,.go,.rb,.php,.sql,.md";

    // Auto-save effect
    useEffect(() => {
        if (isNewUnit) return; // Only auto-save for existing items

        const handler = setTimeout(() => {
            setAutoSaveStatus('saving');
            // Auto-save always saves as a draft and does not close the modal
            handleSubmit(null, 'draft', false).then(() => {
                setAutoSaveStatus('saved');
                setTimeout(() => setAutoSaveStatus('idle'), 2000);
            });
        }, 15000); // 15-second delay

        return () => clearTimeout(handler);
    }, [unit, isNewUnit]);


    const handleUnitChange = (field: keyof Omit<ContentUnit, 'id'|'topics'>, value: string) => {
        setUnit({ ...unit, [field]: value });
    };

    const handleTopicChange = (topicIndex: number, field: keyof Omit<Topic, 'id'|'subtitles'>, value: string) => {
        const newTopics = [...(unit.topics || [])];
        (newTopics[topicIndex] as any)[field] = value;
        setUnit({ ...unit, topics: newTopics });
    };

    const handleSubtitleChange = (topicIndex: number, subIndex: number, field: keyof Omit<Subtitle, 'id'|'imageUrl'|'attachments'>, value: string) => {
        const newTopics = [...(unit.topics || [])];
        (newTopics[topicIndex].subtitles[subIndex] as any)[field] = value;
        setUnit({ ...unit, topics: newTopics });
    };
    
    const handleImageFileChange = (topicIndex: number, subIndex: number, file: File | null) => {
        if (!file) return;
        const fileKey = `${topicIndex}-${subIndex}`;
        const newFileMap = new Map(imageFileMap);
        newFileMap.set(fileKey, file);
        setImageFileMap(newFileMap);

        const newTopics = [...(unit.topics || [])];
        (newTopics[topicIndex].subtitles[subIndex] as any).imageUrl = URL.createObjectURL(file); // For preview
        setUnit({ ...unit, topics: newTopics });
    };

    const handleTextFileChange = (topicIndex: number, subIndex: number, files: FileList | null) => {
        if (!files || files.length === 0) return;
        const key = `${topicIndex}-${subIndex}`;
        const newMap = new Map(textFileMap);
        const existingFiles = newMap.get(key) || [];
        // FIX: Ensure 'existingFiles' is treated as an array to prevent iterator errors if it's not one.
        newMap.set(key, [...(Array.isArray(existingFiles) ? existingFiles : []), ...Array.from(files)]);
        setTextFileMap(newMap);
    };

    const removeTextFile = (topicIndex: number, subIndex: number, fileToRemove: File | Attachment) => {
        if ('url' in fileToRemove) { // It's an existing attachment
            const newTopics = [...(unit.topics || [])];
            const attachments = newTopics[topicIndex].subtitles[subIndex].attachments || [];
            newTopics[topicIndex].subtitles[subIndex].attachments = attachments.filter(f => f.url !== fileToRemove.url);
            setUnit({ ...unit, topics: newTopics });
        } else { // It's a new file
            const key = `${topicIndex}-${subIndex}`;
            const newMap = new Map(textFileMap);
            // FIX: Cast the result to File[] to prevent 'filter does not exist on type unknown' error
            const files = (newMap.get(key) || []) as File[];
            newMap.set(key, files.filter(f => f !== fileToRemove));
            setTextFileMap(newMap);
        }
    };


    const addTopic = () => {
        const newTopics = [...(unit.topics || []), { title: '', subtitles: [] } as Topic];
        setUnit({ ...unit, topics: newTopics });
    };
    const removeTopic = (index: number) => {
        // FIX: Added a robust Array.isArray check to prevent runtime errors if unit.topics is not an array (e.g., when state is derived from JSON.parse).
        const newTopics = (Array.isArray(unit.topics) ? unit.topics : []).filter((_, i) => i !== index);
        setUnit({ ...unit, topics: newTopics });
    };

    const addSubtitle = (topicIndex: number) => {
        const newTopics = [...(unit.topics || [])];
        newTopics[topicIndex].subtitles.push({ title: '', description: '', imageUrl: '' } as Subtitle);
        setUnit({ ...unit, topics: newTopics });
    };
    
    const removeSubtitle = (topicIndex: number, subIndex: number) => {
        const newTopics = [...(unit.topics || [])];
        newTopics[topicIndex].subtitles = newTopics[topicIndex].subtitles.filter((_, i) => i !== subIndex);
        setUnit({ ...unit, topics: newTopics });
    };

    const handleSubmit = async (e: React.FormEvent | null, status: 'published' | 'draft', closeModal: boolean = true) => {
        e?.preventDefault();
        
        if (status === 'published') {
            if (!unit.title.trim()) {
                alert("Por favor, introduce un título para la unidad antes de publicar.");
                return;
            }
            const hasEmptyTopic = (unit.topics || []).some(t => !t.title.trim());
            const hasEmptySubtitle = (unit.topics || []).some(t => t.subtitles.some(s => !s.title.trim()));
            if (hasEmptyTopic || hasEmptySubtitle) {
                alert("Por favor, asegúrate de que todos los temas y subtítulos tengan un título antes de publicar.");
                return;
            }
        }

        setIsSaving(true);
        try {
            const finalUnit = JSON.parse(JSON.stringify(unit));
            finalUnit.status = status; // Set the status
            const uploadPromises: Promise<any>[] = [];
            
            // Image uploads
            imageFileMap.forEach((file, key) => {
                const [topicIndex, subIndex] = key.split('-').map(Number);
                const promise = uploadFile('content-images', file).then(url => {
                    finalUnit.topics[topicIndex].subtitles[subIndex].imageUrl = url;
                });
                uploadPromises.push(promise);
            });

            // Text file uploads
            textFileMap.forEach((files, key) => {
                const [topicIndex, subIndex] = key.split('-').map(Number);
                files.forEach(file => {
                    const promise = uploadFile('content-attachments', file).then(url => {
                        const attachment = { name: file.name, url };
                        if (!finalUnit.topics[topicIndex].subtitles[subIndex].attachments) {
                            finalUnit.topics[topicIndex].subtitles[subIndex].attachments = [];
                        }
                        finalUnit.topics[topicIndex].subtitles[subIndex].attachments.push(attachment);
                    });
                    uploadPromises.push(promise);
                });
            });

            await Promise.all(uploadPromises);

            // Ensure all topics and subtitles have IDs, whether creating or updating
            finalUnit.topics = (finalUnit.topics || []).map((topic: Topic, tIndex: number) => ({
                ...topic,
                id: topic.id || `topic_${Date.now()}_${tIndex}`,
                subtitles: topic.subtitles.map((sub: Subtitle, sIndex: number) => ({
                    ...sub,
                    id: sub.id || `sub_${Date.now()}_${tIndex}_${sIndex}`,
                }))
            }));
            
            await onSave(finalUnit, closeModal);
        } catch (error) {
            console.error("Error al guardar la unidad de contenido:", error);
            console.error("Ocurrió un error al guardar. Por favor, revisa la consola para más detalles.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-lg">
            <form>
                <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {isNewUnit ? 'Crear Nueva Unidad' : 'Editando Unidad'}
                        </h1>
                        <p className="text-md text-gray-500 dark:text-gray-400">en {courseTitle}</p>
                    </div>
                    <div className="flex items-center gap-4">
                         <div className="text-sm text-gray-500 italic flex items-center gap-2">
                            {autoSaveStatus === 'saving' && <> <IconClock className="w-4 h-4 animate-spin" /> Guardando...</>}
                            {autoSaveStatus === 'saved' && <> <IconCheck className="w-4 h-4 text-green-500" /> Borrador guardado</>}
                        </div>
                        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
                        <button type="button" onClick={(e) => handleSubmit(e, 'draft')} className="btn-secondary flex items-center gap-2" disabled={isSaving}>
                            <IconDeviceFloppy className="w-5 h-5" /> Guardar como Borrador
                        </button>
                        <button type="button" onClick={(e) => handleSubmit(e, 'published')} className="btn-primary flex items-center gap-2" disabled={isSaving}>
                            {isSaving ? 'Publicando...' : 'Publicar'}
                        </button>
                    </div>
                </div>

                <div className="space-y-8">
                    <div>
                        <label htmlFor="unit-title" className="block text-lg font-semibold text-gray-700 dark:text-gray-300">Título de la Unidad</label>
                        <input type="text" id="unit-title" value={unit.title} onChange={e => handleUnitChange('title', e.target.value)} className="mt-2 block w-full input-style" required />
                    </div>
                    
                    <div>
                        <label htmlFor="unit-forGuardian" className="block text-sm font-medium text-gray-500 dark:text-gray-400">Resumen para el representante (Unidad)</label>
                        <textarea id="unit-forGuardian" value={unit.forGuardian || ''} onChange={e => handleUnitChange('forGuardian', e.target.value)} className="mt-1 block w-full input-style text-sm" rows={2} placeholder="Explica brevemente de qué trata esta unidad para los padres..."/>
                    </div>


                    <div className="space-y-4">
                        <h3 className="text-2xl font-semibold">Temas</h3>
                        {(unit.topics || []).map((topic, topicIndex) => (
                            <div key={topic.id || topicIndex} className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-4">
                                <div className="flex items-center gap-4">
                                    <input type="text" placeholder={`Título del Tema ${topicIndex + 1}`} value={topic.title} onChange={e => handleTopicChange(topicIndex, 'title', e.target.value)} className="flex-grow input-style font-semibold" required />
                                    <button type="button" onClick={() => removeTopic(topicIndex)} className="text-red-500 hover:text-red-700"><IconTrash className="w-5 h-5" /></button>
                                </div>
                                <textarea placeholder="Resumen para el representante (Tema)..." value={topic.forGuardian || ''} onChange={e => handleTopicChange(topicIndex, 'forGuardian', e.target.value)} className="w-full input-style text-sm" rows={2} />
                                
                                <div className="pl-4 border-l-2 border-primary space-y-3">
                                    <h4 className="font-semibold text-md">Subtítulos</h4>
                                    {topic.subtitles.map((sub, subIndex) => {
                                        const fileKey = `${topicIndex}-${subIndex}`;
                                        const newFiles = textFileMap.get(fileKey) || [];
                                        const allAttachments = [...(sub.attachments || []), ...newFiles];

                                        return (
                                        <div key={sub.id || subIndex} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md space-y-3">
                                            <div className="flex items-center gap-2">
                                                 <input type="text" placeholder="Título del subtítulo" value={sub.title} onChange={e => handleSubtitleChange(topicIndex, subIndex, 'title', e.target.value)} className="w-full input-style text-sm" required />
                                                 <button type="button" onClick={() => removeSubtitle(topicIndex, subIndex)} className="text-red-500 hover:text-red-700 p-1"><IconTrash className="w-4 h-4" /></button>
                                            </div>
                                            <RichTextEditor
                                                placeholder="Descripción del subtítulo..."
                                                value={sub.description}
                                                onChange={html => handleSubtitleChange(topicIndex, subIndex, 'description', html)}
                                            />
                                            <textarea placeholder="Resumen para el representante (Subtítulo)..." value={sub.forGuardian || ''} onChange={e => handleSubtitleChange(topicIndex, subIndex, 'forGuardian', e.target.value)} className="w-full input-style text-xs" rows={2} />
                                            <div className='grid grid-cols-2 gap-4'>
                                                <div>
                                                    <label htmlFor={`file-${topicIndex}-${subIndex}`} className="text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:text-primary">
                                                        Imagen principal
                                                    </label>
                                                    <input type="file" accept="image/*" id={`file-${topicIndex}-${subIndex}`} onChange={e => handleImageFileChange(topicIndex, subIndex, e.target.files ? e.target.files[0] : null)} className="hidden" />
                                                    {sub.imageUrl && <img src={sub.imageUrl} alt="preview" className="mt-2 rounded-md max-h-32"/>}
                                                </div>
                                                <div>
                                                     <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Archivos adjuntos</label>
                                                    <input type="file" multiple accept={FILE_EXTENSIONS} id={`txt-file-${topicIndex}-${subIndex}`} onChange={(e) => handleTextFileChange(topicIndex, subIndex, e.target.files)} className="text-xs"/>
                                                    {allAttachments.length > 0 && (
                                                        <div className="mt-2 space-y-1 text-xs">
                                                            {allAttachments.map((file, i) => (
                                                                <div key={i} className="flex items-center justify-between bg-gray-200 dark:bg-gray-700 p-1 rounded">
                                                                    <span className="truncate">{file.name}</span>
                                                                    <button type="button" onClick={() => removeTextFile(topicIndex, subIndex, file)} className="text-red-500 hover:text-red-700 ml-2"><IconX className="w-3 h-3" /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                    <button type="button" onClick={() => addSubtitle(topicIndex)} className="text-sm text-primary hover:underline font-medium">+ Agregar Subtítulo</button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addTopic} className="font-medium text-white bg-secondary px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2"><IconPlus className="w-5 h-5"/> Agregar Tema</button>
                    </div>
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
    );
};

// --- MAIN MODULE COMPONENT ---

interface ContentModuleProps {
    user: User;
    course: Course; // This is now the globally selected, non-nullable course for this view
    allUsers: User[];
    onCreateCourse: () => void;
    onAddUnit: (unit: Omit<ContentUnit, 'id'>, courseId: string) => void;
    onUpdateUnit: (unit: ContentUnit, courseId: string) => void;
    onDeleteUnit: (unitId: string, courseId: string) => void;
    onDeleteCourse: (courseId: string) => void;
    savedThemes: ThemePreset[];
    onSaveTheme: (name: string, colors: { primary: string; secondary: string }) => Promise<void>;
    onDeleteTheme: (themeId: string) => Promise<void>;
    onActivateTheme: (courseId: string, themeId: string | null) => Promise<void>;
    onPreviewTheme: (colors: { primary: string; secondary: string } | null) => void;
    onReorderUnit: (courseId: string, unitIndex: number, direction: 'up' | 'down') => void;
}

const ContentModule: React.FC<ContentModuleProps> = (props) => {
    const { 
        user, course, allUsers, onCreateCourse, onAddUnit, onUpdateUnit, 
        onDeleteUnit, onDeleteCourse, savedThemes, onSaveTheme, onDeleteTheme, 
        onActivateTheme, onPreviewTheme, onReorderUnit 
    } = props;

    const [editingUnit, setEditingUnit] = useState<{ unit: ContentUnit | Omit<ContentUnit, 'id'>, courseId: string } | null>(null);
    const [viewingUnitDetail, setViewingUnitDetail] = useState<ContentUnit | null>(null);
    const [themeModalCourse, setThemeModalCourse] = useState<Course | null>(null);

    const handleStartAddUnit = (courseId: string) => {
        setEditingUnit({ unit: { title: '', topics: [], status: 'draft' }, courseId });
    };

    const handleEdit = (unit: ContentUnit, courseId: string) => {
        setEditingUnit({ unit: JSON.parse(JSON.stringify(unit)), courseId });
    };

    const handleCancelEdit = () => {
        setEditingUnit(null);
    };

    const handleSave = async (unitToSave: ContentUnit | Omit<ContentUnit, 'id'>, closeModal: boolean) => {
        if (!editingUnit) return;
        
        if ('id' in unitToSave) {
            await onUpdateUnit(unitToSave as ContentUnit, editingUnit.courseId);
        } else {
            await onAddUnit(unitToSave, editingUnit.courseId);
        }
        if (closeModal) {
            setEditingUnit(null);
        }
    };

    const handleDeleteUnit = (unitId: string, courseId: string) => {
        onDeleteUnit(unitId, courseId);
    };
    
    const handleDeleteCourseClick = (courseId: string, courseTitle: string) => {
        onDeleteCourse(courseId);
    };

    if (viewingUnitDetail) {
        return <ContentUnitDetail unit={viewingUnitDetail} onBack={() => setViewingUnitDetail(null)} />;
    }

    if (editingUnit) {
        return (
            <ContentEditor
                initialUnit={editingUnit.unit}
                onSave={handleSave}
                onCancel={handleCancelEdit}
                courseTitle={course?.title || 'Curso Desconocido'}
                key={'id' in editingUnit.unit ? editingUnit.unit.id : 'new-unit-editor'}
            />
        );
    }

    return (
        <div>
            {themeModalCourse && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                    <ThemeModule
                        course={themeModalCourse}
                        globalCourse={course}
                        savedThemes={savedThemes}
                        onSaveTheme={onSaveTheme}
                        onDeleteTheme={onDeleteTheme}
                        onActivateTheme={onActivateTheme}
                        onPreviewTheme={onPreviewTheme}
                        onClose={() => setThemeModalCourse(null)}
                    />
                </div>
            )}
            
            <div className="flex justify-between items-center mb-6">
                <div>
                     <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contenido del Curso</h1>
                     <p className="text-md text-gray-500 dark:text-gray-400">{course.title}</p>
                     {course.teacherName && user.role !== 'teacher' && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Impartido por: <span className="font-semibold">{course.teacherName}</span>
                        </p>
                     )}
                </div>
                {user.role === 'teacher' && (
                     <div className="flex items-center gap-2">
                         <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCreateCourse(); }} 
                            className="p-2 text-primary rounded-md hover:bg-primary/10" 
                            aria-label={`Crear un nuevo curso`}
                        >
                            <IconPlus className="w-6 h-6"/>
                        </button>
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setThemeModalCourse(course); }} 
                            className="p-2 text-blue-500 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50" 
                            aria-label={`Editar tema del curso ${course.title}`}
                        >
                            <IconPalette className="w-6 h-6"/>
                        </button>
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCourseClick(course.id, course.title); }} 
                            className="p-2 text-red-500 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50" 
                            aria-label={`Eliminar curso ${course.title}`}
                        >
                            <IconTrash className="w-6 h-6"/>
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="bg-white dark:bg-dark-card shadow-md rounded-lg overflow-hidden">
                    <div className="p-4 space-y-3">
                        {course.content?.map((unit, index) => (
                            <div key={unit.id} className="flex justify-between items-center p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                                <button onClick={() => setViewingUnitDetail(unit)} className="flex items-center gap-3 text-left flex-grow">
                                    <IconBook className="w-5 h-5 text-primary flex-shrink-0"/>
                                    <span className="font-semibold">{unit.title}</span>
                                    {user.role === 'teacher' && unit.status === 'draft' && (
                                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">Borrador</span>
                                    )}
                                </button>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {user.role === 'teacher' && (
                                        <>
                                            <div className="flex flex-col -my-1">
                                                <button 
                                                    onClick={() => onReorderUnit(course.id, index, 'up')}
                                                    disabled={index === 0}
                                                    className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    aria-label="Mover unidad hacia arriba"
                                                >
                                                    <IconChevronUp className="w-4 h-4 text-gray-500" />
                                                </button>
                                                <button 
                                                    onClick={() => onReorderUnit(course.id, index, 'down')}
                                                    disabled={!course.content || index === course.content.length - 1}
                                                    className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    aria-label="Mover unidad hacia abajo"
                                                >
                                                    <IconChevronDown className="w-4 h-4 text-gray-500" />
                                                </button>
                                            </div>
                                            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                                            <button onClick={() => handleEdit(unit, course.id)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600" aria-label="Editar unidad"><IconPencil className="w-5 h-5 text-blue-500"/></button>
                                            <button onClick={() => handleDeleteUnit(unit.id, course.id)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600" aria-label="Eliminar unidad"><IconTrash className="w-5 h-5 text-red-500"/></button>
                                        </>
                                    )}
                                    <button onClick={() => setViewingUnitDetail(unit)}>
                                        <IconChevronRight className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(!course.content || course.content.length === 0) && <p className="text-center text-sm text-gray-500 py-4">Este curso aún no tiene unidades de contenido.</p>}
                         {user.role === 'teacher' && (
                            <button onClick={() => handleStartAddUnit(course.id)} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-primary/5 dark:hover:bg-primary/10">
                                <IconPlus className="w-5 h-5" />
                                Agregar Unidad a "{course.title}"
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContentModule;