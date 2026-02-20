
import React, { useState, useMemo, useEffect } from 'react';
import { onAuthStateChanged, signOut, updateProfile, signInAnonymously, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot, collection, updateDoc, query, where, getDocs, arrayUnion, setDoc, getDoc, addDoc, deleteDoc, writeBatch } from "firebase/firestore";

import type { User, Course, NewCourse } from './types';
import { auth, db } from './services/firebase';
import { AppContext } from './contexts/AppContext';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ImageViewer from './components/ImageViewer';
import CreateCourseModal from './components/CreateCourseModal';
import { uploadFile } from './services/storageService';
import PublicFeedModule from './components/PublicFeedModule';
import WhiteboardModule from './components/WhiteboardModule';
import ClipboardModule from './components/ClipboardModule';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGuestMode, setIsGuestMode] = useState(false);

    // App State
    const [activeView, setActiveView] = useState('whiteboard');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);

    // Data State
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    // Theme & Accessibility
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [zoomLevel, setZoomLevel] = useState(Number(localStorage.getItem('zoomLevel')) || 100);
    const [isHighContrast, setHighContrast] = useState(localStorage.getItem('highContrast') === 'true');
    const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);

    // --- Auth & User Data ---
    useEffect(() => {
        let unsubscribeUser: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            // Limpiar el listener de usuario anterior si cambia la cuenta
            if (unsubscribeUser) {
                unsubscribeUser();
                unsubscribeUser = undefined;
            }

            const params = new URLSearchParams(window.location.search);
            const roomCode = params.get('room');

            if (firebaseUser) {
                setIsGuestMode(firebaseUser.isAnonymous);
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const userData = { uid: docSnap.id, ...docSnap.data() } as User;
                        setUser(userData);
                    } else {
                        // Create profile for new user (Google or Anonymous)
                        const randomId = Math.floor(1000 + Math.random() * 9000);
                        const newUser = {
                            uid: firebaseUser.uid,
                            name: firebaseUser.displayName || `Invitado ${randomId}`,
                            email: firebaseUser.email || '',
                            role: 'student',
                            avatarUrl: firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`
                        } as User;
                        setUser(newUser);
                        setDoc(userDocRef, newUser, { merge: true });
                    }
                    setLoading(false);
                });
            } else {
                // NO USER LOGGED IN
                if (roomCode) {
                    try {
                        await signInAnonymously(auth);
                    } catch (error) {
                        console.error("Error auto-joining as guest:", error);
                        setLoading(false);
                    }
                } else {
                    setUser(null);
                    setLoading(false);
                }
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUser) unsubscribeUser();
        };
    }, []);

    // --- Fetch Courses ---
    useEffect(() => {
        if (!user) {
            setCourses([]);
            return;
        }

        let q;
        if (user.role === 'teacher') {
            // Teacher sees courses they created
            q = query(collection(db, 'courses'), where('teacherId', '==', user.uid));
        } else {
            // Students see courses they are enrolled in
            if (user.courseIds && user.courseIds.length > 0) {
                q = query(collection(db, 'courses'), where('__name__', 'in', user.courseIds.slice(0, 10))); // Firestore limits 'in' to 10
            } else {
                setCourses([]);
                return;
            }
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
            setCourses(coursesData);
        });
        return () => unsubscribe();
    }, [user]);

    // Handle Join by URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const roomCode = params.get('room');

        if (roomCode && !loading && user) {
            handleJoinCourseByCode(roomCode).then((course) => {
                if (course) {
                    setSelectedCourseId(course.id);
                }
            }).catch(console.error);
        }
    }, [user, loading]);

    // --- Handlers ---

    const handleAddCourse = async (newCourse: NewCourse) => {
        if (!user || user.role !== 'teacher') return;
        try {
            const courseData = {
                ...newCourse,
                teacherId: user.uid,
                teacherName: user.name,
                content: [],
                assignments: [],
                quizzes: [],
                projects: [],
                createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, 'courses'), courseData);
            setIsCreateCourseModalOpen(false);
            setSelectedCourseId(docRef.id); // Auto select new room
        } catch (error) {
            console.error("Error creating course:", error);
            alert("Error al crear la sala.");
        }
    };

    const handleJoinCourseByCode = async (code: string) => {
        if (!auth.currentUser) throw new Error("Debes iniciar sesión para unirte.");

        const q = query(collection(db, 'courses'), where('accessCode', '==', code));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn("No se encontró ninguna sala con ese código.");
            return null;
        }

        const courseDoc = querySnapshot.docs[0];
        const courseId = courseDoc.id;

        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { courseIds: arrayUnion(courseId) });

        return { id: courseId, ...courseDoc.data() } as Course;
    };

    // --- COURSE MANAGEMENT (DELETE / EXPORT / IMPORT) ---

    const handleDeleteCourse = async (courseId: string) => {
        if (!window.confirm("¿Estás seguro de eliminar este salón permanentemente? Esta acción no se puede deshacer.")) return;
        try {
            // Delete main doc. Subcollections are technically orphaned but inaccessible.
            // In a real app, use Cloud Functions to recursively delete.
            await deleteDoc(doc(db, 'courses', courseId));
            if (selectedCourseId === courseId) setSelectedCourseId(null);
        } catch (error) {
            console.error("Error deleting course:", error);
            alert("Error al eliminar el salón.");
        }
    };

    const handleExportCourse = async (course: Course) => {
        try {
            const courseId = course.id;

            // 1. Fetch Subcollections
            // Note: Whiteboards are root collection "whiteboardBoards" linked by courseId
            const [boardsSnap, publicFeedSnap] = await Promise.all([
                getDocs(query(collection(db, 'whiteboardBoards'), where('courseId', '==', courseId))),
                getDocs(query(collection(db, 'publicFeed'), where('courseId', '==', courseId))),
            ]);

            const boards = boardsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const publicFeed = publicFeedSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const exportData = {
                version: 1,
                type: 'steam-course-export',
                courseInfo: { ...course },
                boards: boards,
                publicFeed: publicFeed,
            };

            const blob = new Blob([JSON.stringify(exportData)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Salon-${course.title.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error exporting course:", error);
            alert("Error al exportar el salón.");
        }
    };

    const handleImportCourse = async (file: File) => {
        if (!user || user.role !== 'teacher') return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (data.type !== 'steam-course-export' || !data.courseInfo) {
                throw new Error("Formato de archivo inválido.");
            }

            const confirmImport = window.confirm(`¿Importar salón "${data.courseInfo.title}"?`);
            if (!confirmImport) return;

            setLoading(true); // Show loading UI

            // 1. Create New Course Doc
            const { id: oldId, ...courseData } = data.courseInfo;

            const newCourseData = {
                ...courseData,
                title: `${courseData.title} (Importado)`,
                teacherId: user.uid,
                teacherName: user.name,
                accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(), // New code
                createdAt: new Date().toISOString()
            };

            const newCourseRef = await addDoc(collection(db, 'courses'), newCourseData);
            const newCourseId = newCourseRef.id;

            // Helper to split array into chunks
            const chunkArray = (arr: any[], size: number) =>
                Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                    arr.slice(i * size, i * size + size)
                );

            // 2. Re-create Whiteboards (Root Collection)
            if (data.boards && Array.isArray(data.boards)) {
                const batches = chunkArray(data.boards, 500);
                for (const chunk of batches) {
                    const batch = writeBatch(db);
                    chunk.forEach((board: any) => {
                        const { id: oldBoardId, ...boardData } = board;
                        const newBoardRef = doc(collection(db, 'whiteboardBoards'));
                        batch.set(newBoardRef, {
                            ...boardData,
                            courseId: newCourseId, // Link to new course
                            timestamp: Date.now()
                        });
                    });
                    await batch.commit();
                }
            }

            // 3. Re-create Public Feed (Root Collection)
            if (data.publicFeed && Array.isArray(data.publicFeed)) {
                const batches = chunkArray(data.publicFeed, 500);
                for (const chunk of batches) {
                    const batch = writeBatch(db);
                    chunk.forEach((post: any) => {
                        const { id: oldPostId, ...postData } = post;
                        const newPostRef = doc(collection(db, 'publicFeed'));
                        batch.set(newPostRef, {
                            ...postData,
                            courseId: newCourseId,
                            timestamp: new Date().toISOString()
                        });
                    });
                    await batch.commit();
                }
            }

            alert("Salón importado con éxito.");
            setSelectedCourseId(newCourseId);

        } catch (error) {
            console.error("Error importing course:", error);
            alert("Error al importar el salón. Verifica el archivo.");
        } finally {
            setLoading(false);
        }
    };

    const handleCleanupGuests = async () => {
        if (!user || user.role !== 'teacher') return;

        const confirmCleanup = window.confirm(
            "¿Estás seguro de eliminar a TODOS los usuarios invitados (sin correo electrónico)?\n\n" +
            "Esta acción eliminará sus perfiles de la base de datos para limpiar la lista de participantes. " +
            "Esto es útil para eliminar usuarios duplicados o inactivos."
        );
        if (!confirmCleanup) return;

        try {
            setLoading(true);
            const usersRef = collection(db, 'users');
            // Query for users with empty email (guests)
            const q = query(usersRef, where('email', '==', ''));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert("No se encontraron usuarios invitados para limpiar.");
                setLoading(false);
                return;
            }

            // Process in batches of 500 (Firestore Limit)
            const batchSize = 500;
            const chunks = [];
            for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                chunks.push(snapshot.docs.slice(i, i + batchSize));
            }

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }

            alert(`Se han eliminado ${snapshot.size} perfiles de invitados correctamente.`);
        } catch (error) {
            console.error("Error cleaning up guests:", error);
            alert("Hubo un error al limpiar los usuarios.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAvatar = async (file: File) => {
        if (!user || !auth.currentUser) return;
        try {
            const newAvatarUrl = await uploadFile(`avatars/${user.uid}`, file);
            await updateProfile(auth.currentUser, { photoURL: newAvatarUrl });
            await updateDoc(doc(db, 'users', user.uid), { avatarUrl: newAvatarUrl });
        } catch (error) { console.error(error); }
    };

    const handleLogout = () => {
        signOut(auth);
        setIsGuestMode(false);
        setSelectedCourseId(null);
        window.history.replaceState({}, '', window.location.pathname);
    };

    // --- Render ---

    const renderActiveView = () => {
        if (!selectedCourseId) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50 dark:bg-gray-900/50">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Selecciona un Salón</h2>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md">
                        {user?.role === 'teacher'
                            ? 'Crea o selecciona un salón del menú lateral para comenzar la clase.'
                            : 'Elige un salón del menú lateral para unirte a la clase.'}
                    </p>
                    {user?.role === 'teacher' && (
                        <button
                            onClick={() => setIsCreateCourseModalOpen(true)}
                            className="mt-6 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                        >
                            Crear Nuevo Salón
                        </button>
                    )}
                </div>
            );
        }

        const selectedCourse = courses.find(c => c.id === selectedCourseId);
        if (!selectedCourse && courses.length > 0) return <div className="p-8">Cargando salón...</div>;

        switch (activeView) {
            case 'whiteboard':
                return <WhiteboardModule user={user} isGuestMode={isGuestMode} courseId={selectedCourseId} />;
            case 'public-feed':
                return <PublicFeedModule user={user} isGuestMode={isGuestMode} courseId={selectedCourseId} />;
            case 'clipboard':
                return <ClipboardModule user={user} isGuestMode={isGuestMode} courseId={selectedCourseId} />;
            case 'content':
                return <div className="p-8 text-center text-gray-500">Configuración del Salón (Próximamente)</div>;
            default:
                return <WhiteboardModule user={user} isGuestMode={isGuestMode} courseId={selectedCourseId} />;
        }
    };

    if (loading) return (
        <div className="flex flex-col h-screen items-center justify-center bg-gray-900 text-white gap-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium opacity-80">Entrando al salón...</p>
        </div>
    );

    if (!user && !isGuestMode) return <LoginScreen onEnterGuestMode={() => { setIsGuestMode(true); setActiveView('whiteboard'); }} onJoinByCode={async (code) => { await handleJoinCourseByCode(code); }} />;

    return (
        <AppContext.Provider value={{ openImageViewer: setImageViewerUrl }}>
            <div className="flex h-screen bg-light-bg dark:bg-[#121212] text-gray-800 dark:text-gray-200 overflow-hidden font-sans">

                <Sidebar
                    activeView={activeView}
                    setActiveView={setActiveView}
                    isOpen={isSidebarOpen}
                    setIsOpen={setSidebarOpen}
                    userRole={isGuestMode ? 'guest' : user!.role}
                    courses={courses}
                    selectedCourseId={selectedCourseId}
                    onSelectCourse={setSelectedCourseId}
                    onCreateCourse={() => setIsCreateCourseModalOpen(true)}
                    onLogout={handleLogout}
                    onDeleteCourse={handleDeleteCourse}
                    onExportCourse={handleExportCourse}
                    onImportCourse={handleImportCourse}
                    onCleanupGuests={handleCleanupGuests}
                />

                <div className="flex-1 flex flex-col h-full w-full relative">
                    <Header
                        user={isGuestMode ? { name: 'Invitado', role: 'student', avatarUrl: 'https://i.pravatar.cc/150?u=guest' } as User : user!}
                        onLogout={handleLogout}
                        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
                        theme={theme}
                        setTheme={(t) => { setTheme(t); localStorage.setItem('theme', t); document.documentElement.classList.toggle('dark', t === 'dark'); }}
                        onUpdateAvatar={handleUpdateAvatar}
                        zoomLevel={zoomLevel}
                        onZoomChange={setZoomLevel}
                        isHighContrast={isHighContrast}
                        onToggleHighContrast={() => setHighContrast(!isHighContrast)}
                        isGuestMode={isGuestMode}
                        courses={courses}
                        selectedCourseId={selectedCourseId}
                    />

                    <main className="flex-1 overflow-hidden relative">
                        {renderActiveView()}
                    </main>
                </div>
            </div>

            <CreateCourseModal
                isOpen={isCreateCourseModalOpen}
                onClose={() => setIsCreateCourseModalOpen(false)}
                onAddCourse={handleAddCourse}
            />

            {imageViewerUrl && <ImageViewer imageUrl={imageViewerUrl} onClose={() => setImageViewerUrl(null)} />}
        </AppContext.Provider>
    );
};

export default App;
