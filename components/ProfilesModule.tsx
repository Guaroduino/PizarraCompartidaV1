import React, { useState, useMemo } from 'react';
import type { User } from '../types';
import { IconId, IconLink, IconPencil, IconChatBubble } from './Icons';
import StudentChatViewer from './StudentChatViewer';

// Moved from ParticipantsModule.tsx
const AssignGuardianModal: React.FC<{ student: User; allUsers: User[]; onLinkUser: (studentId: string, guardianId: string, link: boolean) => void; onClose: () => void; }> = ({ student, allUsers, onLinkUser, onClose }) => {
    const guardians = useMemo(() => allUsers.filter(u => u.role === 'guardian'), [allUsers]);
    const linkedGuardianIds = useMemo(() => new Set(student.guardianIds || []), [student.guardianIds]);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
        <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-1">Asignar Representante</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">para <span className="font-semibold">{student.name}</span></p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {guardians.map(g => (
                    <div key={g.uid} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <span>{g.name}</span>
                        <button onClick={() => onLinkUser(student.uid, g.uid, !linkedGuardianIds.has(g.uid))} className={`px-3 py-1 text-xs font-bold rounded-full ${linkedGuardianIds.has(g.uid) ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                            {linkedGuardianIds.has(g.uid) ? 'Desvincular' : 'Vincular'}
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex justify-end mt-6">
                <button onClick={onClose} className="px-4 py-2 font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cerrar</button>
            </div>
        </div>
      </div>
    );
};


interface ProfilesModuleProps {
    user: User;
    allUsers: User[];
    onLinkUser: (studentId: string, guardianId: string, link: boolean) => Promise<void>;
    onEditStudent: (student: User) => void;
}

const ProfilesModule: React.FC<ProfilesModuleProps> = ({ user, allUsers, onLinkUser, onEditStudent }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'students' | 'guardians'>('students');
    const [assigningGuardianTo, setAssigningGuardianTo] = useState<User | null>(null);
    const [viewingStudentChat, setViewingStudentChat] = useState<User | null>(null);


    const { students, guardians } = useMemo(() => {
        const filteredUsers = allUsers.filter(u => 
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return {
            students: filteredUsers.filter(u => u.role === 'student'),
            guardians: filteredUsers.filter(u => u.role === 'guardian'),
        };
    }, [allUsers, searchTerm]);
    
    interface UserCardProps {
      user: User;
      type: 'student' | 'guardian';
      onViewChat: (user: User) => void;
    }

    const UserCard: React.FC<UserCardProps> = ({ user, type, onViewChat }) => {
        const linkedUsers = type === 'student'
            ? (user.guardianIds || []).map(gid => allUsers.find(u => u.uid === gid))
            : (user.studentIds || []).map(sid => allUsers.find(u => u.uid === sid));

        return (
            <div className="bg-white dark:bg-dark-card p-4 rounded-lg shadow-md flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <img src={user.avatarUrl} alt={user.name} className="w-20 h-20 rounded-full object-cover flex-shrink-0"/>
                <div className="flex-grow text-center sm:text-left">
                    <h4 className="font-bold text-lg">{user.name}</h4>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="mt-2">
                        <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{type === 'student' ? 'Representantes' : 'Estudiantes'}:</h5>
                        <div className="flex flex-wrap gap-1 mt-1 justify-center sm:justify-start">
                            {linkedUsers.length > 0 ? linkedUsers.map(linked => linked ? (
                                <span key={linked.uid} className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{linked.name}</span>
                            ) : null) : (
                                <span className="text-xs italic text-gray-500">Ninguno</span>
                            )}
                        </div>
                    </div>
                </div>
                {type === 'student' && (
                    <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                        <button onClick={() => onEditStudent(user)} className="btn-secondary flex items-center justify-center gap-2">
                            <IconPencil className="w-4 h-4" /> Editar Perfil
                        </button>
                        <button onClick={() => setAssigningGuardianTo(user)} className="btn-primary flex items-center justify-center gap-2">
                            <IconLink className="w-4 h-4" /> Asignar Rep.
                        </button>
                        <button onClick={() => onViewChat(user)} className="btn-green flex items-center justify-center gap-2">
                            <IconChatBubble className="w-4 h-4" /> Ver Chat
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (viewingStudentChat) {
        return <StudentChatViewer student={viewingStudentChat} onClose={() => setViewingStudentChat(null)} />;
    }

    return (
        <div className="container mx-auto">
            {assigningGuardianTo && (
                <AssignGuardianModal 
                    student={assigningGuardianTo}
                    allUsers={allUsers}
                    onLinkUser={onLinkUser}
                    onClose={() => setAssigningGuardianTo(null)}
                />
            )}
            
            <div className="flex items-center gap-3 mb-6">
                <IconId className="w-8 h-8 text-primary"/>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Perfiles</h1>
            </div>

            <p className="mb-6 text-gray-600 dark:text-dark-text max-w-3xl">
                Esta sección te permite gestionar la información detallada y las relaciones entre estudiantes y representantes de forma global. 
                Cualquier cambio o vinculación que realices aquí se aplicará en toda la plataforma.
            </p>

            <div className="sticky top-0 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-sm py-4 mb-4 z-10">
                <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                        type="text"
                        placeholder="Buscar por nombre o correo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input-style flex-grow"
                    />
                    <div className="flex-shrink-0 grid grid-cols-2 rounded-md shadow-sm border dark:border-gray-700">
                        <button onClick={() => setActiveTab('students')} className={`tab-button rounded-l-md ${activeTab === 'students' ? 'active' : ''}`}>Estudiantes ({students.length})</button>
                        <button onClick={() => setActiveTab('guardians')} className={`tab-button rounded-r-md border-l dark:border-gray-700 ${activeTab === 'guardians' ? 'active' : ''}`}>Representantes ({guardians.length})</button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {activeTab === 'students' && students.map(s => <UserCard key={s.uid} user={s} type="student" onViewChat={setViewingStudentChat} />)}
                {activeTab === 'guardians' && guardians.map(g => <UserCard key={g.uid} user={g} type="guardian" onViewChat={setViewingStudentChat} />)}
            </div>
            
             {/* @ts-ignore */}
             <style jsx>{`
                .input-style { background-color: white; border: 1px solid #d1d5db; border-radius: 0.375rem; padding: 0.5rem 1rem; width: 100%; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
                .dark .input-style { background-color: #1f2937; border-color: #4b5563; color: #d1d5db; }
                .btn-primary { padding: 0.5rem 1rem; font-weight: 500; font-size: 0.875rem; color: white; background-color: var(--color-primary); border-radius: 0.375rem; }
                .btn-secondary { padding: 0.5rem 1rem; font-weight: 500; font-size: 0.875rem; color: #374151; background-color: #e5e7eb; border-radius: 0.375rem; }
                .dark .btn-secondary { color: #d1d5db; background-color: #4b5563; }
                .btn-green { padding: 0.5rem 1rem; font-weight: 500; font-size: 0.875rem; color: white; background-color: var(--color-secondary); border-radius: 0.375rem; }
                .btn-green:hover { background-color: #059669; }
                .tab-button { padding: 0.5rem 1rem; font-weight: 500; transition: background-color 0.2s; }
                .tab-button.active { background-color: var(--color-primary); color: white; }
            `}</style>
        </div>
    );
};

export default ProfilesModule;