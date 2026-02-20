
import React, { useRef } from 'react';
import type { User, Course } from '../types';
import { IconLogout, IconMoon, IconSun, IconPencil } from './Icons';

interface HeaderProps {
  user: User;
  courses?: Course[];
  selectedCourseId?: string | null;
  onLogout: () => void;
  onToggleSidebar: () => void;
  theme: string;
  setTheme: (theme: string) => void;
  onUpdateAvatar: (file: File) => void;
  zoomLevel: number;
  onZoomChange: (newLevel: number) => void;
  isHighContrast: boolean;
  onToggleHighContrast: () => void;
  isGuestMode?: boolean;
}

const Header: React.FC<HeaderProps> = (props) => {
  const { user, onLogout, onToggleSidebar, theme, setTheme, onUpdateAvatar, isGuestMode, courses, selectedCourseId } = props;

  const roleSpanish = user.role === 'teacher' ? 'Profesor' : user.role === 'student' ? 'Estudiante' : 'Representante';
  const activeCourse = courses?.find(c => c.id === selectedCourseId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleAvatarClick = () => {
    if (isGuestMode) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpdateAvatar(file);
    }
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center w-1/4">
        <button
          onClick={onToggleSidebar}
          className="md:hidden mr-4 text-gray-500 dark:text-gray-400 focus:outline-none"
          aria-label="Abrir menú lateral"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
        {isGuestMode && (
          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded uppercase tracking-wider hidden sm:block">
            Modo Lectura
          </span>
        )}
      </div>

      {/* Center - Active Course */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        {activeCourse ? (
          <div className="flex flex-col items-center">
            <h2 className="font-bold text-lg text-gray-800 dark:text-white truncate max-w-[200px] sm:max-w-md leading-none">{activeCourse.title}</h2>
            {activeCourse.accessCode && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none">Código:</span>
                <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 select-all leading-none">{activeCourse.accessCode}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden sm:block text-sm text-gray-400 font-medium">
            Selecciona o crea un salón
          </div>
        )}
      </div>

      <div className="flex items-center justify-end space-x-2 sm:space-x-4 w-1/4">
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-500 rounded-full hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Cambiar tema"
        >
          {theme === 'light' ? <IconMoon className="w-6 h-6" /> : <IconSun className="w-6 h-6" />}
        </button>

        <div className="text-right hidden sm:block">
          <p className="font-semibold text-gray-800 dark:text-white">{user.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{isGuestMode ? 'Invitado' : roleSpanish}</p>
        </div>
        <div className={`relative group ${isGuestMode ? '' : 'cursor-pointer'}`}>
          {!isGuestMode && <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />}
          <img className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover" src={user.avatarUrl} alt="Avatar de usuario" />
          {!isGuestMode && (
            <button
              onClick={handleAvatarClick}
              className="absolute inset-0 w-full h-full bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-opacity duration-300"
              aria-label="Cambiar foto de perfil"
            >
              <IconPencil className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          )}
        </div>
        <button
          onClick={onLogout}
          className="p-2 text-gray-500 rounded-full hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={isGuestMode ? "Ir a Login" : "Cerrar sesión"}
        >
          <IconLogout className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};

export default Header;
