import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { User, Assignment, Project, Course, Group } from '../types';
import { IconLink, IconUser, IconClipboard, IconProject, IconId, IconUsers, IconChevronDown, IconPlus, IconCheck, IconUserGroup, IconX, IconChatBubble } from './Icons';
import StudentChatViewer from './StudentChatViewer';

type ModalType = 'assignments' | 'projects' | 'groups' | 'addStudent';

interface ModalState {
    type: ModalType | null;
    user?: User | null;
    course?: Course | null;
}
type Item = Assignment | Project;


const AssignItemsModal: React.FC<{ student: User; items: Item[]; itemType: 'assignments' | 'projects'; onSetItemAssignment: (studentId: string, itemId: string, itemType: 'assignments' | 'projects', assign: boolean) => void; onClose: () => void;}> = ({ student, items, itemType, onSetItemAssignment, onClose }) => {
    
    const handleToggle = (itemId: string, isAssigned: boolean) => {
        onSetItemAssignment(student.uid, itemId, itemType, !isAssigned);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-1">Asignar {itemType === 'assignments' ? 'Tareas' : 'Proyectos'}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">para <span className="font-semibold">{student.name}</span></p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {items.map(item => {
                        const isAssigned = item.assignedTo?.includes(student.uid) ?? false;
                        return (
                             <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                                <label htmlFor={item.id} className="flex-grow cursor-pointer">{item.title}</label>
                                <input 
                                    type="checkbox" 
                                    id={item.id} 
                                    checked={isAssigned}
                                    onChange={() => handleToggle(item.id, isAssigned)}
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                            </div>
                        )
                    })}
                </div>
                 <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="btn-secondary">Hecho</button>
                </div>
            </div>
        </div>
    )
};

const AddStudentToCourseModal: React.FC<{
    course: Course;
    allUsers: User[];
    onAssignStudentToCourse: (studentId: string, courseId: string, assign: boolean) => Promise<void>;
    onClose: () => void;
}> = ({ course, allUsers, onAssignStudentToCourse, onClose }) => {
    const availableStudents = useMemo(() => {
        return allUsers.filter(u => u.role === 'student' && !u.courseIds?.includes(course.id));
    }, [allUsers, course.id]);
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-1">Añadir Estudiante a "{course.title}"</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Selecciona los estudiantes para inscribirlos en este curso.
                </p>
                <div className="space-y-2 max-h-80 overflow-y-auto border-t border-b py-2 my-2">
                    {availableStudents.length > 0 ? availableStudents.map(student => (
                        <div key={student.uid} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                            <div className="flex items-center gap-3">
                                <img src={student.avatarUrl} alt={student.name} className="w-8 h-8 rounded-full" />
                                <span>{student.name}</span>
                            </div>
                            <button
                                onClick={() => onAssignStudentToCourse(student.uid, course.id, true)}
                                className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 hover:bg-green-200"
                            >
                                Añadir
                            </button>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 py-4">Todos los estudiantes ya están inscritos en este curso.</p>
                    )}
                </div>
                <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="btn-primary flex items-center gap-2">
                        <IconCheck className="w-5 h-5" /> Hecho
                    </button>
                </div>
            </div>
        </div>
    );
};


const ManageGroupsModal: React.FC<{
    course: Course;
    students: User[];
    onClose: () => void;
    onCreateGroup: (courseId: string, groupName: string) => Promise<void>;
    onAssignStudentToGroup: (courseId: string, groupId: string, studentId: string) => Promise<void>;
    onRemoveStudentFromGroup: (courseId: string, studentId: string) => Promise<void>;
}> = ({ course, students, onClose, onCreateGroup, onAssignStudentToGroup, onRemoveStudentFromGroup }) => {
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [targetGroupId, setTargetGroupId] = useState('');
    
    const unassignedStudents = useMemo(() => {
        const assignedIds = new Set(course.groups?.flatMap(g => g.memberIds) || []);
        return students.filter(s => !assignedIds.has(s.uid));
    }, [course.groups, students]);
    
    const handleCreateGroup = async () => {
        if (newGroupName.trim()) {
            await onCreateGroup(course.id, newGroupName.trim());
            setNewGroupName('');
        }
    };
    
    const handleSelectionChange = (studentId: string) => {
        const newSelection = new Set(selectedStudents);
        if (newSelection.has(studentId)) {
            newSelection.delete(studentId);
        } else {
            newSelection.add(studentId);
        }
        setSelectedStudents(newSelection);
    };

    const handleAssign = async () => {
        if (!targetGroupId || selectedStudents.size === 0) return;
        const promises = Array.from(selectedStudents).map(studentId => 
            onAssignStudentToGroup(course.id, targetGroupId, studentId)
        );
        await Promise.all(promises);
        setSelectedStudents(new Set());
        setTargetGroupId('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-2xl font-bold">Gestionar Grupos: {course.title}</h2>
                </div>
                <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                    {/* Left: Unassigned students & assignment controls */}
                    <div className="flex flex-col gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h3 className="font-semibold mb-2">Asignar Estudiantes</h3>
                            <div className="flex items-center gap-2">
                                <select value={targetGroupId} onChange={e => setTargetGroupId(e.target.value)} className="input-style flex-grow">
                                    <option value="">Seleccionar grupo...</option>
                                    {course.groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                                <button onClick={handleAssign} disabled={!targetGroupId || selectedStudents.size === 0} className="btn-primary">Asignar</button>
                            </div>
                        </div>
                        <div className="flex-grow p-3 border dark:border-gray-700 rounded-lg">
                            <h3 className="font-semibold mb-2">Estudiantes sin Grupo ({unassignedStudents.length})</h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {unassignedStudents.map(s => (
                                    <label key={s.uid} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer">
                                        <input type="checkbox" checked={selectedStudents.has(s.uid)} onChange={() => handleSelectionChange(s.uid)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                        <img src={s.avatarUrl} className="w-8 h-8 rounded-full" />
                                        <span>{s.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Groups list & creation */}
                    <div className="flex flex-col gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h3 className="font-semibold mb-2">Crear Nuevo Grupo</h3>
                            <div className="flex items-center gap-2">
                                <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Nombre del grupo" className="input-style flex-grow" />
                                <button onClick={handleCreateGroup} className="btn-secondary"><IconPlus className="w-5 h-5"/></button>
                            </div>
                        </div>
                        <div className="flex-grow p-3 border dark:border-gray-700 rounded-lg">
                             <h3 className="font-semibold mb-2">Grupos Existentes ({course.groups?.length || 0})</h3>
                             <div className="space-y-3 max-h-96 overflow-y-auto">
                                {course.groups?.map(g => (
                                    <div key={g.id} className="p-2 border dark:border-gray-600 rounded-md">
                                        <p className="font-bold">{g.name}</p>
                                        <div className="pl-2 mt-1 space-y-1">
                                            {g.memberIds.map(mid => {
                                                const member = students.find(s => s.uid === mid);
                                                return (
                                                    <div key={mid} className="flex items-center justify-between text-sm">
                                                        <span>{member?.name || '...'}</span>
                                                        <button onClick={() => onRemoveStudentFromGroup(course.id, mid)} className="text-red-500 hover:text-red-700"><IconX className="w-4 h-4"/></button>
                                                    </div>
                                                )
                                            })}
                                            {g.memberIds.length === 0 && <p className="text-xs text-gray-500 italic">Vacío</p>}
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end">
                    <button onClick={onClose} className="btn-secondary">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

interface StudentCardProps {
    student: User;
    allUsers: User[];
    courseId: string;
    onOpenModal: (type: Exclude<ModalType, 'profile' | 'addStudent'>, student: User) => void;
    onAssignStudentToCourse: (studentId: string, courseId: string, assign: boolean) => void;
}
const StudentCard: React.FC<StudentCardProps> = ({ student, allUsers, courseId, onOpenModal, onAssignStudentToCourse }) => {
    const linkedGuardians = useMemo(() => {
        return (student.guardianIds || []).map(gid => allUsers.find(u => u.uid === gid)?.name).filter(Boolean);
    }, [student.guardianIds, allUsers]);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const handleRemoveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAssignStudentToCourse(student.uid, courseId, false);
    }

    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-4 flex flex-col text-center items-center relative">
             <button onClick={handleRemoveClick} className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-gray-600 rounded-full transition-colors" aria-label={`Remover a ${student.name} del curso`}>
                <IconX className="w-4 h-4" />
            </button>
            <img src={student.avatarUrl} alt={student.name} className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700 mb-3" />
            <h3 className="font-bold text-lg">{student.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{student.email}</p>
            <div className="text-xs text-gray-500 mb-4 h-8">
                {linkedGuardians.length > 0 ? (
                    <p>Rep: <span className="font-semibold">{linkedGuardians.join(', ')}</span></p>
                ) : <p className="italic">Sin representante</p>}
            </div>
            <div className="relative w-full mt-auto" ref={menuRef}>
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)} 
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
                >
                    Gestionar
                    <IconChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMenuOpen && (
                    <div className="absolute top-full mt-2 w-full bg-white dark:bg-dark-card border dark:border-gray-700 rounded-md shadow-lg z-10 text-left py-1">
                         <button onClick={() => { onOpenModal('assignments', student); setIsMenuOpen(false); }} className="dropdown-item">
                            <IconClipboard className="w-5 h-5 mr-3 text-gray-400"/> Asignar Tareas
                        </button>
                        <button onClick={() => { onOpenModal('projects', student); setIsMenuOpen(false); }} className="dropdown-item">
                            <IconProject className="w-5 h-5 mr-3 text-gray-400"/> Asignar Proyectos
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


interface ParticipantsModuleProps {
    user: User;
    allUsers: User[];
    allCourses: Course[];
    assignments: Assignment[];
    projects: Project[];
    onSetItemAssignment: (studentId: string, itemId: string, itemType: 'assignments' | 'projects', assign: boolean) => Promise<void>;
    onAssignStudentToCourse: (studentId: string, courseId: string, assign: boolean) => Promise<void>;
    onCreateGroup: (courseId: string, groupName: string) => Promise<void>;
    onAssignStudentToGroup: (courseId: string, groupId: string, studentId: string) => Promise<void>;
    onRemoveStudentFromGroup: (courseId: string, studentId: string) => Promise<void>;
    onApproveAvatar: (studentId: string, newAvatarUrl: string) => Promise<void>;
    onRejectAvatar: (studentId: string, pendingAvatarUrl: string) => Promise<void>;
}
const ParticipantsModule: React.FC<ParticipantsModuleProps> = (props) => {
    const { user, allUsers, allCourses, assignments, projects, onSetItemAssignment, onAssignStudentToCourse, onCreateGroup, onAssignStudentToGroup, onRemoveStudentFromGroup, onApproveAvatar, onRejectAvatar } = props;
    const [modalState, setModalState] = useState<ModalState>({ type: null });

    const { students, guardians } = useMemo(() => {
        const students = allUsers.filter(u => u.role === 'student');
        const guardians = allUsers.filter(u => u.role === 'guardian');
        return { students, guardians };
    }, [allUsers]);
    
    const pendingAvatarRequests = useMemo(() => {
        return allUsers.filter(u => u.role === 'student' && u.pendingAvatarUrl);
    }, [allUsers]);

    const handleOpenModal = (type: ModalType, user?: User, course?: Course) => {
        setModalState({ type, user, course });
    };
    
    const handleCloseModal = () => {
        setModalState({ type: null });
    };

    const renderModal = () => {
        if (!modalState.type) return null;
        
        switch(modalState.type) {
            case 'assignments':
                return modalState.user && <AssignItemsModal student={modalState.user} items={assignments} itemType="assignments" onSetItemAssignment={onSetItemAssignment} onClose={handleCloseModal} />;
            case 'projects':
                 return modalState.user && <AssignItemsModal student={modalState.user} items={projects} itemType="projects" onSetItemAssignment={onSetItemAssignment} onClose={handleCloseModal} />;
            case 'addStudent':
                return modalState.course && <AddStudentToCourseModal course={modalState.course} allUsers={allUsers} onAssignStudentToCourse={onAssignStudentToCourse} onClose={handleCloseModal} />;
            case 'groups':
                return modalState.course && <ManageGroupsModal course={modalState.course} students={students.filter(s => s.courseIds?.includes(modalState.course!.id))} onClose={handleCloseModal} onCreateGroup={onCreateGroup} onAssignStudentToGroup={onAssignStudentToGroup} onRemoveStudentFromGroup={onRemoveStudentFromGroup}/>
            default:
                return null;
        }
    };

    return (
        <div className="container mx-auto">
            {renderModal()}
            {/* @ts-ignore */}
            <style jsx>{`
                .input-style { background-color: white; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem 0.75rem; width: 100%; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
                .dark .input-style { background-color: #1f2937; border-color: #4b5563; color: #d1d5db; }
                .input-style:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary); }
                .btn-primary { padding: 0.5rem 1rem; font-weight: 500; color: white; background-color: var(--color-primary); border-radius: 0.375rem; }
                .btn-primary:hover { background-color: var(--color-primary-dark); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; background-color: var(--color-primary); }
                .btn-secondary { padding: 0.5rem 1rem; font-weight: 500; color: #374151; background-color: #e5e7eb; border-radius: 0.375rem; }
                .dark .btn-secondary { color: #d1d5db; background-color: #4b5563; }
                details > summary::-webkit-details-marker { display: none; }
                details[open] .details-open\\:rotate-180 { transform: rotate(180deg); }
                .dropdown-item { display: flex; align-items: center; width: 100%; padding: 0.75rem 1rem; font-size: 0.875rem; color: #374151; }
                .dark .dropdown-item { color: #d1d5db; }
                .dropdown-item:hover { background-color: #f3f4f6; }
                .dark .dropdown-item:hover { background-color: #374151; }
            `}</style>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestionar Participantes</h1>
            </div>

            {pendingAvatarRequests.length > 0 && (
                <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
                    <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200 mb-4">Solicitudes de Cambio de Foto Pendientes</h2>
                    <div className="space-y-4">
                        {pendingAvatarRequests.map(student => (
                            <div key={student.uid} className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-white dark:bg-dark-card rounded-lg shadow">
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <img src={student.avatarUrl} alt="Actual" className="w-16 h-16 rounded-full object-cover"/>
                                        <span className="text-xs text-gray-500">Actual</span>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                    <div className="text-center">
                                        <img src={student.pendingAvatarUrl} alt="Nueva" className="w-16 h-16 rounded-full object-cover"/>
                                        <span className="text-xs text-gray-500">Nueva</span>
                                    </div>
                                    <span className="font-semibold">{student.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onRejectAvatar(student.uid, student.pendingAvatarUrl!)} className="px-4 py-1.5 text-sm font-bold text-white bg-red-500 rounded-lg hover:bg-red-600">Rechazar</button>
                                    <button onClick={() => onApproveAvatar(student.uid, student.pendingAvatarUrl!)} className="px-4 py-1.5 text-sm font-bold text-white bg-green-500 rounded-lg hover:bg-green-600">Aprobar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="space-y-8">
                {allCourses.map(course => {
                    const courseStudents = students.filter(s => s.courseIds?.includes(course.id));
                    const studentsWithoutGroup = courseStudents.filter(student => 
                        !(course.groups || []).some(group => group.memberIds.includes(student.uid))
                    );
                    return (
                        <details key={course.id} className="bg-white dark:bg-dark-card rounded-xl shadow-md open:shadow-lg transition-shadow" open>
                            <summary className="p-4 font-semibold text-xl cursor-pointer flex justify-between items-center">
                                <span>{course.title}</span>
                                <div className="flex items-center gap-4">
                                     <button onClick={(e) => { e.stopPropagation(); handleOpenModal('groups', undefined, course); }} className="text-sm font-medium text-white bg-secondary hover:bg-green-600 px-3 py-1 rounded-md">Gestionar Grupos</button>
                                     <span className="text-sm font-normal bg-primary/10 text-primary px-3 py-1 rounded-full">{courseStudents.length} Estudiantes</span>
                                </div>
                            </summary>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-6">
                                <button onClick={() => handleOpenModal('addStudent', undefined, course)} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-primary/5 dark:hover:bg-primary/10">
                                    <IconPlus className="w-5 h-5" />
                                    Añadir Estudiante a este Curso
                                </button>
                                
                                {(course.groups || []).map(group => (
                                    <details key={group.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg" open>
                                        <summary className="px-4 py-2 font-semibold text-lg cursor-pointer flex justify-between items-center">
                                            <span><IconUserGroup className="w-5 h-5 inline-block mr-2" />{group.name}</span>
                                            <span className="text-xs font-normal bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{group.memberIds.length} miembros</span>
                                        </summary>
                                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                {group.memberIds.map(uid => {
                                                    const student = courseStudents.find(s => s.uid === uid);
                                                    return student ? <StudentCard key={uid} student={student} allUsers={allUsers} courseId={course.id} onOpenModal={(type, user) => handleOpenModal(type as Exclude<ModalType, 'profile' | 'addStudent'>, user)} onAssignStudentToCourse={onAssignStudentToCourse} /> : null;
                                                })}
                                            </div>
                                        </div>
                                    </details>
                                ))}
                                {studentsWithoutGroup.length > 0 && (
                                     <div>
                                        <h4 className="font-semibold text-lg text-gray-600 dark:text-gray-400 mb-2">Estudiantes sin Grupo</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                            {studentsWithoutGroup.map(s => <StudentCard key={s.uid} student={s} allUsers={allUsers} courseId={course.id} onOpenModal={(type, user) => handleOpenModal(type as Exclude<ModalType, 'profile' | 'addStudent'>, user)} onAssignStudentToCourse={onAssignStudentToCourse}/>)}
                                        </div>
                                     </div>
                                )}
                                {courseStudents.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">Aún no hay estudiantes en este curso.</p>
                                )}
                            </div>
                        </details>
                    );
                })}
            </div>

            <div className="mt-12">
                <details className="bg-white dark:bg-dark-card rounded-xl shadow-md open:shadow-lg transition-shadow">
                    <summary className="p-4 font-semibold text-lg cursor-pointer flex justify-between items-center">
                        Ver Lista de Representantes ({guardians.length})
                        <IconChevronDown className="w-5 h-5 transition-transform details-open:rotate-180"/>
                    </summary>
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                         <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                            {guardians.map(g => (
                                <div key={g.uid} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-white">{g.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{g.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-gray-500">Estudiantes:</p>
                                        {g.studentIds?.length ? (
                                            g.studentIds.map(sid => <p key={sid} className="text-sm text-secondary font-semibold">{allUsers.find(u=>u.uid===sid)?.name || '...'}</p>)
                                        ) : <p className="text-sm text-gray-400 italic">Ninguno</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </details>
            </div>
        </div>
    );
};

export default ParticipantsModule;