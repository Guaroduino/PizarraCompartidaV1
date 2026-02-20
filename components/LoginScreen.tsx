
import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from '../services/firebase';
import type { Role } from '../types';
import { IconFeed, IconLink } from './Icons';

interface LoginScreenProps {
  onEnterGuestMode: () => void;
  onJoinByCode: (code: string) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onEnterGuestMode, onJoinByCode }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'join'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [roomCode, setRoomCode] = useState('');

  const getFriendlyErrorMessage = (error: any) => {
      console.error("Login Error:", error);
      if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
          return "⚠️ CONFIGURACIÓN PENDIENTE: El acceso de invitados (Anónimo) está desactivado en Firebase. Habilítalo en la Consola de Firebase > Authentication > Sign-in method > Anonymous.";
      }
      if (error.code === 'auth/network-request-failed') {
          return "Error de conexión. Por favor, verifica tu internet.";
      }
      if (error.code === 'auth/invalid-credential') {
          return "Credenciales inválidas o expiradas.";
      }
      return error.message || "Ocurrió un error inesperado.";
  };

  const handleGuestLogin = async () => {
      setLoading(true);
      setError(null);
      try {
          await signInAnonymously(auth);
      } catch (error: any) {
          setError(getFriendlyErrorMessage(error));
      } finally {
          setLoading(false);
      }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!roomCode.trim()) return;
      setLoading(true);
      setError(null);
      try {
          // If not authenticated, sign in anonymously first
          if (!auth.currentUser) {
              await signInAnonymously(auth);
          }
          await onJoinByCode(roomCode.trim().toUpperCase());
      } catch (err: any) {
          setError(getFriendlyErrorMessage(err));
      } finally {
          setLoading(false);
      }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          name: user.displayName,
          email: user.email,
          role: 'student', 
          avatarUrl: user.photoURL,
          studentIds: [],
          guardianIds: [],
          courseIds: [],
          watchedCourseIds: [],
        });
      }
    } catch (error: any) {
      if (error.code === 'auth/unauthorized-domain') {
        setError(
          'Error: Dominio no autorizado.\n\n' +
          'Para solucionarlo, ve a tu Consola de Firebase > Authentication > Settings > Authorized domains y añade el dominio actual.'
        );
      } else {
        setError(getFriendlyErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (activeTab === 'signup') {
      try {
        if (!name || !email || !password) {
            throw new Error("Por favor, rellena todos los campos.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });
        
        await setDoc(doc(db, "users", user.uid), {
          name,
          email,
          role,
          avatarUrl: `https://i.pravatar.cc/150?u=${user.uid}`,
          studentIds: [],
          guardianIds: [],
          courseIds: [],
          watchedCourseIds: [],
        });
      } catch (error: any) {
        setError(getFriendlyErrorMessage(error));
      }
    } else { // Login
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error: any) {
        setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
      }
    }
    setLoading(false);
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-dark-bg px-4">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-white rounded-lg shadow-lg dark:bg-dark-card border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            <span className="text-primary">Pizarra Compartida</span>
          </h1>
          <p className="mt-2 text-gray-600 dark:text-dark-text">
            Colaboración visual y gestión de recursos
          </p>
        </div>
        
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setActiveTab('login')} className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === 'login' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>Iniciar Sesión</button>
          <button onClick={() => setActiveTab('signup')} className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === 'signup' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>Registrarse</button>
          <button onClick={() => setActiveTab('join')} className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === 'join' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'}`}>Unirse</button>
        </div>

        {activeTab === 'join' ? (
             <form onSubmit={handleJoinWithCode} className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Introduce el código compartido por tu profesor:</p>
                    <input 
                        type="text" 
                        placeholder="CÓDIGO (ej. ROBOT-123)" 
                        value={roomCode} 
                        onChange={e => setRoomCode(e.target.value.toUpperCase())} 
                        className="input-style text-center font-mono text-xl tracking-widest uppercase mb-4" 
                        required 
                    />
                    <button type="submit" disabled={loading} className="w-full px-4 py-3 font-bold text-white bg-primary rounded-lg hover:bg-primary-dark disabled:bg-primary/50 transition-colors flex items-center justify-center gap-2">
                        {loading ? 'Uniéndose...' : <><IconLink className="w-5 h-5"/> Entrar a la Sala</>}
                    </button>
                </div>
             </form>
        ) : (
            <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
            {activeTab === 'signup' && (
                <input type="text" placeholder="Nombre Completo" value={name} onChange={e => setName(e.target.value)} className="input-style" required />
            )}
            <input type="email" placeholder="Correo Electrónico" value={email} onChange={e => setEmail(e.target.value)} className="input-style" required />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} className="input-style" required />
            
            {activeTab === 'signup' && (
                <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tu Rol:</label>
                <div className="grid grid-cols-2 rounded-md shadow-sm">
                    <button type="button" onClick={() => setRole('student')} className={`px-4 py-2 text-sm font-medium rounded-l-md transition-colors ${role === 'student' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Estudiante</button>
                    <button type="button" onClick={() => setRole('guardian')} className={`px-4 py-2 text-sm font-medium rounded-r-md border-l border-gray-300 dark:border-gray-500 transition-colors ${role === 'guardian' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Representante</button>
                </div>
                </div>
            )}

            <button type="submit" disabled={loading} className="w-full px-4 py-3 font-bold text-white bg-primary rounded-lg hover:bg-primary-dark disabled:bg-primary/50 transition-colors">
                {loading ? 'Cargando...' : (activeTab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </button>
            </form>
        )}

        {error && <p className="text-sm text-red-600 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg border border-red-200 dark:border-red-800 whitespace-pre-wrap">{error}</p>}

        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-dark-card text-gray-500 dark:text-gray-400">O</span>
            </div>
        </div>

        <div className="space-y-3">
          <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
              <svg className="w-5 h-5 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.986,36.69,44,31.1,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
              Continuar con Google
          </button>

          <button 
            onClick={handleGuestLogin} 
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-dashed border-primary rounded-lg text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
              {loading ? 'Entrando...' : (
                  <>
                    <IconFeed className="w-5 h-5 mr-3" />
                    Entrar como Invitado (Pizarra Pública)
                  </>
              )}
          </button>
        </div>

         {/* @ts-ignore */}
        <style jsx>{`
            .input-style {
                background-color: white; border: 1px solid #d1d5db; color: #111827;
                border-radius: 0.375rem; padding: 0.75rem 1rem; width: 100%;
                box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            }
            .dark .input-style {
                background-color: #1f2937; border-color: #4b5563; color: #d1d5db;
            }
            .input-style:focus {
                outline: 2px solid transparent; outline-offset: 2px; border-color: var(--color-primary);
                box-shadow: 0 0 0 2px var(--color-primary);
            }
        `}</style>
      </div>
    </div>
  );
};

export default LoginScreen;
