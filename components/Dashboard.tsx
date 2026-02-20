
import React from 'react';
import type { User, Course } from '../types';
import { IconBook, IconClipboard, IconProject, IconUsers, IconUser, IconLink, IconCheck } from './Icons';

interface CourseCardProps {
    course: Course;
    userRole: 'teacher' | 'student' | 'guardian';
    studentCount: number;
    teacherName?: string;
    teacherAvatarUrl?: string;
    onSelectCourse: (courseId: string) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, userRole, studentCount, teacherName, teacherAvatarUrl, onSelectCourse }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopyInvite = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}?room=${course.accessCode}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg flex flex-col overflow-hidden transition-transform hover:scale-105 duration-300 relative group">
            <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-primary">{course.title}</h3>
                    {course.accessCode && (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clave</span>
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono font-bold select-all text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                {course.accessCode}
                            </span>
                        </div>
                    )}
                </div>
                
                {teacherName && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                        {teacherAvatarUrl ? (
                            <img src={teacherAvatarUrl} alt={teacherName} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <IconUser className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </div>
                        )}
                        <span>Profesor: {teacherName}</span>
                    </div>
                )}
                <p className="text-sm text-gray-600 dark:text-dark-text mb-4 h-16 overflow-hidden line-clamp-3">{course.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300 mt-auto">
                    <div className="flex items-center gap-2">
                        <IconBook className="w-4 h-4 text-secondary" />
                        <span>{course.content?.length || 0} Unidades</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <IconClipboard className="w-4 h-4 text-secondary" />
                        <span>{course.assignments?.length || 0} Tareas</span>
                    </div>
                    {userRole === 'teacher' && (
                        <div className="flex items-center gap-2 col-span-2">
                            <IconUsers className="w-4 h-4 text-secondary" />
                            <span>{studentCount} Estudiantes</span>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 flex gap-2">
                <button 
                    onClick={() => onSelectCourse(course.id)}
                    className="flex-1 px-4 py-2 font-bold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors text-sm"
                >
                    {userRole === 'teacher' ? 'Gestionar Sala' : 'Entrar a Sala'}
                </button>
                {course.accessCode && (
                    <button 
                        onClick={handleCopyInvite}
                        className={`px-3 py-2 rounded-lg border transition-colors flex items-center justify-center ${copied ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                        title="Copiar enlace de invitación"
                    >
                        {copied ? <IconCheck className="w-5 h-5"/> : <IconLink className="w-5 h-5"/>}
                    </button>
                )}
            </div>
        </div>
    );
};


interface DashboardProps {
    user: User;
    allCourses: Course[];
    allUsers: User[];
    setSelectedCourseId: (id: string) => void;
    setActiveView: (view: string) => void;
    onClaimLegacyCourses: () => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ user, allCourses, allUsers, setSelectedCourseId, setActiveView, onClaimLegacyCourses }) => {
    
    const handleSelectCourse = (courseId: string) => {
        setSelectedCourseId(courseId);
        setActiveView('content'); // Navigate to content view after selection
    };

    return (
        <div className="container mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900 dark:text-white">¡Bienvenido de nuevo, {user.name}!</h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-dark-text mb-8">
                {user.role === 'teacher' ? 'Gestiona tus salas y cursos desde aquí.' : 'Aquí tienes tus salas asignadas.'}
            </p>

            {allCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {allCourses.map(course => {
                        const studentCount = user.role === 'teacher' 
                            ? allUsers.filter(u => u.role === 'student' && u.courseIds?.includes(course.id)).length 
                            : 0;
                        
                        const teacher = allUsers.find(u => u.uid === course.teacherId);
                        
                        return (
                           <CourseCard 
                                key={course.id}
                                course={course}
                                userRole={user.role}
                                studentCount={studentCount}
                                teacherName={teacher?.name || course.teacherName}
                                teacherAvatarUrl={teacher?.avatarUrl}
                                onSelectCourse={handleSelectCourse}
                           />
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-dark-card rounded-xl shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                        {user.role === 'teacher' ? 'Aún no has creado ninguna sala' : 'No estás inscrito en ninguna sala'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-lg mx-auto">
                        {user.role === 'teacher' ? 'Crea tu primera sala desde el menú lateral para empezar.' : 'Pide el Código de Sala a tu profesor para unirte.'}
                    </p>
                    {user.role === 'teacher' && (
                        <div className="mt-6">
                            <button onClick={onClaimLegacyCourses} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                                Reclamar Cursos Antiguos
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
