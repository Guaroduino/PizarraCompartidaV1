
import React, {useState, useEffect, useMemo} from 'react';
import type { Project, User, KanbanStatus, ProjectStep, Attachment, ProjectResource } from '../types';
import { IconPlus, IconTrash, IconProject, IconPaperclip, IconX, IconPencil, IconDeviceFloppy, IconClock, IconCheck, IconChevronDown, IconChevronUp, IconSparkles, IconUser } from './Icons';
import { uploadFile } from '../services/storageService';
import { useAppContext } from '../contexts/AppContext';
import RichTextEditor from './RichTextEditor';

const KanbanBoard: React.FC<{ project: Project }> = ({ project }) => {
    const statuses: KanbanStatus[] = ['To Do', 'In Progress', 'Done'];
    const statusTranslations: {[key in KanbanStatus]: string} = {
        'To Do': 'Por Hacer',
        'In Progress': 'En Progreso',
        'Done': 'Hecho'
    };
    
    return (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Tablero Kanban de Tareas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statuses.map(status => (
                    <div key={status} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="font-bold text-center mb-4 text-gray-700 dark:text-gray-300">{statusTranslations[status]}</h4>
                        <div className="space-y-3">
                            {project.tasks.filter(task => task.status === status).map(task => (
                                <div key={task.id} className="bg-white dark:bg-dark-card p-3 rounded-md shadow">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{task.title}</p>
                                </div>
                            ))}
                            {project.tasks.filter(task => task.status === status).length === 0 && (
                                <p className="text-sm text-center text-gray-500 dark:text-gray-400">No hay tareas aquí.</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface ProjectEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveProject: (project: Project | Omit<Project, 'id'>, closeModal?: boolean) => void;
    projectToEdit?: Project | null;
    allUsers: User[];
    currentUser: User;
}

const ProjectEditorModal: React.FC<ProjectEditorModalProps> = ({ isOpen, onClose, onSaveProject, projectToEdit, allUsers, currentUser }) => {
    const isEditMode = !!projectToEdit;
    const isTeacher = currentUser.role === 'teacher';
    
    const initialData: Omit<Project, 'id'> = {
        title: '',
        description: '',
        forGuardian: '',
        team: [],
        tasks: [],
        steps: [],
        materialsAndTools: [],
        assignedTo: [],
        status: 'draft',
        leaderId: '',
    };

    const [project, setProject] = useState(isEditMode ? JSON.parse(JSON.stringify(projectToEdit)) : initialData);
    const [stepImageFiles, setStepImageFiles] = useState<Map<number, File>>(new Map());
    const [stepTextFiles, setStepTextFiles] = useState<Map<number, File[]>>(new Map());
    const [materialImageFiles, setMaterialImageFiles] = useState<Map<number, File>>(new Map());
    const [isSaving, setIsSaving] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>('');

    const FILE_EXTENSIONS = ".txt,.js,.jsx,.ts,.tsx,.html,.css,.json,.py,.java,.c,.cpp,.h,.hpp,.cs,.swift,.kt,.go,.rb,.php,.sql,.md";

    // Available students for assignment (all students minus those already assigned)
    const availableStudentsToAdd = useMemo(() => {
        const assignedSet = new Set(project.assignedTo || []);
        return allUsers.filter(u => u.role === 'student' && !assignedSet.has(u.uid));
    }, [allUsers, project.assignedTo]);

    useEffect(() => {
        if (isEditMode) {
            setProject(JSON.parse(JSON.stringify(projectToEdit)));
        } else {
            setProject(initialData);
        }
    }, [projectToEdit, isOpen]);
    
     // Auto-save effect
    useEffect(() => {
        if (!isEditMode || !isOpen) return;

        const handler = setTimeout(() => {
            setAutoSaveStatus('saving');
            handleSubmit(null, 'draft', false).then(() => {
                setAutoSaveStatus('saved');
                setTimeout(() => setAutoSaveStatus('idle'), 2000);
            });
        }, 15000);

        return () => clearTimeout(handler);
    }, [project, isEditMode, isOpen]);


    const handleProjectChange = (field: 'title' | 'description' | 'forGuardian', value: string) => {
        setProject(prev => ({ ...prev, [field]: value }));
    };

    const handleStepChange = (index: number, field: keyof Omit<ProjectStep, 'id' | 'imageUrl' | 'attachments'>, value: string) => {
        const newSteps = [...project.steps];
        (newSteps[index] as any)[field] = value;
        setProject(prev => ({ ...prev, steps: newSteps }));
    };

    const handleImageFileChange = (index: number, file: File | null) => {
        if (!file) return;
        const newFiles = new Map(stepImageFiles);
        newFiles.set(index, file);
        setStepImageFiles(newFiles);
        
        const newSteps = [...project.steps];
        newSteps[index].imageUrl = URL.createObjectURL(file);
        setProject(prev => ({ ...prev, steps: newSteps }));
    };

     const handleTextFileChange = (index: number, files: FileList | null) => {
        if (!files || files.length === 0) return;
        const newMap = new Map(stepTextFiles);
        const existingFiles = newMap.get(index) || [];
        newMap.set(index, [...(Array.isArray(existingFiles) ? existingFiles : []), ...Array.from(files)]);
        setStepTextFiles(newMap);
    };

    const removeTextFile = (stepIndex: number, fileToRemove: File) => {
        const newMap = new Map(stepTextFiles);
        const files = newMap.get(stepIndex) || [];
        newMap.set(stepIndex, (Array.isArray(files) ? files : []).filter(f => f !== fileToRemove));
        setStepTextFiles(newMap);
    };

    const addStep = () => setProject(prev => ({ ...prev, steps: [...prev.steps, { title: '', description: '', imageUrl: '' }] }));
    const removeStep = (index: number) => {
        setProject(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
        const newImageFiles = new Map(stepImageFiles);
        newImageFiles.delete(index);
        setStepImageFiles(newImageFiles);
        const newTextFiles = new Map(stepTextFiles);
        newTextFiles.delete(index);
        setStepTextFiles(newTextFiles);
    };

    const handleMaterialChange = (index: number, field: 'name' | 'description', value: string) => {
        const newMaterials = [...(project.materialsAndTools || [])];
        newMaterials[index][field] = value;
        setProject(prev => ({ ...prev, materialsAndTools: newMaterials }));
    };

    const handleMaterialQuantityChange = (index: number, value: string) => {
        const newMaterials = [...(project.materialsAndTools || [])];
        newMaterials[index].quantity = parseInt(value, 10) || 1;
        setProject(prev => ({ ...prev, materialsAndTools: newMaterials }));
    };

    const handleMaterialImageChange = (index: number, file: File | null) => {
        if (!file) return;
        const newFiles = new Map(materialImageFiles);
        newFiles.set(index, file);
        setMaterialImageFiles(newFiles);
        
        const newMaterials = [...(project.materialsAndTools || [])];
        newMaterials[index].imageUrl = URL.createObjectURL(file);
        setProject(prev => ({ ...prev, materialsAndTools: newMaterials }));
    };

    const addMaterial = () => setProject(prev => ({ ...prev, materialsAndTools: [...(prev.materialsAndTools || []), { name: '', description: '', quantity: 1, imageUrl: '' }] }));
    const removeMaterial = (index: number) => {
        setProject(prev => ({ ...prev, materialsAndTools: (prev.materialsAndTools || []).filter((_, i) => i !== index) }));
        const newImageFiles = new Map(materialImageFiles);
        newImageFiles.delete(index);
        setMaterialImageFiles(newImageFiles);
    };

    // Team Management (Teacher Only) - Add Student
    const handleAddStudentToTeam = () => {
        if (!selectedStudentToAdd) return;
        
        const student = allUsers.find(u => u.uid === selectedStudentToAdd);
        if (!student) return;

        setProject(prev => ({
            ...prev,
            assignedTo: [...(prev.assignedTo || []), student.uid],
            team: [...(prev.team || []), student.name]
        }));
        setSelectedStudentToAdd('');
    };

    // Team Management - Remove Student
    const handleRemoveStudentFromTeam = (studentId: string, studentName: string) => {
        setProject(prev => ({
            ...prev,
            assignedTo: (prev.assignedTo || []).filter(id => id !== studentId),
            team: (prev.team || []).filter(name => name !== studentName),
            leaderId: prev.leaderId === studentId ? '' : prev.leaderId // Clear leader if removed
        }));
    };

    const handleLeaderSelection = (studentId: string) => {
        setProject(prev => ({ ...prev, leaderId: studentId }));
    };


    const handleSubmit = async (e: React.FormEvent | null, status: 'published' | 'draft', closeModal: boolean = true) => {
        e?.preventDefault();
        
        if (status === 'published' && (!project.title.trim() || !project.description.trim())) {
            alert("Por favor, introduce un título y una descripción antes de publicar.");
            return;
        }

        setIsSaving(true);
        
        const finalProject = JSON.parse(JSON.stringify(project));
        finalProject.status = status;
        const uploadPromises: Promise<any>[] = [];

        stepImageFiles.forEach((file, index) => {
            if (finalProject.steps[index]) {
                const promise = uploadFile('project-step-images', file).then(url => finalProject.steps[index].imageUrl = url);
                uploadPromises.push(promise);
            }
        });

        stepTextFiles.forEach((files, index) => {
            if (finalProject.steps[index]) {
                files.forEach(file => {
                    const promise = uploadFile('project-attachments', file).then(url => {
                        const attachment = { name: file.name, url };
                        if (!finalProject.steps[index].attachments) finalProject.steps[index].attachments = [];
                        finalProject.steps[index].attachments.push(attachment);
                    });
                    uploadPromises.push(promise);
                });
            }
        });
        
        materialImageFiles.forEach((file, index) => {
            if (finalProject.materialsAndTools[index]) {
                const promise = uploadFile('project-material-images', file).then(url => finalProject.materialsAndTools[index].imageUrl = url);
                uploadPromises.push(promise);
            }
        });

        try {
            await Promise.all(uploadPromises);
            // FIX: Changed type from Omit to Partial to correctly handle optional 'id' property on new items.
            finalProject.steps = finalProject.steps.map((step: Partial<ProjectStep>, i: number) => ({ ...step, id: step.id || `step_${Date.now()}_${i}` }));
            // FIX: Changed type from Omit to Partial to correctly handle optional 'id' property on new items.
            finalProject.materialsAndTools = (finalProject.materialsAndTools || []).map((mat: Partial<ProjectResource>, i: number) => ({ ...mat, id: mat.id || `mat_${Date.now()}_${i}` }));
            
            onSaveProject(finalProject, closeModal);
        } catch (error) {
            console.error("Error uploading project files: ", error);
            alert("Hubo un error al subir uno o más archivos.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] flex flex-col">
                <header className="flex justify-between items-center p-6 border-b dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-2xl font-bold">{isEditMode ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}</h2>
                    <div className="flex items-center gap-4">
                         <div className="text-sm text-gray-500 italic flex items-center gap-2">
                            {autoSaveStatus === 'saving' && <> <IconClock className="w-4 h-4 animate-spin" /> Guardando...</>}
                            {autoSaveStatus === 'saved' && <> <IconCheck className="w-4 h-4 text-green-500" /> Borrador guardado</>}
                        </div>
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                         <button type="button" onClick={(e) => handleSubmit(e, 'draft')} className="btn-secondary flex items-center gap-2" disabled={isSaving}>
                           <IconDeviceFloppy className="w-5 h-5"/> Guardar Borrador
                        </button>
                        <button type="button" onClick={(e) => handleSubmit(e, 'published')} className="btn-primary" disabled={isSaving}>{isSaving ? 'Publicando...' : 'Publicar'}</button>
                    </div>
                </header>
                <form className="flex-grow p-6 space-y-6 overflow-y-auto">
                    <div>
                        <label htmlFor="proj-title" className="block text-sm font-medium mb-1">Título del Proyecto</label>
                        <input type="text" id="proj-title" value={project.title} onChange={e => handleProjectChange('title', e.target.value)} className="mt-1 block w-full input-style text-xl font-bold" required />
                    </div>
                    <div>
                        <label htmlFor="proj-desc" className="block text-sm font-medium mb-1">Descripción Detallada</label>
                        <RichTextEditor
                            value={project.description}
                            onChange={(html) => handleProjectChange('description', html)}
                            placeholder="Pega aquí tu descripción extensa o escribe los detalles del proyecto..."
                        />
                        <p className="text-xs text-gray-500 mt-1">Puedes pegar texto formateado desde otros documentos.</p>
                    </div>
                    <div>
                        <label htmlFor="proj-forGuardian" className="block text-sm font-medium text-gray-500 dark:text-gray-400">Resumen para el representante (Opcional)</label>
                        <textarea id="proj-forGuardian" value={project.forGuardian} onChange={e => handleProjectChange('forGuardian', e.target.value)} rows={2} className="mt-1 block w-full input-style text-sm" placeholder="Explica el objetivo del proyecto en términos sencillos para los padres..." />
                    </div>

                    {isTeacher && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-bold mb-3">Gestión del Equipo y Liderazgo</h3>
                            <p className="text-xs text-gray-500 mb-4">Selecciona estudiantes para añadirlos al equipo. Marca la estrella para designar al líder.</p>
                            
                            {/* Add Student Section */}
                            <div className="flex gap-2 mb-6">
                                <select 
                                    value={selectedStudentToAdd} 
                                    onChange={e => setSelectedStudentToAdd(e.target.value)}
                                    className="input-style flex-grow"
                                >
                                    <option value="">Seleccionar estudiante...</option>
                                    {availableStudentsToAdd.map(s => (
                                        <option key={s.uid} value={s.uid}>{s.name}</option>
                                    ))}
                                </select>
                                <button 
                                    type="button" 
                                    onClick={handleAddStudentToTeam} 
                                    disabled={!selectedStudentToAdd}
                                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <IconPlus className="w-5 h-5"/> Añadir
                                </button>
                            </div>

                            {/* Team List */}
                            <div className="space-y-2">
                                {(project.assignedTo || []).length === 0 ? (
                                    <p className="text-center text-gray-400 italic py-4">No hay miembros en el equipo aún.</p>
                                ) : (
                                    (project.assignedTo || []).map(uid => {
                                        const student = allUsers.find(u => u.uid === uid);
                                        const isLeader = project.leaderId === uid;
                                        if (!student) return null;

                                        return (
                                            <div key={uid} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isLeader ? 'bg-white dark:bg-gray-700 border-yellow-400 ring-1 ring-yellow-400' : 'bg-gray-100 dark:bg-gray-800 border-transparent'}`}>
                                                <div className="flex items-center gap-3">
                                                    <img src={student.avatarUrl} alt={student.name} className="w-8 h-8 rounded-full object-cover"/>
                                                    <span className="font-medium text-gray-800 dark:text-white">{student.name}</span>
                                                    {isLeader && <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">Líder</span>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleLeaderSelection(uid)} 
                                                        className={`p-2 rounded-full transition-colors ${isLeader ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20' : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                                        title={isLeader ? "Es el líder del equipo" : "Marcar como Líder"}
                                                    >
                                                        <IconSparkles className="w-5 h-5"/>
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveStudentFromTeam(uid, student.name)} 
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                                        title="Eliminar del equipo"
                                                    >
                                                        <IconX className="w-5 h-5"/>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-semibold">Pasos del Proyecto</h3>
                            <button type="button" onClick={addStep} className="text-sm font-medium text-white bg-secondary px-3 py-1 rounded-md hover:bg-green-600">+ Agregar Paso</button>
                        </div>
                        {project.steps.map((step, index) => {
                            const newFiles = stepTextFiles.get(index) || [];
                            return (
                             <div key={index} className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-800/50">
                                 <div className="flex items-center gap-4">
                                     <span className="font-bold text-gray-500">#{index + 1}</span>
                                     <input type="text" placeholder={`Título del Paso`} value={step.title} onChange={e => handleStepChange(index, 'title', e.target.value)} className="flex-grow input-style" required />
                                     <button type="button" onClick={() => removeStep(index)} className="text-red-500 hover:text-red-700"><IconTrash className="w-5 h-5" /></button>
                                 </div>
                                 <textarea placeholder="Descripción del paso" value={step.description} onChange={e => handleStepChange(index, 'description', e.target.value)} className="w-full input-style" rows={2} required />
                                 <textarea placeholder="Resumen para el representante (Paso)..." value={step.forGuardian || ''} onChange={e => handleStepChange(index, 'forGuardian', e.target.value)} className="w-full input-style text-xs" rows={2} />
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor={`p-file-${index}`} className="block text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:text-primary">
                                            Imagen del paso
                                        </label>
                                        <input type="file" id={`p-file-${index}`} accept="image/*" onChange={(e) => handleImageFileChange(index, e.target.files ? e.target.files[0] : null)} className="hidden" />
                                        {step.imageUrl && <img src={step.imageUrl} alt="preview" className="mt-2 rounded-md max-h-32"/>}
                                    </div>
                                    <div>
                                         <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Archivos adjuntos</label>
                                        <input type="file" multiple accept={FILE_EXTENSIONS} onChange={(e) => handleTextFileChange(index, e.target.files)} className="text-xs"/>
                                        {newFiles.length > 0 && (
                                            <div className="mt-2 space-y-1 text-xs">
                                                {newFiles.map((file, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-gray-200 dark:bg-gray-700 p-1 rounded">
                                                        <span className="truncate">{file.name}</span>
                                                        <button type="button" onClick={() => removeTextFile(index, file)} className="text-red-500 hover:text-red-700 ml-2"><IconX className="w-3 h-3" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                 </div>
                             </div>
                        )})}
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                             <h3 className="text-xl font-semibold">Materiales y Herramientas</h3>
                             <button type="button" onClick={addMaterial} className="text-sm font-medium text-white bg-secondary px-3 py-1 rounded-md hover:bg-green-600">+ Agregar Material</button>
                        </div>
                        {(project.materialsAndTools || []).map((mat, index) => (
                            <div key={index} className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center gap-4">
                                    <input type="text" placeholder={`Nombre del Material`} value={mat.name} onChange={e => handleMaterialChange(index, 'name', e.target.value)} className="flex-grow input-style" required />
                                    <input type="number" placeholder="Cant." value={mat.quantity} onChange={e => handleMaterialQuantityChange(index, e.target.value)} className="input-style w-20 text-center" required min="1" />
                                    <button type="button" onClick={() => removeMaterial(index)} className="text-red-500 hover:text-red-700"><IconTrash className="w-5 h-5" /></button>
                                </div>
                                <textarea placeholder="Descripción del material" value={mat.description} onChange={e => handleMaterialChange(index, 'description', e.target.value)} className="w-full input-style" rows={2} required />
                                <div>
                                    <label htmlFor={`mat-file-${index}`} className="block text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:text-primary">
                                        Foto del material
                                    </label>
                                    <input type="file" id={`mat-file-${index}`} accept="image/*" onChange={(e) => handleMaterialImageChange(index, e.target.files ? e.target.files[0] : null)} className="hidden" />
                                    {mat.imageUrl && <img src={mat.imageUrl} alt="preview" className="mt-2 rounded-md max-h-32"/>}
                                </div>
                            </div>
                        ))}
                    </div>
                </form>
                 {/* @ts-ignore */}
                 <style jsx>{`
                    .input-style { background-color: white; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem 0.75rem; width: 100%; }
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

const ProjectCard: React.FC<{ project: Project; user: User; onEdit: (p: Project) => void; onDelete: (id: string) => void; allUsers: User[] }> = ({ project, user, onEdit, onDelete, allUsers }) => {
    const { openImageViewer } = useAppContext();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const isLeader = user.uid === project.leaderId;
    const canEdit = user.role === 'teacher' || isLeader;

    return (
        <div className={`bg-white dark:bg-dark-card p-6 rounded-xl shadow-lg mb-8 border ${isLeader ? 'border-yellow-400 ring-1 ring-yellow-400' : 'border-gray-100 dark:border-gray-700'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-primary">{project.title}</h2>
                    {user.role === 'teacher' && project.status === 'draft' && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">Borrador</span>
                    )}
                </div>
                <div className="flex gap-2">
                    {canEdit && (
                        <button onClick={() => onEdit(project)} className="btn-secondary text-sm flex items-center gap-2">
                            <IconPencil className="w-4 h-4"/> Editar
                        </button>
                    )}
                    {user.role === 'teacher' && (
                        <button onClick={() => onDelete(project.id)} className="btn-secondary text-sm flex items-center gap-2 text-red-600 hover:text-red-700">
                            <IconTrash className="w-4 h-4"/> Eliminar
                        </button>
                    )}
                </div>
            </div>
            
            <div className="relative mb-6">
                <div 
                    className={`rich-text-content text-gray-700 dark:text-gray-300 transition-all duration-500 ease-in-out overflow-hidden ${isDescriptionExpanded ? 'max-h-[2000px]' : 'max-h-32'}`}
                    dangerouslySetInnerHTML={{ __html: project.description }} 
                />
                {!isDescriptionExpanded && (
                    <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white dark:from-dark-card to-transparent pointer-events-none"></div>
                )}
                <div className="flex justify-center mt-2">
                    <button 
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark focus:outline-none"
                    >
                        {isDescriptionExpanded ? (
                            <>Ver menos <IconChevronUp className="w-4 h-4" /></>
                        ) : (
                            <>Leer descripción completa <IconChevronDown className="w-4 h-4" /></>
                        )}
                    </button>
                </div>
            </div>
            
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm uppercase tracking-wide">Equipo del Proyecto</h4>
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                    {project.assignedTo && project.assignedTo.length > 0 ? project.assignedTo.map(uid => {
                        const student = allUsers.find(u => u.uid === uid);
                        const isMemberLeader = project.leaderId === uid;
                        return (
                            <span key={uid} className={`px-3 py-1 border text-sm rounded-full shadow-sm flex items-center gap-1 ${isMemberLeader ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-600'}`}>
                                {isMemberLeader && <IconSparkles className="w-3 h-3 text-yellow-500"/>}
                                {student?.name || 'Estudiante desconocido'}
                                {isMemberLeader && <span className="text-xs font-bold ml-1">(Líder)</span>}
                            </span>
                        );
                    }) : <span className="text-sm text-gray-400 italic">Sin miembros asignados</span>}
                </div>
            </div>
            
            <div className="my-8">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="bg-secondary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span> 
                    Pasos del Proyecto
                </h3>
                <div className="space-y-6">
                    {project.steps.map((step, index) => (
                        <div key={step.id} className="flex flex-col md:flex-row gap-6 items-start p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-l-4 border-transparent hover:border-secondary">
                            {step.imageUrl ? (
                                <button onClick={() => openImageViewer(step.imageUrl)} className="w-full md:w-56 h-40 rounded-lg flex-shrink-0 overflow-hidden shadow-md" aria-label={`Ver imagen de ${step.title}`}>
                                    <img src={step.imageUrl} alt={step.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                                </button>
                            ) : (
                                <div className="w-full md:w-56 h-40 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-300 dark:text-gray-500">
                                    <IconProject className="w-12 h-12" />
                                </div>
                            )}
                            <div className="flex-grow">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Paso {index + 1}</span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{step.title}</h4>
                                <p className="text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">{step.description}</p>
                                {step.attachments && step.attachments.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {step.attachments.map((file) => (
                                            <a 
                                                key={file.url}
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
                                            >
                                                <IconPaperclip className="w-3 h-3" />
                                                <span className="truncate max-w-[150px]">{file.name}</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="my-8">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="bg-secondary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span> 
                    Materiales y Herramientas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {project.materialsAndTools?.map(mat => (
                        <div key={mat.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex gap-4 items-start group hover:shadow-md transition-all">
                            {mat.imageUrl ? (
                                <button onClick={() => openImageViewer(mat.imageUrl)} className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border dark:border-gray-600" aria-label={`Ver imagen de ${mat.name}`}>
                                    <img src={mat.imageUrl} alt={mat.name} className="w-full h-full object-cover" />
                                </button>
                            ) : (
                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0 flex items-center justify-center">
                                    <IconProject className="w-8 h-8 text-gray-400" />
                                </div>
                            )}
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white leading-tight">{mat.name}</h4>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-white dark:bg-dark-card text-xs font-bold text-secondary rounded border border-gray-200 dark:border-gray-600">x{mat.quantity}</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{mat.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
                {(!project.materialsAndTools || project.materialsAndTools.length === 0) && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-gray-500 italic">
                        No se han especificado materiales o herramientas para este proyecto.
                    </div>
                )}
            </div>

            <KanbanBoard project={project} />
        </div>
    );
};

const ProjectsModule: React.FC<{ projects: Project[], user: User, allUsers: User[], onAddProject: (project: Omit<Project, 'id'>) => void; onUpdateProject: (project: Project) => void; onDeleteProject: (id: string) => void; }> = ({ projects, user, allUsers, onAddProject, onUpdateProject, onDeleteProject }) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    
    const handleOpenCreator = () => {
        setEditingProject(null);
        setIsEditorOpen(true);
    };

    const handleOpenEditor = (project: Project) => {
        setEditingProject(project);
        setIsEditorOpen(true);
    };

    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setEditingProject(null);
    };

    const handleSaveProject = async (projectData: Project | Omit<Project, 'id'>, closeModal: boolean = true) => {
        if ('id' in projectData) {
            await onUpdateProject(projectData as Project);
        } else {
            await onAddProject(projectData as Omit<Project, 'id'>);
        }
        if (closeModal) {
            handleCloseEditor();
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Proyectos</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona y colabora en los proyectos del curso.</p>
                </div>
                 {user.role === 'teacher' && (
                    <button onClick={handleOpenCreator} className="flex items-center gap-2 px-5 py-2.5 font-bold text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                        <IconPlus className="w-5 h-5" />
                        Crear Proyecto
                    </button>
                )}
            </div>
            
            <ProjectEditorModal 
                isOpen={isEditorOpen} 
                onClose={handleCloseEditor} 
                onSaveProject={handleSaveProject}
                projectToEdit={editingProject}
                allUsers={allUsers}
                currentUser={user}
            />

            <div className="space-y-8">
                {projects.length > 0 ? projects.map(project => (
                    <ProjectCard 
                        key={project.id} 
                        project={project} 
                        user={user} 
                        onEdit={handleOpenEditor} 
                        onDelete={onDeleteProject}
                        allUsers={allUsers}
                    />
                )) : (
                    <div className="text-center py-16 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <IconProject className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No hay proyectos aún</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2">
                            {user.role === 'teacher' 
                                ? "Comienza creando el primer proyecto para tus estudiantes haciendo clic en el botón 'Crear Proyecto'."
                                : "Tu profesor aún no ha publicado ningún proyecto para este curso."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectsModule;
