
import React, { useState, useMemo, useRef } from 'react';
import type { Quiz, User, QuizQuestion, QuizSubmission, QuizQuestionType, QuizAnswer } from '../types';
import { IconPlus, IconTrash, IconPencil, IconCheck, IconX, IconClock, IconDeviceFloppy, IconQuestionMarkCircle, IconChevronRight, IconPaperclip, IconPlay } from './Icons';
import { uploadFile } from '../services/storageService';
import { useAppContext } from '../contexts/AppContext';

// --- MODAL EDITOR DE CUESTIONARIOS ---
interface QuizEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (quiz: Omit<Quiz, 'id' | 'submissions'> | Quiz) => Promise<void>;
    quizToEdit?: Quiz | null;
}

const QuizEditorModal: React.FC<QuizEditorModalProps> = ({ isOpen, onClose, onSave, quizToEdit }) => {
    const isEditMode = !!quizToEdit;
    const initialData: Omit<Quiz, 'id' | 'submissions'> = {
        title: '',
        description: '',
        dueDate: '',
        questions: [],
        status: 'draft',
    };
    
    const [quiz, setQuiz] = useState(isEditMode ? { ...quizToEdit } : initialData);
    const [isSaving, setIsSaving] = useState(false);

    const handleDataChange = (field: 'title' | 'description' | 'dueDate', value: string) => {
        setQuiz(prev => ({ ...prev, [field]: value }));
    };

    const addQuestion = () => {
        const newQuestion: QuizQuestion = {
            id: `q_${Date.now()}`,
            text: '',
            type: 'multiple-choice',
            options: ['', '', '', ''],
            correctAnswerIndex: 0,
        };
        setQuiz(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }));
    };
    
    const removeQuestion = (qIndex: number) => {
        setQuiz(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== qIndex) }));
    };
    
    const handleQuestionTextChange = (qIndex: number, text: string) => {
        const newQuestions = [...quiz.questions];
        newQuestions[qIndex].text = text;
        setQuiz(prev => ({ ...prev, questions: newQuestions }));
    };

    const handleQuestionTypeChange = (qIndex: number, type: QuizQuestionType) => {
        const newQuestions = [...quiz.questions];
        newQuestions[qIndex].type = type;
        // Reset/Initialize options if switching to multiple-choice
        if (type === 'multiple-choice' && !newQuestions[qIndex].options) {
            newQuestions[qIndex].options = ['', '', '', ''];
            newQuestions[qIndex].correctAnswerIndex = 0;
        }
        setQuiz(prev => ({ ...prev, questions: newQuestions }));
    };
    
    const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
        const newQuestions = [...quiz.questions];
        if (newQuestions[qIndex].options) {
            newQuestions[qIndex].options![optIndex] = text;
            setQuiz(prev => ({ ...prev, questions: newQuestions }));
        }
    };
    
    const handleCorrectAnswerChange = (qIndex: number, optIndex: number) => {
        const newQuestions = [...quiz.questions];
        newQuestions[qIndex].correctAnswerIndex = optIndex;
        setQuiz(prev => ({ ...prev, questions: newQuestions }));
    };

    const handleSubmit = async (status: 'published' | 'draft') => {
        if (status === 'published') {
            if (!quiz.title.trim() || !quiz.dueDate) {
                alert("Por favor, introduce un título y una fecha de entrega antes de publicar.");
                return;
            }
            if (quiz.questions.some(q => !q.text.trim())) {
                alert("Asegúrate de que todas las preguntas tengan texto.");
                return;
            }
            if (quiz.questions.some(q => q.type === 'multiple-choice' && q.options?.some(o => !o.trim()))) {
                alert("Asegúrate de que todas las opciones de las preguntas de selección múltiple estén completas.");
                return;
            }
        }
        setIsSaving(true);
        await onSave({ ...quiz, status });
        setIsSaving(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">{isEditMode ? 'Editar Cuestionario' : 'Crear Nuevo Cuestionario'}</h2>
                    <button onClick={onClose}><IconX className="w-6 h-6"/></button>
                </header>
                <main className="flex-grow p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Título</label>
                            <input type="text" value={quiz.title} onChange={e => handleDataChange('title', e.target.value)} className="input-style text-lg"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Fecha de Entrega</label>
                            <input type="date" value={quiz.dueDate.split('T')[0]} onChange={e => handleDataChange('dueDate', new Date(e.target.value).toISOString())} className="input-style"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Descripción</label>
                        <textarea value={quiz.description} onChange={e => handleDataChange('description', e.target.value)} rows={2} className="input-style"/>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Preguntas</h3>
                        {quiz.questions.map((q, qIndex) => (
                            <div key={q.id} className="p-4 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-grow space-y-2">
                                            <input 
                                                type="text" 
                                                value={q.text} 
                                                onChange={e => handleQuestionTextChange(qIndex, e.target.value)} 
                                                placeholder={`Pregunta ${qIndex + 1}`} 
                                                className="input-style font-semibold"
                                            />
                                            <select 
                                                value={q.type} 
                                                onChange={e => handleQuestionTypeChange(qIndex, e.target.value as QuizQuestionType)}
                                                className="input-style text-sm w-full md:w-auto"
                                            >
                                                <option value="multiple-choice">Selección Múltiple</option>
                                                <option value="text">Respuesta de Texto</option>
                                                <option value="image-text">Imagen + Texto</option>
                                                <option value="audio">Audio</option>
                                                <option value="video">Video (Max 25MB)</option>
                                                <option value="link">Enlace URL</option>
                                            </select>
                                        </div>
                                        <button onClick={() => removeQuestion(qIndex)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><IconTrash className="w-5 h-5"/></button>
                                    </div>

                                    {q.type === 'multiple-choice' && (
                                        <div className="mt-2 space-y-2 ml-2 border-l-2 border-gray-300 dark:border-gray-600 pl-3">
                                            <p className="text-xs text-gray-500">Marca la respuesta correcta:</p>
                                            {q.options?.map((opt, optIndex) => (
                                                <div key={optIndex} className="flex items-center gap-2">
                                                    <input type="radio" name={`correct_q${qIndex}`} checked={q.correctAnswerIndex === optIndex} onChange={() => handleCorrectAnswerChange(qIndex, optIndex)} className="h-4 w-4 text-primary focus:ring-primary"/>
                                                    <input type="text" value={opt} onChange={e => handleOptionChange(qIndex, optIndex, e.target.value)} placeholder={`Opción ${optIndex + 1}`} className="input-style text-sm py-1"/>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {q.type !== 'multiple-choice' && (
                                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-300 italic">
                                            {q.type === 'video' && "Los estudiantes podrán subir un video de hasta 25MB."}
                                            {q.type === 'audio' && "Los estudiantes podrán subir un archivo de audio."}
                                            {q.type === 'image-text' && "Los estudiantes subirán una imagen y escribirán una descripción."}
                                            {q.type === 'text' && "Los estudiantes escribirán una respuesta de texto libre."}
                                            {q.type === 'link' && "Los estudiantes enviarán un enlace web."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <button onClick={addQuestion} className="btn-secondary text-sm w-full border-dashed border-2 flex justify-center items-center gap-2 py-3 hover:border-primary hover:text-primary">
                            <IconPlus className="w-5 h-5"/> Añadir Pregunta
                        </button>
                    </div>
                </main>
                <footer className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={() => handleSubmit('draft')} disabled={isSaving} className="btn-secondary flex items-center gap-2"><IconDeviceFloppy className="w-5 h-5"/> Guardar Borrador</button>
                    <button onClick={() => handleSubmit('published')} disabled={isSaving} className="btn-primary">{isSaving ? 'Guardando...' : 'Publicar'}</button>
                </footer>
            </div>
        </div>
    );
};

// --- MODAL PARA REALIZAR CUESTIONARIO ---
interface QuizTakerModalProps {
    quiz: Quiz;
    onClose: () => void;
    onSubmit: (answers: (QuizAnswer | null)[]) => Promise<void>;
}

const QuizTakerModal: React.FC<QuizTakerModalProps> = ({ quiz, onClose, onSubmit }) => {
    const [answers, setAnswers] = useState<(QuizAnswer | null)[]>(Array(quiz.questions.length).fill(null));
    const [uploadingMap, setUploadingMap] = useState<Map<number, boolean>>(new Map());

    const handleMultipleChoiceChange = (qIndex: number, optIndex: number) => {
        const newAnswers = [...answers];
        newAnswers[qIndex] = optIndex;
        setAnswers(newAnswers);
    };

    const handleTextChange = (qIndex: number, text: string) => {
        const newAnswers = [...answers];
        const current = newAnswers[qIndex] as any; // Could be string or object depending on history, safeguard
        if (typeof current === 'object' && current !== null && 'fileUrl' in current) {
             newAnswers[qIndex] = { ...current, text };
        } else {
             newAnswers[qIndex] = text;
        }
        setAnswers(newAnswers);
    };

    const handleLinkChange = (qIndex: number, url: string) => {
        const newAnswers = [...answers];
        newAnswers[qIndex] = url;
        setAnswers(newAnswers);
    };

    const handleFileUpload = async (qIndex: number, file: File) => {
        if (!file) return;
        
        const questionType = quiz.questions[qIndex].type;
        if (questionType === 'video' && file.size > 25 * 1024 * 1024) {
            alert("El video supera el límite de 25MB.");
            return;
        }

        const newUploading = new Map(uploadingMap);
        newUploading.set(qIndex, true);
        setUploadingMap(newUploading);

        try {
            const url = await uploadFile(`quiz-submissions/${quiz.id}/${qIndex}`, file);
            const newAnswers = [...answers];
            
            if (questionType === 'image-text') {
                const current = newAnswers[qIndex] as any || {};
                newAnswers[qIndex] = { text: current.text || '', fileUrl: url };
            } else {
                newAnswers[qIndex] = { fileUrl: url };
            }
            setAnswers(newAnswers);
        } catch (e) {
            console.error(e);
            alert("Error al subir el archivo.");
        } finally {
            const finishUploading = new Map(uploadingMap);
            finishUploading.delete(qIndex);
            setUploadingMap(finishUploading);
        }
    };

    const handleSubmit = () => {
        if (uploadingMap.size > 0) {
            alert("Por favor espera a que terminen de subirse los archivos.");
            return;
        }
        if (answers.some(a => a === null || a === '')) {
            if (!window.confirm("No has respondido todas las preguntas. ¿Quieres enviar de todas formas?")) {
                return;
            }
        }
        onSubmit(answers);
    };
    
    const isUploadingAny = uploadingMap.size > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b dark:border-gray-700">
                    <h2 className="text-2xl font-bold">{quiz.title}</h2>
                    <p className="text-sm text-gray-500">{quiz.description}</p>
                </header>
                <main className="flex-grow p-6 space-y-8 overflow-y-auto">
                    {quiz.questions.map((q, qIndex) => (
                        <div key={q.id} className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <p className="font-semibold mb-3 text-lg">{qIndex + 1}. {q.text}</p>
                            
                            {/* Multiple Choice */}
                            {q.type === 'multiple-choice' && (
                                <div className="space-y-2">
                                    {q.options?.map((opt, optIndex) => (
                                        <label key={optIndex} className="flex items-center gap-3 p-3 bg-white dark:bg-dark-card border dark:border-gray-600 rounded-md cursor-pointer hover:border-primary transition-colors">
                                            <input 
                                                type="radio" 
                                                name={`q_${qIndex}`} 
                                                checked={answers[qIndex] === optIndex}
                                                onChange={() => handleMultipleChoiceChange(qIndex, optIndex)} 
                                                className="h-5 w-5 text-primary focus:ring-primary"
                                            />
                                            <span>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Text Answer */}
                            {q.type === 'text' && (
                                <textarea 
                                    className="input-style w-full" 
                                    rows={4} 
                                    placeholder="Escribe tu respuesta aquí..."
                                    value={answers[qIndex] as string || ''}
                                    onChange={e => handleTextChange(qIndex, e.target.value)}
                                />
                            )}

                            {/* Link Answer */}
                            {q.type === 'link' && (
                                <input 
                                    type="url" 
                                    className="input-style w-full" 
                                    placeholder="https://..."
                                    value={answers[qIndex] as string || ''}
                                    onChange={e => handleLinkChange(qIndex, e.target.value)}
                                />
                            )}

                            {/* File Uploads (Audio, Video, Image+Text) */}
                            {(q.type === 'audio' || q.type === 'video' || q.type === 'image-text') && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-4">
                                        <label className="btn-secondary cursor-pointer flex items-center gap-2">
                                            <IconPaperclip className="w-5 h-5"/> 
                                            {uploadingMap.get(qIndex) ? 'Subiendo...' : `Subir ${q.type === 'image-text' ? 'Imagen' : q.type}`}
                                            <input 
                                                type="file" 
                                                accept={q.type === 'video' ? 'video/*' : q.type === 'audio' ? 'audio/*' : 'image/*'}
                                                className="hidden"
                                                onChange={e => e.target.files && handleFileUpload(qIndex, e.target.files[0])}
                                                disabled={uploadingMap.get(qIndex)}
                                            />
                                        </label>
                                        {(answers[qIndex] as any)?.fileUrl && <span className="text-green-500 text-sm flex items-center gap-1"><IconCheck className="w-4 h-4"/> Archivo subido</span>}
                                    </div>
                                    
                                    {q.type === 'image-text' && (
                                        <textarea 
                                            className="input-style w-full mt-2" 
                                            rows={3} 
                                            placeholder="Escribe una descripción para tu imagen..."
                                            value={(answers[qIndex] as any)?.text || ''}
                                            onChange={e => {
                                                const current = answers[qIndex] as any || {};
                                                const newAnswers = [...answers];
                                                newAnswers[qIndex] = { ...current, text: e.target.value };
                                                setAnswers(newAnswers);
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </main>
                <footer className="p-4 border-t dark:border-gray-700 flex justify-between items-center">
                    <p className="text-sm text-gray-600">{answers.filter(a => a !== null && a !== '').length} / {quiz.questions.length} respondidas</p>
                    <div>
                        <button onClick={onClose} className="btn-secondary mr-2" disabled={isUploadingAny}>Cancelar</button>
                        <button onClick={handleSubmit} className="btn-primary" disabled={isUploadingAny}>{isUploadingAny ? 'Subiendo archivos...' : 'Enviar Cuestionario'}</button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

// --- MODAL DE RESULTADOS ---
interface QuizResultsModalProps {
    quiz: Quiz;
    onClose: () => void;
}

const QuizResultsModal: React.FC<QuizResultsModalProps> = ({ quiz, onClose }) => {
    const { openImageViewer } = useAppContext();

    const renderAnswer = (question: QuizQuestion, answer: QuizAnswer | null) => {
        if (answer === null || answer === undefined) return <span className="text-gray-400 italic">Sin respuesta</span>;

        if (question.type === 'multiple-choice') {
            const optIndex = answer as number;
            const isCorrect = optIndex === question.correctAnswerIndex;
            const optionText = question.options ? question.options[optIndex] : '';
            return (
                <div className={isCorrect ? "text-green-600 font-medium" : "text-red-600"}>
                    {optionText} {isCorrect ? <IconCheck className="w-4 h-4 inline"/> : `(Correcta: ${question.options![question.correctAnswerIndex!]})`}
                </div>
            );
        }

        if (question.type === 'text') {
            return <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 bg-white dark:bg-dark-card p-2 rounded border dark:border-gray-600">{answer as string}</p>;
        }

        if (question.type === 'link') {
            return <a href={answer as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{answer as string}</a>;
        }

        const mediaAnswer = answer as { text?: string; fileUrl?: string };
        
        return (
            <div className="space-y-2">
                {mediaAnswer.fileUrl && (
                    <div className="border p-2 rounded dark:border-gray-600 bg-black/5">
                        {question.type === 'video' && <video src={mediaAnswer.fileUrl} controls className="max-w-full max-h-64 rounded" />}
                        {question.type === 'audio' && <audio src={mediaAnswer.fileUrl} controls className="w-full" />}
                        {(question.type === 'image-text') && (
                            <button onClick={() => openImageViewer(mediaAnswer.fileUrl!)}>
                                <img src={mediaAnswer.fileUrl} alt="Respuesta" className="max-h-48 rounded object-contain" />
                            </button>
                        )}
                    </div>
                )}
                {mediaAnswer.text && <p className="whitespace-pre-wrap text-sm mt-2">{mediaAnswer.text}</p>}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Resultados de: {quiz.title}</h2>
                    <button onClick={onClose}><IconX className="w-6 h-6"/></button>
                </header>
                <main className="flex-grow p-6 overflow-y-auto">
                    {quiz.submissions.length === 0 ? (
                        <p className="text-center text-gray-500">Nadie ha respondido este cuestionario todavía.</p>
                    ) : (
                        <div className="divide-y dark:divide-gray-700">
                            {quiz.submissions.map(sub => (
                                <details key={sub.studentId} className="py-4 group">
                                    <summary className="flex justify-between items-center cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded">
                                        <div className="flex items-center gap-2">
                                            <IconChevronRight className="w-5 h-5 transition-transform group-open:rotate-90"/>
                                            <span className="font-semibold">{sub.studentName}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-gray-500">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                                            <span className={`font-bold text-lg ${sub.score >= 70 ? 'text-green-500' : 'text-yellow-500'}`}>{sub.score}% <span className="text-xs font-normal text-gray-400">(Auto)</span></span>
                                        </div>
                                    </summary>
                                    <div className="mt-4 pl-8 space-y-6 border-l-2 border-gray-200 dark:border-gray-700 ml-4">
                                        {quiz.questions.map((q, qIndex) => (
                                            <div key={q.id}>
                                                <p className="font-bold text-sm text-gray-500 mb-1">Pregunta {qIndex + 1} ({q.type})</p>
                                                <p className="mb-2">{q.text}</p>
                                                {renderAnswer(q, sub.answers[qIndex])}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL DEL MÓDULO ---
interface QuizzesModuleProps {
    quizzes: Quiz[];
    user: User;
    courseId: string;
    onAddQuiz: (quiz: Omit<Quiz, 'id' | 'submissions'>) => Promise<void>;
    onUpdateQuiz: (quiz: Quiz) => Promise<void>;
    onDeleteQuiz: (quizId: string) => Promise<void>;
    onSubmitQuiz: (quizId: string, answers: (QuizAnswer|null)[]) => Promise<void>;
}

const QuizzesModule: React.FC<QuizzesModuleProps> = (props) => {
    const { quizzes, user, onAddQuiz, onUpdateQuiz, onDeleteQuiz, onSubmitQuiz } = props;
    
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
    const [viewingResults, setViewingResults] = useState<Quiz | null>(null);

    const handleOpenCreator = () => {
        setEditingQuiz(null);
        setIsEditorOpen(true);
    };

    const handleOpenEditor = (quiz: Quiz) => {
        setEditingQuiz(quiz);
        setIsEditorOpen(true);
    };

    const handleSaveQuiz = async (quizData: Omit<Quiz, 'id'|'submissions'> | Quiz) => {
        if ('id' in quizData) {
            await onUpdateQuiz(quizData as Quiz);
        } else {
            await onAddQuiz(quizData);
        }
    };
    
    const userSubmissions = useMemo(() => {
        const map = new Map<string, QuizSubmission>();
        quizzes.forEach(q => {
            const sub = q.submissions.find(s => s.studentId === user.uid);
            if (sub) map.set(q.id, sub);
        });
        return map;
    }, [quizzes, user.uid]);


    const isTeacher = user.role === 'teacher';

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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3"><IconQuestionMarkCircle className="w-8 h-8"/> Cuestionarios</h1>
                {isTeacher && (
                    <button onClick={handleOpenCreator} className="btn-primary flex items-center gap-2">
                        <IconPlus className="w-5 h-5" />
                        Crear Cuestionario
                    </button>
                )}
            </div>
            
            <QuizEditorModal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} onSave={handleSaveQuiz} quizToEdit={editingQuiz}/>
            {takingQuiz && <QuizTakerModal quiz={takingQuiz} onClose={() => setTakingQuiz(null)} onSubmit={(answers) => onSubmitQuiz(takingQuiz.id, answers).then(() => setTakingQuiz(null))} />}
            {viewingResults && <QuizResultsModal quiz={viewingResults} onClose={() => setViewingResults(null)} />}

            <div className="space-y-4">
                {quizzes.length > 0 ? quizzes.map(q => {
                    const submission = userSubmissions.get(q.id);
                    return (
                        <div key={q.id} className="bg-white dark:bg-dark-card p-4 rounded-lg shadow-md flex justify-between items-center">
                            <div className="flex-grow">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-lg text-primary">{q.title}</h3>
                                    {isTeacher && q.status === 'draft' && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Borrador</span>}
                                </div>
                                <p className="text-sm text-gray-500">Entrega: {new Date(q.dueDate).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {isTeacher ? (
                                    <>
                                        <button onClick={() => setViewingResults(q)} className="btn-secondary text-sm">Resultados ({q.submissions.length})</button>
                                        <button onClick={() => handleOpenEditor(q)} className="p-2 hover:bg-gray-100 rounded-full"><IconPencil className="w-5 h-5"/></button>
                                        <button onClick={() => onDeleteQuiz(q.id)} className="p-2 hover:bg-gray-100 rounded-full"><IconTrash className="w-5 h-5 text-red-500"/></button>
                                    </>
                                ) : (
                                    submission ? (
                                        <div className="text-center">
                                            <p className="text-sm">Calificación:</p>
                                            <p className={`font-bold text-xl ${submission.score >= 70 ? 'text-green-500' : 'text-yellow-500'}`}>{submission.score}%</p>
                                        </div>
                                    ) : (
                                        <button onClick={() => setTakingQuiz(q)} className="btn-primary flex items-center gap-2">
                                            Realizar Cuestionario <IconChevronRight className="w-5 h-5"/>
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    );
                }) : (
                     <div className="text-center py-10 bg-white dark:bg-dark-card rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400">No hay cuestionarios disponibles en este momento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizzesModule;
