
import React, { useState, useRef, useEffect } from 'react';
import type { Assignment, User, Question, AssignmentSubmission, Answer, Attachment } from '../types';
import { IconPlus, IconTrash, IconClipboard, IconPencil, IconCheck, IconX, IconPaperclip, IconClock, IconDeviceFloppy } from './Icons';
import { uploadFile } from '../services/storageService';
import { useAppContext } from '../contexts/AppContext';
import RichTextEditor from './RichTextEditor';

// --- MODAL EDITOR DE TAREAS (NUEVO Y COMBINADO) ---
interface AssignmentEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveAssignment: (assignment: Assignment | Omit<Assignment, 'id' | 'submissions'>, closeModal?: boolean) => Promise<void>;
    assignmentToEdit?: Assignment | null;
}

const AssignmentEditorModal: React.FC<AssignmentEditorModalProps> = ({ isOpen, onClose, onSaveAssignment, assignmentToEdit }) => {
    const isEditMode = !!assignmentToEdit;
    const initialData: Omit<Assignment, 'id' | 'submissions'> = {
        title: '',
        description: '',
        forGuardian: '',
        dueDate: '',
        imageUrls: [],
        attachments: [],
        questions: [],
        status: 'draft',
    };
    
    const [assignmentData, setAssignmentData] = useState(isEditMode && assignmentToEdit ? JSON.parse(JSON.stringify(assignmentToEdit)) : initialData);
    const [newGeneralImages, setNewGeneralImages] = useState<{file: File, previewUrl: string}[]>([]);
    const [newGeneralTxtFiles, setNewGeneralTxtFiles] = useState<File[]>([]);
    const [newQuestionImages, setNewQuestionImages] = useState<Map<number, {file: File, previewUrl: string}[]>>(new Map());
    const [newQuestionTxtFiles, setNewQuestionTxtFiles] = useState<Map<number, File[]>>(new Map());
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const FILE_EXTENSIONS = ".txt,.js,.jsx,.ts,.tsx,.html,.css,.json,.py,.java,.c,.cpp,.h,.hpp,.cs,.swift,.kt,.go,.rb,.php,.sql,.md";


    useEffect(() => {
        if (!isOpen) {
            setNewGeneralImages([]);
            setNewQuestionImages(new Map());
            setNewGeneralTxtFiles([]);
            setNewQuestionTxtFiles(new Map());
        }
    }, [isOpen]);

    // Auto-save effect
    useEffect(() => {
        if (!isEditMode) return; // Only auto-save for existing items

        const handler = setTimeout(() => {
            setAutoSaveStatus('saving');
            // Auto-save always saves as a draft and does not close the modal
            handleSubmit(null, 'draft', false).then(() => {
                setAutoSaveStatus('saved');
                setTimeout(() => setAutoSaveStatus('idle'), 2000);
            });
        }, 15000); // 15-second delay

        return () => clearTimeout(handler);
    }, [assignmentData, isEditMode]);


    const handleDataChange = (field: keyof Omit<Assignment, 'id' | 'submissions' | 'questions' | 'imageUrls' | 'attachments' | 'description'>, value: string) => {
        setAssignmentData(prev => ({ ...prev, [field]: value }));
    };

    const handleDescriptionChange = (html: string) => {
        setAssignmentData(prev => ({ ...prev, description: html }));
    };

    const handleGeneralFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files: File[] = Array.from(e.target.files);
            const newInfos = files.map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
            setNewGeneralImages(prev => [...prev, ...newInfos]);
        }
    };

    const handleGeneralTxtFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // FIX: Added a robust Array.isArray check to ensure 'prev' state is iterable before spreading, preventing runtime errors.
            // Also removed incorrect type casting 'as File[]' on FileList which caused TypeScript error.
            setNewGeneralTxtFiles(prev => [...(Array.isArray(prev) ? prev : []), ...Array.from(e.target.files || [])]);
        }
    };
    
    const handleQuestionFileChange = (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files: File[] = Array.from(e.target.files);
            const newInfos = files.map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
            const newMap = new Map(newQuestionImages);
            // FIX: Cast existing to array to satisfy iterator requirement if type inference fails (fixing 'unknown' iterator error)
            const existing = (newMap.get(qIndex) || []) as {file: File, previewUrl: string}[];
            newMap.set(qIndex, [...existing, ...newInfos]);
            setNewQuestionImages(newMap);
        }
    };

    const handleQuestionTxtFileChange = (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newMap = new Map(newQuestionTxtFiles);
            // FIX: Cast existing to File[] to ensure it satisfies iterator requirements.
            const existing = (newMap.get(qIndex) || []) as File[];
            // FIX: Use Array.from directly on FileList
            newMap.set(qIndex, [...existing, ...Array.from(e.target.files)]);
            setNewQuestionTxtFiles(newMap);
        }
    };
    
    const addQuestion = () => {
        if (currentQuestion.trim()) {
            const newQuestion: Question = { id: `q_new_${Date.now()}`, text: currentQuestion.trim(), imageUrls: [], attachments: [] };
            setAssignmentData(prev => ({...prev, questions: [...prev.questions, newQuestion]}));
            setCurrentQuestion('');
        }
    };
    
    const removeQuestion = (index: number) => {
        setAssignmentData(prev => ({...prev, questions: prev.questions.filter((_, i) => i !== index)}));
        const newImgMap = new Map(newQuestionImages);
        newImgMap.delete(index);
        setNewQuestionImages(newImgMap);
        const newTxtMap = new Map(newQuestionTxtFiles);
        newTxtMap.delete(index);
        setNewQuestionTxtFiles(newTxtMap);
    };

    const removeGeneralImage = (urlToRemove: string) => {
        const isNew = newGeneralImages.some(info => info.previewUrl === urlToRemove);
        if (isNew) {
            setNewGeneralImages(prev => prev.filter(info => info.previewUrl !== urlToRemove));
            URL.revokeObjectURL(urlToRemove);
        } else {
            // FIX: Added a robust Array.isArray check to prevent runtime errors when `prev.imageUrls` might not be an array.
            setAssignmentData(prev => ({ ...prev, imageUrls: (Array.isArray(prev.imageUrls) ? prev.imageUrls : []).filter(url => url !== urlToRemove) }));
        }
    };
    
    const removeGeneralTxtFile = (fileToRemove: File | Attachment) => {
        if ('url' in fileToRemove) { // Existing attachment
            setAssignmentData(prev => ({ ...prev, attachments: (prev.attachments || []).filter(f => f.url !== fileToRemove.url) }));
        } else { // New file
            setNewGeneralTxtFiles(prev => prev.filter(f => f !== fileToRemove));
        }
    };


    const removeQuestionImage = (qIndex: number, urlToRemove: string) => {
        const questionNewImages = newQuestionImages.get(qIndex) || [];
        const isNew = questionNewImages.some(info => info.previewUrl === urlToRemove);
        if (isNew) {
            const newMap = new Map(newQuestionImages);
            newMap.set(qIndex, questionNewImages.filter(info => info.previewUrl !== urlToRemove));
            setNewQuestionImages(newMap);
            URL.revokeObjectURL(urlToRemove);
        } else {
            const newQuestions = [...assignmentData.questions];
            if (newQuestions[qIndex]) {
                newQuestions[qIndex].imageUrls = (newQuestions[qIndex].imageUrls || []).filter(url => url !== urlToRemove);
                setAssignmentData(prev => ({ ...prev, questions: newQuestions }));
            }
        }
    };

    const removeQuestionTxtFile = (qIndex: number, fileToRemove: File | Attachment) => {
        if ('url' in fileToRemove) { // Existing attachment
            const newQuestions = [...assignmentData.questions];
            if (newQuestions[qIndex]) {
                newQuestions[qIndex].attachments = (newQuestions[qIndex].attachments || []).filter(f => f.url !== fileToRemove.url);
                setAssignmentData(prev => ({ ...prev, questions: newQuestions }));
            }
        } else { // New file
            const newMap = new Map(newQuestionTxtFiles);
            // FIX: Cast to File[] to prevent 'filter does not exist on type unknown' error
            const files = (newMap.get(qIndex) || []) as File[];
            newMap.set(qIndex, files.filter(f => f !== fileToRemove));
            setNewQuestionTxtFiles(newMap);
        }
    };


    const handleSubmit = async (e: React.FormEvent | null, status: 'published' | 'draft', closeModal: boolean = true) => {
        e?.preventDefault();

        if (status === 'published') {
            if (!assignmentData.title.trim() || !assignmentData.dueDate) {
                alert("Por favor, introduce un título y una fecha de entrega antes de publicar.");
                return;
            }
        }

        setIsSaving(true);
        try {
            const finalData = JSON.parse(JSON.stringify(assignmentData));
            finalData.status = status;
            const uploadPromises: Promise<any>[] = [];
            
            // Upload new general images
            newGeneralImages.forEach(info => {
                uploadPromises.push(uploadFile('assignment-images', info.file).then(url => {
                    if (!finalData.imageUrls) finalData.imageUrls = [];
                    finalData.imageUrls.push(url);
                }));
            });
            // Upload new general text files
            newGeneralTxtFiles.forEach(file => {
                uploadPromises.push(uploadFile('assignment-attachments', file).then(url => {
                    if (!finalData.attachments) finalData.attachments = [];
                    finalData.attachments.push({ name: file.name, url });
                }));
            });

            // Upload new question images
            newQuestionImages.forEach((infos, qIndex) => {
                infos.forEach(info => {
                    uploadPromises.push(uploadFile('assignment-images', info.file).then(url => {
                        if (finalData.questions[qIndex]) {
                            if (!finalData.questions[qIndex].imageUrls) finalData.questions[qIndex].imageUrls = [];
                            finalData.questions[qIndex].imageUrls.push(url);
                        }
                    }));
                });
            });

            // Upload new question text files
            newQuestionTxtFiles.forEach((files, qIndex) => {
                files.forEach(file => {
                    uploadPromises.push(uploadFile('assignment-attachments', file).then(url => {
                        if (finalData.questions[qIndex]) {
                            if (!finalData.questions[qIndex].attachments) finalData.questions[qIndex].attachments = [];
                            finalData.questions[qIndex].attachments.push({ name: file.name, url });
                        }
                    }));
                });
            });

            await Promise.all(uploadPromises);
            
            // Finalize question IDs if new
            finalData.questions = finalData.questions.map((q: Question, i: number) => ({
                ...q,
                id: q.id.startsWith('q_new_') ? `q_${Date.now()}_${i}` : q.id
            }));
            
            await onSaveAssignment(finalData, closeModal);
            if(closeModal) onClose();
        } catch (error) {
            console.error("Error saving assignment:", error);
            alert("Hubo un error al guardar la tarea.");
        } finally {
            setIsSaving(false);
        }
    };

    const generalImageUrlsToDisplay = [...(assignmentData.imageUrls || []), ...newGeneralImages.map(info => info.previewUrl)];
    const generalTxtFilesToDisplay = [...(assignmentData.attachments || []), ...newGeneralTxtFiles];


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-bold">{isEditMode ? 'Editar Tarea' : 'Crear Nueva Tarea'}</h2>
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
                    {/* Title and Due Date */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                         <div className="md:col-span-2">
                             <label className="block text-sm font-medium mb-1">Título de la Tarea</label>
                            <input type="text" placeholder="Título" value={assignmentData.title} onChange={e => handleDataChange('title', e.target.value)} className="input-style text-xl font-bold" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Fecha de Entrega</label>
                            <input type="date" value={assignmentData.dueDate.split('T')[0]} onChange={e => handleDataChange('dueDate', new Date(e.target.value).toISOString())} className="input-style" required />
                        </div>
                    </div>

                    {/* Description Editor */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Descripción</label>
                        <RichTextEditor value={assignmentData.description} onChange={handleDescriptionChange} placeholder="Escribe aquí la descripción y las instrucciones de la tarea..." />
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* General Resources */}
                        <div className="md:col-span-1 space-y-3">
                             <h4 className="font-semibold text-gray-700 dark:text-gray-300">Recursos Generales</h4>
                            <div className="p-4 border-2 border-dashed rounded-lg space-y-2">
                                 <label className="block text-sm font-medium">Añadir imágenes</label>
                                <input type="file" multiple accept="image/*" onChange={handleGeneralFileChange} className="input-style text-sm"/>
                                 <label className="block text-sm font-medium mt-2">Añadir archivos de código</label>
                                <input type="file" multiple accept={FILE_EXTENSIONS} onChange={handleGeneralTxtFileChange} className="input-style text-sm"/>
                            </div>
                            <div className="space-y-2">
                                {generalImageUrlsToDisplay.map((url, index) => (
                                    <div key={url} className="relative group">
                                        <img src={url} className="w-full object-cover rounded shadow-sm"/>
                                        <button type="button" onClick={() => removeGeneralImage(url)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Eliminar imagen">
                                            <IconX className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {generalTxtFilesToDisplay.map((file, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded">
                                        <span className="truncate">{file.name}</span>
                                        <button type="button" onClick={() => removeGeneralTxtFile(file)} className="text-red-500 hover:text-red-700 ml-2"><IconX className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Questions */}
                        <div className="md:col-span-2 space-y-3">
                             <h4 className="font-semibold text-gray-700 dark:text-gray-300">Preguntas</h4>
                             <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {assignmentData.questions.map((q, qIndex) => {
                                    const questionImageUrlsToDisplay = [...(q.imageUrls || []), ...(newQuestionImages.get(qIndex) || []).map(info => info.previewUrl)];
                                    const questionTxtFilesToDisplay = [...(q.attachments || []), ...(newQuestionTxtFiles.get(qIndex) || [])];
                                    return (
                                        <div key={q.id} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                                            <div className="flex items-center gap-2">
                                                <p className="flex-grow">{qIndex + 1}. {q.text}</p>
                                                <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:text-red-700 flex-shrink-0"><IconTrash className="w-4 h-4" /></button>
                                            </div>
                                            <div className="mt-2 pt-2 border-t dark:border-gray-600">
                                                <label className="text-xs font-medium">Recursos para esta pregunta:</label>
                                                <input type="file" multiple accept="image/*" onChange={(e) => handleQuestionFileChange(qIndex, e)} className="text-xs mt-1 w-full"/>
                                                <input type="file" multiple accept={FILE_EXTENSIONS} onChange={(e) => handleQuestionTxtFileChange(qIndex, e)} className="text-xs mt-1 w-full"/>
                                                <div className="flex gap-2 mt-2 flex-wrap">
                                                    {questionImageUrlsToDisplay.map((url, imgIndex) => (
                                                        <div key={url} className="relative group">
                                                            <img src={url} className="w-16 h-16 object-cover rounded"/>
                                                            <button type="button" onClick={() => removeQuestionImage(qIndex, url)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Eliminar imagen">
                                                                <IconX className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                 <div className="space-y-1 mt-2">
                                                    {questionTxtFilesToDisplay.map((file, i) => (
                                                        <div key={i} className="flex items-center justify-between text-xs bg-gray-200 dark:bg-gray-600 p-1 rounded">
                                                            <span className="truncate">{file.name}</span>
                                                            <button type="button" onClick={() => removeQuestionTxtFile(qIndex, file)} className="text-red-500 hover:text-red-700 ml-2"><IconX className="w-3 h-3" /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                             <div className="flex items-center gap-2 mt-2">
                                <input type="text" value={currentQuestion} onChange={e => setCurrentQuestion(e.target.value)} placeholder="Añadir una nueva pregunta..." className="flex-grow input-style" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addQuestion())}/>
                                <button type="button" onClick={addQuestion} className="px-3 py-2 text-sm font-medium text-white bg-secondary rounded-md hover:bg-green-600">Añadir</button>
                            </div>
                        </div>
                    </div>
                     {/* For Guardian Summary */}
                     <div>
                        <label className="block text-sm font-medium mb-1">Resumen para el representante (Opcional)</label>
                        <textarea placeholder="Explica brevemente la tarea para los padres..." value={assignmentData.forGuardian || ''} onChange={e => handleDataChange('forGuardian', e.target.value)} rows={2} className="input-style text-sm"/>
                    </div>
                </form>
            </div>
        </div>
    );
};


// MODAL PARA VER RESPUESTAS (VISTA PROFESOR)
const ViewAnswersModal: React.FC<{ submission: AssignmentSubmission; questions: Question[]; onClose: () => void; }> = ({ submission, questions, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Respuestas de {submission.studentName}</h2>
                        <p className="text-sm text-gray-500">Última actualización: {new Date(submission.submittedAt).toLocaleString()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><IconX className="w-6 h-6"/></button>
                </header>
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {questions.map(q => {
                        const answer = submission.answers.find(a => a.questionId === q.id);
                        return (
                            <div key={q.id} className="p-4 border dark:border-gray-600 rounded-md">
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{q.text}</p>
                                {answer ? (
                                    <div className="mt-2 pl-4 border-l-2 border-primary dark:border-primary-light">
                                        <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: answer.text }}></div>
                                        {answer.imageUrl && <img src={answer.imageUrl} alt="Imagen de respuesta" className="mt-2 rounded-md max-w-xs"/>}
                                    </div>
                                ) : (
                                    <p className="mt-2 text-sm text-gray-500 italic">Sin respuesta.</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

// TARJETA DE TAREA PARA PROFESOR (WYSIWYG)
const TeacherAssignmentCard: React.FC<{ assignment: Assignment, onEdit: (assignment: Assignment) => void; onDelete: (id: string) => void; }> = ({ assignment, onEdit, onDelete }) => {
    const { openImageViewer } = useAppContext();
    const [viewingSubmission, setViewingSubmission] = useState<AssignmentSubmission | null>(null);
    const [submissionsVisible, setSubmissionsVisible] = useState(false);

    return (
        <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{assignment.title}</h2>
                    {assignment.status === 'draft' && (
                        <span className="px-2 py-0.5 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">Borrador</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {(assignment.submissions?.length > 0) && (
                         <button onClick={() => setSubmissionsVisible(!submissionsVisible)} className="btn-secondary text-sm">
                            {assignment.submissions.length} Entregas
                        </button>
                    )}
                    <button onClick={() => onEdit(assignment)} className="btn-primary text-sm flex items-center gap-2"><IconPencil className="w-4 h-4"/> Editar</button>
                    <button onClick={() => onDelete(assignment.id)} className="btn-secondary text-sm flex items-center gap-2 text-red-600 hover:text-red-700"><IconTrash className="w-4 h-4"/> Eliminar</button>
                </div>
            </div>
             <p className="text-sm font-medium text-red-500">Fecha de entrega: {new Date(assignment.dueDate).toLocaleDateString()}</p>

            <div className="mt-2 text-gray-600 dark:text-dark-text rich-text-content" dangerouslySetInnerHTML={{ __html: assignment.description }}></div>

            <div className="mt-4 flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3 flex-shrink-0">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Recursos Generales</h4>
                    {assignment.imageUrls && assignment.imageUrls.length > 0 && (
                        <div className="space-y-2">
                        {assignment.imageUrls.map((url, index) => (
                            <button key={index} onClick={() => openImageViewer(url)} className="rounded-lg w-full h-48 overflow-hidden group">
                                <img src={url} alt={assignment.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            </button>
                        ))}
                        </div>
                    )}
                    {assignment.attachments && assignment.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {assignment.attachments.map((file) => (
                                <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                                    <IconPaperclip className="w-4 h-4" /> <span className="truncate">{file.name}</span>
                                </a>
                            ))}
                        </div>
                    )}
                    {(!assignment.imageUrls || assignment.imageUrls.length === 0) && (!assignment.attachments || assignment.attachments.length === 0) && (
                        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <IconClipboard className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                        </div>
                    )}
                </div>

                <div className="md:w-2/3">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">Preguntas:</h4>
                    <ul className="mt-2 space-y-2">
                        {assignment.questions.map(q => (
                            <li key={q.id}>
                                <div className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 rounded-md flex justify-between items-center">
                                    <span className="flex-grow pr-4">{q.text}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {submissionsVisible && (
                <div className="border-t border-gray-200 dark:border-gray-700 mt-6 pt-4">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">Entregas:</h3>
                    {assignment.submissions?.length > 0 ? (
                        <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-700">
                            {assignment.submissions.map(sub => (
                                <li key={sub.studentId} className="py-3 flex items-center justify-between">
                                    <span>{sub.studentName}</span>
                                    <button onClick={() => setViewingSubmission(sub)} className="btn-secondary text-sm">Ver Respuestas</button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <p className="text-sm text-gray-500 italic mt-2">No hay entregas todavía.</p>
                    )}
                </div>
            )}
             {viewingSubmission && (
                <ViewAnswersModal
                    submission={viewingSubmission}
                    questions={assignment.questions}
                    onClose={() => setViewingSubmission(null)}
                />
            )}
        </div>
    );
};


// VISTA DEL PROFESOR (ACTUALIZADA)
const TeacherView: React.FC<{ assignments: Assignment[], onEdit: (assignment: Assignment) => void; onDelete: (id: string) => void; }> = ({ assignments, onEdit, onDelete }) => {
    return (
        <div className="space-y-6">
            {assignments.map(assignment => (
                <TeacherAssignmentCard key={assignment.id} assignment={assignment} onEdit={onEdit} onDelete={onDelete}/>
            ))}
        </div>
    );
};

// MODAL PARA RESPONDER PREGUNTAS (NUEVO Y MEJORADO)
const AnswerQuestionModal: React.FC<{
    question: Question;
    assignment: Assignment;
    courseId: string;
    answer: Answer | undefined;
    onClose: () => void;
    onSaveAnswer: (courseId: string, assignmentId: string, questionId: string, answerText: string, answerImageUrl: string | null) => Promise<void>;
}> = ({ question, assignment, courseId, answer, onClose, onSaveAnswer }) => {
    const [text, setText] = useState(answer?.text || '');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(answer?.imageUrl || null);
    const [isSaving, setIsSaving] = useState(false);
    const { openImageViewer } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resourceImages = question.imageUrls || [];
    const resourceFiles = question.attachments || [];
    const resourceTitle = 'Recursos de la Pregunta';


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let finalImageUrl: string | null = answer?.imageUrl || null;
            if (imageFile) {
                finalImageUrl = await uploadFile(`submission-images/${courseId}/${assignment.id}`, imageFile);
            } else if (!imagePreview) {
                finalImageUrl = null;
            }
            await onSaveAnswer(courseId, assignment.id, question.id, text, finalImageUrl);
            onClose();
        } catch (error) {
            console.error("Error saving answer:", error);
            alert("No se pudo guardar la respuesta.");
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b dark:border-gray-700">
                    <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{question.text}</p>
                </header>
                <div className="flex-1 p-6 overflow-y-auto">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Columna de Recursos */}
                        <div className="md:col-span-1">
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{resourceTitle}</h4>
                            {(resourceImages.length > 0 || resourceFiles.length > 0) ? (
                                <div className="space-y-2">
                                    {resourceImages.map((url, index) => (
                                        <button key={index} onClick={() => openImageViewer(url)} className="rounded-lg w-full overflow-hidden group border dark:border-gray-600">
                                            <img src={url} alt={`${assignment.title} resource ${index+1}`} className="w-full h-auto object-contain transition-transform group-hover:scale-105" />
                                        </button>
                                    ))}
                                    {resourceFiles.map(file => (
                                        <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                                            <IconPaperclip className="w-4 h-4"/> <span className="truncate">{file.name}</span>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-center p-4">
                                     <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                                        <IconClipboard className="w-10 h-10" />
                                        <p className="text-sm font-medium">Sin recursos</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Columna de Respuesta */}
                        <div className="md:col-span-2">
                             <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Tu Respuesta</h4>
                            <RichTextEditor value={text} onChange={setText} placeholder="Escribe tu respuesta aquí..." />
                            <div className="mt-4">
                                <label htmlFor="answer-image" className="block text-sm font-medium mb-2">Añadir imagen a tu respuesta (opcional)</label>
                                <input ref={fileInputRef} type="file" id="answer-image" accept="image/*" onChange={handleFileChange} className="input-style" />
                                {imagePreview && (
                                    <div className="relative w-40 h-40 mt-2 p-1 border rounded-md group">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded" />
                                        <button onClick={removeImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Eliminar imagen">
                                            <IconX className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <footer className="p-4 border-t dark:border-gray-700 flex justify-end gap-4">
                    <button onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="btn-primary">{isSaving ? 'Guardando...' : 'Guardar Respuesta'}</button>
                </footer>
            </div>
        </div>
    );
};

// TARJETA DE TAREA PARA ESTUDIANTE (REDISEÑADA)
const StudentAssignmentCard: React.FC<{ assignment: Assignment; user: User; courseId: string; onSaveAnswer: (courseId: string, assignmentId: string, questionId: string, answerText: string, answerImageUrl: string | null) => Promise<void> }> = ({ assignment, user, courseId, onSaveAnswer }) => {
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const { openImageViewer } = useAppContext();
    const userSubmission = assignment.submissions?.find(sub => sub.studentId === user.uid);
    
    return (
        <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{assignment.title}</h2>
            <p className="text-sm font-medium text-red-500">Fecha de entrega: {new Date(assignment.dueDate).toLocaleDateString()}</p>
            <div className="mt-2 text-gray-600 dark:text-dark-text rich-text-content" dangerouslySetInnerHTML={{ __html: assignment.description }}></div>

            <div className="mt-4 flex flex-col md:flex-row gap-6">
                 <div className="md:w-1/3 flex-shrink-0">
                     <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Recursos Generales</h4>
                    {assignment.imageUrls && assignment.imageUrls.length > 0 && (
                        <div className="space-y-2">
                        {assignment.imageUrls.map((url, index) => (
                             <button key={index} onClick={() => openImageViewer(url)} className="rounded-lg w-full h-48 overflow-hidden group">
                                <img src={url} alt={assignment.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            </button>
                        ))}
                        </div>
                    )}
                    {assignment.attachments && assignment.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {assignment.attachments.map((file) => (
                                <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                                    <IconPaperclip className="w-4 h-4" /> <span className="truncate">{file.name}</span>
                                </a>
                            ))}
                        </div>
                    )}
                    {(!assignment.imageUrls || assignment.imageUrls.length === 0) && (!assignment.attachments || assignment.attachments.length === 0) && (
                        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <IconClipboard className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                        </div>
                    )}
                </div>

                <div className="md:w-2/3">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">Preguntas:</h4>
                    <ul className="mt-2 space-y-2">
                        {assignment.questions.map(q => {
                            const answer = userSubmission?.answers.find(a => a.questionId === q.id);
                            return (
                                <li key={q.id}>
                                    <button onClick={() => setEditingQuestion(q)} className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center transition-colors">
                                        <span className="flex-grow pr-4">{q.text}</span>
                                        {answer ? <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0"/> : <IconPencil className="w-5 h-5 text-gray-400 flex-shrink-0"/>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
            {editingQuestion && (
                <AnswerQuestionModal
                    question={editingQuestion}
                    assignment={assignment}
                    courseId={courseId}
                    answer={userSubmission?.answers.find(a => a.questionId === editingQuestion.id)}
                    onClose={() => setEditingQuestion(null)}
                    onSaveAnswer={onSaveAnswer}
                />
            )}
        </div>
    );
};

const StudentView: React.FC<{ assignments: Assignment[], user: User, courseId: string, onSaveAnswer: AssignmentsModuleProps['onSaveAnswer'] }> = ({ assignments, user, courseId, onSaveAnswer }) => (
    <div className="space-y-6">
        {assignments.map(assignment => (
            <StudentAssignmentCard key={assignment.id} assignment={assignment} user={user} courseId={courseId} onSaveAnswer={onSaveAnswer} />
        ))}
    </div>
);

interface AssignmentsModuleProps {
    assignments: Assignment[];
    user: User;
    courseId: string;
    onAddAssignment: (assignment: Omit<Assignment, 'id' | 'submissions'>) => void;
    onUpdateAssignment: (assignment: Assignment) => void;
    onDeleteAssignment: (id: string) => void;
    onSaveAnswer: (courseId: string, assignmentId: string, questionId: string, answerText: string, answerImageUrl: string | null) => Promise<void>;
}

const AssignmentsModule: React.FC<AssignmentsModuleProps> = ({ assignments, user, courseId, onAddAssignment, onUpdateAssignment, onDeleteAssignment, onSaveAnswer }) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

    const handleOpenCreator = () => {
        setEditingAssignment(null);
        setIsEditorOpen(true);
    };

    const handleOpenEditor = (assignment: Assignment) => {
        setEditingAssignment(assignment);
        setIsEditorOpen(true);
    };
    
    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setEditingAssignment(null);
    };

    const handleSaveAssignment = async (assignmentData: Assignment | Omit<Assignment, 'id' | 'submissions'>, closeModal: boolean = true) => {
        if ('id' in assignmentData) {
            await onUpdateAssignment(assignmentData as Assignment);
        } else {
            await onAddAssignment(assignmentData as Omit<Assignment, 'id' | 'submissions'>);
        }
        if (closeModal) {
            handleCloseEditor();
        }
    };
    
    return (
        <div>
             {/* @ts-ignore */}
             <style jsx>{`
                .input-style { background-color: white; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem 0.75rem; width: 100%; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
                .dark .input-style { background-color: #1f2937; border-color: #4b5563; color: #d1d5db; }
                .btn-primary { padding: 0.5rem 1rem; font-weight: 500; color: white; background-color: var(--color-primary); border-radius: 0.375rem; }
                .btn-primary:hover { background-color: var(--color-primary-dark); }
                .btn-primary:disabled { background-color: var(--color-primary); opacity: 0.6; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; font-weight: 500; color: #374151; background-color: #e5e7eb; border-radius: 0.375rem; }
                .dark .btn-secondary { color: #d1d5db; background-color: #4b5563; }
            `}</style>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tareas</h1>
                {user.role === 'teacher' && (
                    <button onClick={handleOpenCreator} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">
                        <IconPlus className="w-5 h-5" />
                        Crear Tarea
                    </button>
                )}
            </div>
            
            <AssignmentEditorModal 
                key={editingAssignment ? editingAssignment.id : 'new-assignment'}
                isOpen={isEditorOpen} 
                onClose={handleCloseEditor} 
                onSaveAssignment={handleSaveAssignment} 
                assignmentToEdit={editingAssignment} 
            />

            {user.role === 'teacher' ? <TeacherView assignments={assignments} onEdit={handleOpenEditor} onDelete={onDeleteAssignment} /> : <StudentView assignments={assignments} user={user} courseId={courseId} onSaveAnswer={onSaveAnswer} />}
        </div>
    );
};

export default AssignmentsModule;
