
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, where } from "firebase/firestore";
import { db } from '../services/firebase';
import type { BillboardPost as PublicPost, User } from '../types';
import { IconFeed, IconPlus, IconTrash, IconPaperclip, IconX, IconDeviceFloppy, IconClipboardCopy, IconCheck, IconClock, IconUser } from './Icons';
import RichTextEditor from './RichTextEditor';
import { uploadFile } from '../services/storageService';

interface PublicFeedModuleProps {
    user: User | null;
    isGuestMode: boolean;
    courseId: string; // Added courseId prop
}

const PublicFeedModule: React.FC<PublicFeedModuleProps> = ({ user, isGuestMode, courseId }) => {
    const [posts, setPosts] = useState<PublicPost[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    
    // Editor state
    const [content, setContent] = useState('');
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

    const isTeacher = user?.role === 'teacher';

    useEffect(() => {
        if (!courseId) return;
        // Filter by courseId
        const q = query(collection(db, 'publicFeed'), where('courseId', '==', courseId), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicPost));
            setPosts(postsData);
        });
        return () => unsubscribe();
    }, [courseId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files) as File[];
            setImageFiles(prev => [...prev, ...files]);
            const newPreviews = files.map(f => URL.createObjectURL(f));
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        const newFiles = [...imageFiles];
        const newPreviews = [...imagePreviews];
        newFiles.splice(index, 1);
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews.splice(index, 1);
        setImageFiles(newFiles);
        setImagePreviews(newPreviews);
    };

    const handleSubmit = async () => {
        if (!content.trim() && imageFiles.length === 0) return;
        setIsPosting(true);

        try {
            const uploadPromises = imageFiles.map(file => uploadFile(`feed-images/${courseId}`, file));
            const imageUrls = await Promise.all(uploadPromises);

            await addDoc(collection(db, 'publicFeed'), {
                courseId, // Save with courseId
                authorId: user?.uid || 'guest',
                authorName: user?.name || 'Sistema',
                content,
                imageUrls,
                timestamp: new Date().toISOString()
            });

            // Reset
            setContent('');
            setImageFiles([]);
            setImagePreviews([]);
            setShowEditor(false);
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Error al publicar.");
        } finally {
            setIsPosting(false);
        }
    };

    const handleDelete = async (postId: string) => {
        if (!window.confirm("¿Seguro que quieres eliminar esta publicación?")) return;
        await deleteDoc(doc(db, 'publicFeed', postId));
    };

    const handleCopy = (htmlContent: string, postId: string) => {
        const type = "text/html";
        const blob = new Blob([htmlContent], { type });
        const data = [new ClipboardItem({ [type]: blob })];
        navigator.clipboard.write(data).then(() => {
            setCopiedPostId(postId);
            setTimeout(() => setCopiedPostId(null), 2000);
        });
    };

    return (
        <div className="w-full pb-10 p-6 h-full overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <IconFeed className="w-8 h-8 text-primary"/>
                        Cartelera del Salón
                    </h1>
                    <p className="text-gray-600 dark:text-dark-text mt-1">
                        Anuncios exclusivos para esta clase.
                    </p>
                </div>
                {isTeacher && !showEditor && (
                    <button 
                        onClick={() => setShowEditor(true)} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-all transform hover:scale-105"
                    >
                        <IconPlus className="w-5 h-5"/> Nuevo Anuncio
                    </button>
                )}
            </div>

            {isTeacher && showEditor && (
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl p-6 mb-10 border-2 border-primary/20">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Nuevo Anuncio</h2>
                        <button onClick={() => setShowEditor(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                            <IconX className="w-6 h-6"/>
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <RichTextEditor 
                            value={content}
                            onChange={setContent}
                            placeholder="Comparte información importante, retos semanales o noticias..."
                        />
                        
                        <div>
                            <p className="text-sm font-medium mb-2">Imágenes adjuntas:</p>
                            <div className="flex flex-wrap gap-3">
                                {imagePreviews.map((url, idx) => (
                                    <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                                        <img src={url} className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                                        >
                                            <IconX className="w-4 h-4"/>
                                        </button>
                                    </div>
                                ))}
                                <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary transition-colors">
                                    <IconPaperclip className="w-6 h-6 text-gray-400"/>
                                    <span className="text-[10px] mt-1 text-gray-500">Añadir</span>
                                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button onClick={() => setShowEditor(false)} className="px-6 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 font-medium">Cancelar</button>
                            <button 
                                onClick={handleSubmit} 
                                disabled={isPosting || (!content.trim() && imageFiles.length === 0)}
                                className="px-8 py-2 bg-primary text-white font-bold rounded-lg shadow hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
                            >
                                {isPosting ? <IconClock className="w-5 h-5 animate-spin" /> : <IconDeviceFloppy className="w-5 h-5" />}
                                {isPosting ? "Publicando..." : "Publicar Ahora"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {posts.length > 0 ? posts.map(post => (
                    <article key={post.id} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                        <header className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <IconUser className="w-6 h-6 text-primary"/>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white leading-tight">{post.authorName}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <IconClock className="w-3 h-3"/>
                                        {new Date(post.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleCopy(post.content, post.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                        copiedPostId === post.id 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                        : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                                    }`}
                                >
                                    {copiedPostId === post.id ? <IconCheck className="w-4 h-4"/> : <IconClipboardCopy className="w-4 h-4"/>}
                                    {copiedPostId === post.id ? '¡Copiado!' : 'Copiar Contenido'}
                                </button>
                                {isTeacher && (
                                    <button 
                                        onClick={() => handleDelete(post.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                        title="Eliminar publicación"
                                    >
                                        <IconTrash className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </header>
                        
                        <div className="p-6">
                            <div 
                                className="rich-text-content prose dark:prose-invert max-w-none" 
                                dangerouslySetInnerHTML={{ __html: post.content }}
                            />
                            
                            {post.imageUrls.length > 0 && (
                                <div className={`mt-6 grid gap-4 ${post.imageUrls.length === 1 ? 'grid-cols-1' : post.imageUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
                                    {post.imageUrls.map((url, i) => (
                                        <div key={i} className="rounded-xl overflow-hidden border dark:border-gray-700 shadow-sm group">
                                            <img 
                                                src={url} 
                                                alt={`Adjunto ${i+1}`} 
                                                className="w-full h-auto max-h-[500px] object-contain bg-gray-50 dark:bg-black/20 group-hover:scale-[1.02] transition-transform duration-300" 
                                                loading="lazy"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </article>
                )) : (
                    <div className="text-center py-20 bg-white dark:bg-dark-card rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <IconFeed className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"/>
                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Cartelera vacía</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xs mx-auto">
                            {isTeacher ? 'Crea tu primer anuncio para compartir con la comunidad.' : 'Aún no hay anuncios publicados en la cartelera.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicFeedModule;
