


import { useState, useEffect, useRef } from 'react';
import { 
    collection, query, onSnapshot, addDoc, doc, updateDoc, writeBatch, deleteDoc, where, orderBy, setDoc, getDocs 
} from "firebase/firestore";
import { db } from '../services/firebase';
import type { User, WhiteboardBoard, WhiteboardLayer, WhiteboardStroke, WhiteboardImage, WhiteboardText, WhiteboardPage, GridConfig, LibraryClass } from '../types';
import type { WhiteboardSnapshot } from '../types/whiteboardTypes';

export const useWhiteboardSync = (user: User | null, isTeacher: boolean, courseId: string, isFollowingTeacher: boolean = true) => {
    const [boards, setBoards] = useState<WhiteboardBoard[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string>('');
    const [pages, setPages] = useState<WhiteboardPage[]>([]);
    const [activePageId, setActivePageId] = useState<string>('');
    const [courseTitle, setCourseTitle] = useState<string>(''); 
    const [courseCode, setCourseCode] = useState<string>(''); 
    
    // Estado global de sincronización (controlado por el profesor via Firestore)
    const [syncEnabled, setSyncEnabled] = useState<boolean>(true);

    const [layers, setLayers] = useState<WhiteboardLayer[]>([]);
    const [activeLayerId, setActiveLayerId] = useState<string>('');
    
    // Ref to track active layer inside listeners without re-triggering them
    const activeLayerIdRef = useRef(activeLayerId);
    
    const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
    const [images, setImages] = useState<WhiteboardImage[]>([]);
    const [texts, setTexts] = useState<WhiteboardText[]>([]);
    const [snapshots, setSnapshots] = useState<WhiteboardSnapshot[]>([]);
    
    const [boardSettings, setBoardSettings] = useState({ 
        bgColor: '#ffffff', 
        bgImageUrl: null as string | null, 
        width: 1920, 
        height: 1080,
        grid: {
            enabled: false,
            teacherOnly: true,
            minor: { spacing: 20, color: '#e5e7eb', opacity: 0.5 },
            medium: { spacing: 100, color: '#9ca3af', opacity: 0.5 },
            major: { spacing: 500, color: '#374151', opacity: 0.5 }
        } as GridConfig
    });
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingBoards, setIsLoadingBoards] = useState(true);

    // Sync Ref
    useEffect(() => {
        activeLayerIdRef.current = activeLayerId;
    }, [activeLayerId]);

    // 1. Sync Course Data (Title, Active Selection & Sync Status)
    useEffect(() => {
        if (!courseId) return;
        const unsub = onSnapshot(doc(db, 'courses', courseId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setCourseTitle(data.title || '');
                setCourseCode(data.accessCode || '');
                
                // Actualizar estado de sincronización global
                // Si no existe el campo, asumimos true por defecto
                const isEnabled = data.syncEnabled !== false; 
                setSyncEnabled(isEnabled);

                // Lógica Estricta para Estudiantes:
                // Solo sincronizamos si el profesor tiene syncEnabled = true Y el estudiante quiere seguir (isFollowingTeacher)
                if (!isTeacher && isEnabled && isFollowingTeacher) {
                    if (data.activeBoardId) setActiveBoardId(data.activeBoardId);
                    if (data.activePageId) setActivePageId(data.activePageId);
                }
            }
        });
        return () => unsub();
    }, [isTeacher, courseId, isFollowingTeacher]);

    // 2. Sync Boards List (Filtered by Course)
    useEffect(() => {
        if (!courseId) {
            setBoards([]);
            return;
        }
        setIsLoadingBoards(true);
        const q = query(
            collection(db, 'whiteboardBoards'), 
            where('courseId', '==', courseId), 
            orderBy('timestamp', 'asc')
        );
        const unsub = onSnapshot(q, (snap) => {
            const bData = snap.docs.map(d => ({ id: d.id, ...d.data() } as WhiteboardBoard));
            setBoards(bData);
            setIsLoadingBoards(false);
        });
        return () => unsub();
    }, [courseId]);

    // 2.5 Auto-selection and Initialization Logic
    useEffect(() => {
        if (isLoadingBoards) return;

        if (boards.length > 0) {
            // Ensure activeBoardId is valid for the current list
            if (!activeBoardId || !boards.find(b => b.id === activeBoardId)) {
                setActiveBoardId(boards[0].id);
            }
        } else if (isTeacher && courseId) {
            // If no boards exist for this course, create a default one
            createBoard('Clase Principal');
        }
    }, [boards, activeBoardId, isTeacher, courseId, isLoadingBoards]);

    // 3. Sync Active Board Settings
    useEffect(() => {
        if (!activeBoardId || boards.length === 0) return;
        const currentBoard = boards.find(b => b.id === activeBoardId);
        if (currentBoard) {
            setBoardSettings({
                bgColor: (currentBoard as any).bgColor || '#ffffff',
                bgImageUrl: (currentBoard as any).bgImageUrl || null,
                width: Number((currentBoard as any).width) || 1920,
                height: Number((currentBoard as any).height) || 1080,
                grid: (currentBoard as any).grid || {
                    enabled: false,
                    teacherOnly: true,
                    minor: { spacing: 20, color: '#e5e7eb', opacity: 0.5 },
                    medium: { spacing: 100, color: '#9ca3af', opacity: 0.5 },
                    major: { spacing: 500, color: '#374151', opacity: 0.5 }
                }
            });
        }
    }, [activeBoardId, boards]);

    // 4. Sync Pages for Active Board
    useEffect(() => {
        if (!activeBoardId) return;
        const q = query(collection(db, 'whiteboardPages'), where('boardId', '==', activeBoardId), orderBy('order', 'asc'));
        const unsub = onSnapshot(q, async (snap) => {
            const pData = snap.docs.map(d => ({ id: d.id, ...d.data() } as WhiteboardPage));
            setPages(pData);
            
            // Auto-select first page if none selected
            if (pData.length > 0) {
                // If student is NOT synced, they might be lost, rely on local logic or manual nav
                if (!activePageId || !pData.find(p => p.id === activePageId)) {
                    // Force sync if teacher or sync enabled
                    if (isTeacher || syncEnabled) setActivePageIdGlobal(pData[0].id);
                    else setActivePageId(pData[0].id);
                }
            } else if (isTeacher && pData.length === 0 && !snap.metadata.hasPendingWrites) {
                // Initialize default page
                await addDoc(collection(db, 'whiteboardPages'), {
                    boardId: activeBoardId, order: 0
                });
            }
        });
        return () => unsub();
    }, [activeBoardId, isTeacher, syncEnabled]); // Re-run if sync status changes

    // 5. Sync Layers
    useEffect(() => {
        if (!activeBoardId) return;
        const q = query(collection(db, 'whiteboardLayers'), where('boardId', '==', activeBoardId));
        const unsub = onSnapshot(q, s => {
            const layerData = s.docs.map(d => ({ id: d.id, ...d.data() } as WhiteboardLayer)).sort((a, b) => b.order - a.order);
            setLayers(layerData);
            
            // Use Ref to check current selection to avoid stale closures/resetting selection on reorder
            const currentSelectionId = activeLayerIdRef.current;
            const selectionExists = layerData.find(l => l.id === currentSelectionId);

            if (layerData.length > 0) {
                // Only force selection if we have NO selection, or the previous selection was deleted
                if (!currentSelectionId || !selectionExists) {
                    setActiveLayerId(layerData[0].id);
                }
            } else if (layerData.length === 0 && isTeacher && !s.metadata.hasPendingWrites) {
                // Initialize default layer
                addDoc(collection(db, 'whiteboardLayers'), {
                    boardId: activeBoardId, name: 'Capa Base', order: 0, visible: true, opacity: 1
                });
            }
        });
        return () => unsub();
    }, [activeBoardId, isTeacher]);

    // 6. Sync Content (Filtered by Active Page)
    useEffect(() => {
        if (!activeBoardId || !activePageId) {
            setStrokes([]); setImages([]); setTexts([]);
            return;
        }

        const qS = query(collection(db, 'whiteboardStrokes'), where('pageId', '==', activePageId));
        const qI = query(collection(db, 'whiteboardImages'), where('pageId', '==', activePageId));
        const qT = query(collection(db, 'whiteboardTexts'), where('pageId', '==', activePageId));
        
        const unsubS = onSnapshot(qS, s => setStrokes(s.docs.map(d => ({ id: d.id, ...d.data() } as WhiteboardStroke))));
        const unsubI = onSnapshot(qI, s => setImages(s.docs.map(d => ({ id: d.id, ...d.data() } as WhiteboardImage))));
        const unsubT = onSnapshot(qT, s => setTexts(s.docs.map(d => ({ id: d.id, ...d.data() } as WhiteboardText))));
        
        let unsubSnap: any = () => {};
        if (isTeacher && user) {
            const qSnap = query(collection(db, 'whiteboardSnapshots'), where('teacherId', '==', user.uid), orderBy('timestamp', 'desc'));
            unsubSnap = onSnapshot(qSnap, s => setSnapshots(s.docs.map(d => ({ id: d.id, ...d.data() } as WhiteboardSnapshot))));
        }

        return () => { unsubS(); unsubI(); unsubT(); unsubSnap(); };
    }, [activeBoardId, activePageId, isTeacher, user]);

    // -- Actions --

    const setActiveBoardGlobal = (id: string) => {
        setActiveBoardId(id);
        // Teacher always updates global state
        if(isTeacher && courseId) {
            updateDoc(doc(db, 'courses', courseId), { activeBoardId: id });
        }
    };

    const setActivePageIdGlobal = (id: string) => {
        setActivePageId(id);
        // Teacher always updates global state
        if (isTeacher && courseId) {
            updateDoc(doc(db, 'courses', courseId), { activePageId: id });
        }
    };

    const updateBoardSettings = async (updates: any) => {
        if (!activeBoardId) return;
        setIsSyncing(true);
        try {
            await updateDoc(doc(db, 'whiteboardBoards', activeBoardId), updates);
        } finally { setIsSyncing(false); }
    };

    const toggleGlobalSync = async (enabled: boolean) => {
        if (!isTeacher || !courseId) return;
        try {
            await updateDoc(doc(db, 'courses', courseId), { syncEnabled: enabled });
        } catch (error) {
            console.error("Error toggling global sync:", error);
        }
    };

    // Page Management
    const addPage = async () => {
        if (!activeBoardId) return;
        setIsSyncing(true);
        try {
            // Find max order safely
            const maxOrder = pages.length > 0 ? Math.max(...pages.map(p => p.order)) : -1;
            
            const docRef = await addDoc(collection(db, 'whiteboardPages'), {
                boardId: activeBoardId,
                order: maxOrder + 1
            });
            
            // Auto switch to new page immediately
            setActivePageIdGlobal(docRef.id);
        } finally { setIsSyncing(false); }
    };

    const deletePage = async (pageId: string) => {
        if (pages.length <= 1) return;
        setIsSyncing(true);
        try {
            const batch = writeBatch(db);
            const sQ = await getDocs(query(collection(db, 'whiteboardStrokes'), where('pageId', '==', pageId)));
            const iQ = await getDocs(query(collection(db, 'whiteboardImages'), where('pageId', '==', pageId)));
            const tQ = await getDocs(query(collection(db, 'whiteboardTexts'), where('pageId', '==', pageId)));
            
            sQ.forEach(d => batch.delete(d.ref));
            iQ.forEach(d => batch.delete(d.ref));
            tQ.forEach(d => batch.delete(d.ref));
            batch.delete(doc(db, 'whiteboardPages', pageId));
            
            await batch.commit();
            
            if (activePageId === pageId) {
                const remaining = pages.filter(p => p.id !== pageId);
                if (remaining.length > 0) setActivePageIdGlobal(remaining[0].id);
            }
        } catch(e) { console.error(e); } finally { setIsSyncing(false); }
    };

    const movePage = async (pageId: string, direction: 'left' | 'right') => {
        const idx = pages.findIndex(p => p.id === pageId);
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= pages.length) return;
        
        const pageA = pages[idx];
        const pageB = pages[targetIdx];
        
        setIsSyncing(true);
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'whiteboardPages', pageA.id), { order: pageB.order });
            batch.update(doc(db, 'whiteboardPages', pageB.id), { order: pageA.order });
            await batch.commit();
        } finally { setIsSyncing(false); }
    };

    // Layer Management
    const addLayer = async () => {
        if (!activeBoardId) return;
        
        // Find current active layer to determine insertion point
        const currentActive = layers.find(l => l.id === activeLayerId);
        const targetOrder = currentActive ? currentActive.order + 1 : (layers.length > 0 ? layers[0].order + 1 : 0);

        const batch = writeBatch(db);

        // Shift up all layers that are currently at or above the target order
        layers.forEach(l => {
            if (l.order >= targetOrder) {
                batch.update(doc(db, 'whiteboardLayers', l.id), { order: l.order + 1 });
            }
        });

        // Add new layer
        const newLayerRef = doc(collection(db, 'whiteboardLayers'));
        batch.set(newLayerRef, { 
            boardId: activeBoardId, 
            name: `Nueva Capa`, 
            order: targetOrder, 
            visible: true, 
            opacity: 1 
        });

        await batch.commit();
    };

    const toggleLayerVisibility = async (layer: WhiteboardLayer) => {
        await updateDoc(doc(db, 'whiteboardLayers', layer.id), { visible: !layer.visible });
    };

    const updateLayer = async (layerId: string, updates: Partial<WhiteboardLayer>) => {
        await updateDoc(doc(db, 'whiteboardLayers', layerId), updates);
    };

    const deleteLayer = async (layerId: string) => {
        setIsSyncing(true);
        try {
            const batch = writeBatch(db);
            strokes.filter(s => s.layerId === layerId).forEach(s => batch.update(doc(db, 'whiteboardStrokes', s.id), { deleted: true }));
            images.filter(i => i.layerId === layerId).forEach(i => batch.update(doc(db, 'whiteboardImages', i.id), { deleted: true }));
            texts.filter(t => t.layerId === layerId).forEach(t => batch.update(doc(db, 'whiteboardTexts', t.id), { deleted: true }));
            
            await deleteDoc(doc(db, 'whiteboardLayers', layerId));
            await batch.commit();
        } catch(e) { console.error(e); } finally { setIsSyncing(false); }
    };

    const moveLayer = async (layer: WhiteboardLayer, direction: 'up' | 'down') => {
        const sorted = [...layers].sort((a, b) => b.order - a.order);
        const idx = sorted.findIndex(l => l.id === layer.id);
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= sorted.length) return;
        const other = sorted[targetIdx];
        const batch = writeBatch(db);
        batch.update(doc(db, 'whiteboardLayers', layer.id), { order: other.order });
        batch.update(doc(db, 'whiteboardLayers', other.id), { order: layer.order });
        await batch.commit();
    };

    const createSnapshot = async (name: string, content: any) => {
        if (!user) return;
        setIsSyncing(true);
        try {
            await addDoc(collection(db, 'whiteboardSnapshots'), { name, teacherId: user.uid, timestamp: Date.now(), content });
        } finally { setIsSyncing(false); }
    };

    const restoreSnapshot = async (snapshot: WhiteboardSnapshot) => {
        if (!activeBoardId || !activePageId) return;
        setIsSyncing(true);
        try {
            const ops: any[] = [];
            snapshot.content.strokes.forEach(s => { const {id, cachedPath, ...data} = s; ops.push({ ref: doc(collection(db, 'whiteboardStrokes')), data: { ...data, boardId: activeBoardId, pageId: activePageId, layerId: activeLayerId, timestamp: Date.now() } }); });
            snapshot.content.images.forEach(i => { const {id, ...data} = i; ops.push({ ref: doc(collection(db, 'whiteboardImages')), data: { ...data, boardId: activeBoardId, pageId: activePageId, layerId: activeLayerId, timestamp: Date.now() } }); });
            snapshot.content.texts.forEach(t => { const {id, ...data} = t; ops.push({ ref: doc(collection(db, 'whiteboardTexts')), data: { ...data, boardId: activeBoardId, pageId: activePageId, layerId: activeLayerId, timestamp: Date.now() } }); });

            for (let i = 0; i < ops.length; i += 500) {
                const batch = writeBatch(db);
                ops.slice(i, i + 500).forEach(op => batch.set(op.ref, op.data));
                await batch.commit();
            }
        } finally { setIsSyncing(false); }
    };

    const deleteSnapshot = async (id: string) => {
        await deleteDoc(doc(db, 'whiteboardSnapshots', id));
    };

    const createBoard = async (name: string) => {
        if (!courseId) return;
        await addDoc(collection(db, 'whiteboardBoards'), { 
            name, 
            courseId,
            timestamp: Date.now(), 
            bgColor: '#ffffff', 
            width: 1920, 
            height: 1080 
        });
    };

    const deleteBoard = async (id: string) => {
        setIsSyncing(true);
        try {
            await deleteDoc(doc(db, 'whiteboardBoards', id));
        } finally { setIsSyncing(false); }
    };

    // --- Import / Export Logic (File) ---

    const exportBoard = async (boardId: string) => {
        if (!boardId) return;
        setIsSyncing(true);
        try {
            const board = boards.find(b => b.id === boardId);
            if (!board) throw new Error("Board not found");

            // Fetch all sub-collections related to this board
            const [pagesSnap, layersSnap, strokesSnap, imagesSnap, textsSnap] = await Promise.all([
                getDocs(query(collection(db, 'whiteboardPages'), where('boardId', '==', boardId))),
                getDocs(query(collection(db, 'whiteboardLayers'), where('boardId', '==', boardId))),
                getDocs(query(collection(db, 'whiteboardStrokes'), where('boardId', '==', boardId))),
                getDocs(query(collection(db, 'whiteboardImages'), where('boardId', '==', boardId))),
                getDocs(query(collection(db, 'whiteboardTexts'), where('boardId', '==', boardId))),
            ]);

            const exportData = {
                version: 1,
                board: { ...board },
                pages: pagesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                layers: layersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                strokes: strokesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                images: imagesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                texts: textsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            };

            const blob = new Blob([JSON.stringify(exportData)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whiteboard-${board.name.replace(/\s+/g, '_')}-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error exporting board:", error);
            alert("Error al exportar la pizarra.");
        } finally {
            setIsSyncing(false);
        }
    };

    const importBoard = async (file: File) => {
        if (!file || !courseId) return;
        setIsSyncing(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.board || !data.pages) throw new Error("Invalid format");

            // 1. Create Board
            const { id: oldBoardId, ...boardData } = data.board;
            const newBoardRef = await addDoc(collection(db, 'whiteboardBoards'), {
                ...boardData,
                name: `${boardData.name} (Importada)`,
                courseId, 
                timestamp: Date.now()
            });
            const newBoardId = newBoardRef.id;

            // 2. Map Old IDs to New IDs
            const pageIdMap: Record<string, string> = {};
            const layerIdMap: Record<string, string> = {};

            // 3. Create Pages
            for (const page of data.pages) {
                const { id: oldPageId, boardId: _ignore, ...pageData } = page;
                const newPageRef = await addDoc(collection(db, 'whiteboardPages'), {
                    ...pageData,
                    boardId: newBoardId
                });
                pageIdMap[oldPageId] = newPageRef.id;
            }

            // 4. Create Layers
            for (const layer of data.layers) {
                const { id: oldLayerId, boardId: _ignore, ...layerData } = layer;
                const newLayerRef = await addDoc(collection(db, 'whiteboardLayers'), {
                    ...layerData,
                    boardId: newBoardId
                });
                layerIdMap[oldLayerId] = newLayerRef.id;
            }

            // 5. Create Content (Batched)
            const contentItems: any[] = [];

            // Helper to prepare content item
            const prepareItem = (item: any, type: string) => {
                const { id: _oldId, boardId: _b, pageId: oldP, layerId: oldL, ...rest } = item;
                if (pageIdMap[oldP]) {
                    contentItems.push({
                        coll: type,
                        data: {
                            ...rest,
                            boardId: newBoardId,
                            pageId: pageIdMap[oldP],
                            layerId: layerIdMap[oldL] || oldL
                        }
                    });
                }
            };

            data.strokes.forEach((s: any) => prepareItem(s, 'whiteboardStrokes'));
            data.images.forEach((i: any) => prepareItem(i, 'whiteboardImages'));
            data.texts.forEach((t: any) => prepareItem(t, 'whiteboardTexts'));

            // Process chunks of 500
            for (let i = 0; i < contentItems.length; i += 500) {
                const batch = writeBatch(db);
                const chunk = contentItems.slice(i, i + 500);
                chunk.forEach(item => {
                    const ref = doc(collection(db, item.coll));
                    batch.set(ref, item.data);
                });
                await batch.commit();
            }

            setActiveBoardGlobal(newBoardId);

        } catch (error) {
            console.error("Error importing board:", error);
            alert("Error al importar la pizarra. Verifique el formato del archivo.");
        } finally {
            setIsSyncing(false);
        }
    };

    // --- NEW: SAVE TO LIBRARY (Full Board as Class Template) ---
    const saveBoardToLibrary = async (boardId: string, teacherId: string, name: string) => {
        if (!boardId || !teacherId) return;
        setIsSyncing(true);
        try {
            const board = boards.find(b => b.id === boardId);
            if (!board) throw new Error("Board not found");

            // Fetch ALL data
            const [pagesSnap, layersSnap, strokesSnap, imagesSnap, textsSnap] = await Promise.all([
                getDocs(query(collection(db, 'whiteboardPages'), where('boardId', '==', boardId))),
                getDocs(query(collection(db, 'whiteboardLayers'), where('boardId', '==', boardId))),
                getDocs(query(collection(db, 'whiteboardStrokes'), where('boardId', '==', boardId))),
                getDocs(query(collection(db, 'whiteboardImages'), where('boardId', '==', boardId))),
                getDocs(query(collection(db, 'whiteboardTexts'), where('boardId', '==', boardId))),
            ]);

            const fullData = {
                board: { ...board },
                pages: pagesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                layers: layersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                strokes: strokesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                images: imagesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                texts: textsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            };

            // Save to Library Collection
            await addDoc(collection(db, 'libraryClasses'), {
                teacherId,
                name,
                timestamp: Date.now(),
                data: fullData
            });

        } catch (error) {
            console.error("Error saving board to library:", error);
            alert("Error al guardar la clase en la librería.");
        } finally {
            setIsSyncing(false);
        }
    };

    // --- NEW: LOAD FROM LIBRARY (Instantiate Class Template) ---
    const loadBoardFromLibrary = async (libraryClass: LibraryClass) => {
        if (!courseId || !libraryClass.data) return;
        setIsSyncing(true);
        try {
            const data = libraryClass.data;
            const { board, pages: lPages, layers: lLayers, strokes: lStrokes, images: lImages, texts: lTexts } = data;

            // 1. Create New Board
            const { id: oldBoardId, ...boardData } = board as any;
            const newBoardRef = await addDoc(collection(db, 'whiteboardBoards'), {
                ...boardData,
                name: `${libraryClass.name} (Copia)`,
                courseId, 
                timestamp: Date.now()
            });
            const newBoardId = newBoardRef.id;

            // 2. Map IDs
            const pageIdMap: Record<string, string> = {};
            const layerIdMap: Record<string, string> = {};

            // 3. Create Pages
            for (const page of lPages) {
                const { id: oldPageId, boardId: _ignore, ...pageData } = page as any;
                const newPageRef = await addDoc(collection(db, 'whiteboardPages'), {
                    ...pageData,
                    boardId: newBoardId
                });
                pageIdMap[oldPageId] = newPageRef.id;
            }

            // 4. Create Layers
            for (const layer of lLayers) {
                const { id: oldLayerId, boardId: _ignore, ...layerData } = layer as any;
                const newLayerRef = await addDoc(collection(db, 'whiteboardLayers'), {
                    ...layerData,
                    boardId: newBoardId
                });
                layerIdMap[oldLayerId] = newLayerRef.id;
            }

            // 5. Create Content (Batched)
            const contentItems: any[] = [];
            const prepareItem = (item: any, type: string) => {
                const { id: _oldId, boardId: _b, pageId: oldP, layerId: oldL, ...rest } = item;
                if (pageIdMap[oldP]) {
                    contentItems.push({
                        coll: type,
                        data: {
                            ...rest,
                            boardId: newBoardId,
                            pageId: pageIdMap[oldP],
                            layerId: layerIdMap[oldL] || oldL,
                            timestamp: Date.now()
                        }
                    });
                }
            };

            lStrokes.forEach(s => prepareItem(s, 'whiteboardStrokes'));
            lImages.forEach(i => prepareItem(i, 'whiteboardImages'));
            lTexts.forEach(t => prepareItem(t, 'whiteboardTexts'));

            for (let i = 0; i < contentItems.length; i += 500) {
                const batch = writeBatch(db);
                const chunk = contentItems.slice(i, i + 500);
                chunk.forEach(item => {
                    const ref = doc(collection(db, item.coll));
                    batch.set(ref, item.data);
                });
                await batch.commit();
            }

            setActiveBoardGlobal(newBoardId);

        } catch (error) {
            console.error("Error loading class from library:", error);
            alert("Error al cargar la clase de la librería.");
        } finally {
            setIsSyncing(false);
        }
    };

    return {
        boards, activeBoardId, setActiveBoardId: setActiveBoardGlobal, createBoard, deleteBoard,
        pages, activePageId, setActivePageId: setActivePageIdGlobal, addPage, deletePage, movePage,
        layers, activeLayerId, setActiveLayerId, addLayer, toggleLayerVisibility, deleteLayer, moveLayer, updateLayer,
        strokes, images, texts, setStrokes, setImages, setTexts, // Export setters
        snapshots, createSnapshot, restoreSnapshot, deleteSnapshot,
        boardSettings, updateBoardSettings,
        isSyncing, setIsSyncing,
        exportBoard, importBoard,
        courseTitle, 
        courseCode,
        saveBoardToLibrary, 
        loadBoardFromLibrary,
        syncEnabled, toggleGlobalSync // Exported new sync state & controls
    };
};