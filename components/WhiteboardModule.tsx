// File: src/components/WhiteboardModule.tsx

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { setDoc, addDoc, doc, updateDoc, writeBatch, collection, deleteField, arrayUnion, query, where, onSnapshot, deleteDoc, getDocs } from "firebase/firestore";
import { db } from '../services/firebase';
import type { User, WhiteboardStroke, WhiteboardImage, WhiteboardText, Point, GridConfig, LibraryItem } from '../types';
import { getStroke } from 'perfect-freehand';
import { uploadFile } from '../services/storageService';
import { getSvgPathFromStroke, isPointInPolygon, DEFAULT_PRESETS, resizeImage, getBoundingBox, getSimplePolygonPath, getStrokePath, simplifyPoints } from '../utils/whiteboardUtils';
import { ImageImportModal } from './whiteboard/ui/ImageImportModal';
import { LayerManager } from './whiteboard/ui/LayerManager';
import { WhiteboardSettings } from './whiteboard/ui/WhiteboardSettings';
import { WhiteboardToolbar } from './whiteboard/ui/WhiteboardToolbar';
import { BoardLayers } from './whiteboard/ui/BoardLayers';
import { HtmlTextEditor } from './whiteboard/ui/HtmlTextEditor';
import { useWhiteboardSync } from '../hooks/useWhiteboardSync';
import { useWhiteboardHistory } from '../hooks/useWhiteboardHistory';
import { useWhiteboardSelection } from '../hooks/useWhiteboardSelection';
import { useWhiteboardGestures } from '../hooks/useWhiteboardGestures';
import ConfirmModal from './ConfirmModal';
import { IconUndo, IconRedo, IconDeviceFloppy, IconHand, IconArrowsExpand, IconPlus, IconX, IconTrash, IconClipboardCopy, IconLayers, IconCrop, IconClipboard, IconArrowLeft, IconChevronUp, IconChevronDown, IconDownload, IconUpload, IconLockClosed, IconLockOpen, IconCloud, IconCloudOff, IconDashboard, IconLibrary, IconSwitchLocation, IconGroup, IconUngroup, IconCheck, IconBook, IconSidebar, IconPencil } from './Icons';
import type { ExtendedStrokeOptions, ExtendedWhiteboardText, ToolType, ToolPreset, DrawStyle, ShapeStyle } from '../types/whiteboardTypes';
import { QuickLibraryBar } from './whiteboard/library/QuickLibraryBar';
import { LibraryManager } from './whiteboard/library/LibraryManager';
import { ClassLibraryManager } from './whiteboard/library/ClassLibraryManager';
import { normalizeItems, generateThumbnailSvg } from '../utils/libraryUtils';
import TeacherSidePanel from './TeacherSidePanel';

interface WhiteboardModuleProps {
    user: User | null;
    isGuestMode: boolean;
    courseId: string;
}

const WhiteboardModule: React.FC<WhiteboardModuleProps> = ({ user, isGuestMode, courseId }) => {
    const isTeacher = user?.role === 'teacher';
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);
    const libraryBarRef = useRef<HTMLDivElement>(null);
    const pagesListRef = useRef<HTMLDivElement>(null);

    // --- Persistence Logic ---
    const STORAGE_KEY = `wb_prefs_${user?.uid || 'guest'}`;

    const savedPrefs = useMemo(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    }, [STORAGE_KEY]);

    // --- State ---
    const [tool, setTool] = useState<ToolType>('pen');
    const [drawStyle, setDrawStyle] = useState<DrawStyle>(savedPrefs.drawStyle || 'ink');
    const [shapeStyle, setShapeStyle] = useState<ShapeStyle>('stroke'); // Deprecated internally but kept for compatibility logic if needed

    // Independent Styling States
    const [fillColor, setFillColor] = useState<string>(savedPrefs.fillColor || '#e2e8f0');
    const [isFilled, setIsFilled] = useState<boolean>(savedPrefs.isFilled ?? false);
    const [isStroked, setIsStroked] = useState<boolean>(savedPrefs.isStroked ?? true);
    // Drag & drop reordering helpers for boards
    const draggedBoardIdRef = useRef<string | null>(null);
    // Drag & drop reordering helpers for pages (diapositivas)
    const draggedPageIdRef = useRef<string | null>(null);

    const [presets, setPresets] = useState<ToolPreset[]>(() => {
        if (user?.whiteboardPresets && user.whiteboardPresets.length > 0) {
            return user.whiteboardPresets;
        }
        return savedPrefs.presets || DEFAULT_PRESETS;
    });

    const [activePresetIdx, setActivePresetIdx] = useState(savedPrefs.activePresetIdx ?? 0);
    const activePreset = presets[activePresetIdx];

    const [color, setColor] = useState(activePreset.color);
    const [size, setSize] = useState(activePreset.size);
    const [opacity, setOpacity] = useState(activePreset.opacity);
    const [strokeOpts, setStrokeOpts] = useState<ExtendedStrokeOptions>(activePreset.options);

    const [stylusOnly, setStylusOnly] = useState(() => localStorage.getItem('wb_stylus_only') === 'true');
    const [showLayers, setShowLayers] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [camera, setCamera] = useState({ x: 0, y: 0, scale: 0.8 });
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

    // Eraser configuration states
    const [eraserTargets, setEraserTargets] = useState(() => {
        const saved = localStorage.getItem('wb_eraser_targets');
        return saved ? JSON.parse(saved) : { strokes: true, images: false, texts: false };
    });
    const [eraserLayerScope, setEraserLayerScope] = useState<'current' | 'all'>('current');
    const [eraserMode, setEraserMode] = useState<'freehand' | 'rect' | 'circle'>('freehand');

    useEffect(() => {
        localStorage.setItem('wb_eraser_targets', JSON.stringify(eraserTargets));
    }, [eraserTargets]);

    // File Imports State
    const [importingFile, setImportingFile] = useState<File | Blob | null>(null);
    const [libraryImportFile, setLibraryImportFile] = useState<File | Blob | null>(null);

    const [editingTextId, setEditingTextId] = useState<string | null>(null);

    const [editingImageId, setEditingImageId] = useState<string | null>(null);
    const [editingImageTeacherOnly, setEditingImageTeacherOnly] = useState(false);

    const [lassoPoints, setLassoPoints] = useState<Point[] | null>(null);
    const [showLayerSelector, setShowLayerSelector] = useState(false);
    const [isNavLocked, setIsNavLocked] = useState(false);
    const [showBoardTabs, setShowBoardTabs] = useState(true);
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

    const [isFollowingTeacher, setIsFollowingTeacher] = useState(true);
    const [isSyncPaused, setIsSyncPaused] = useState(false);
    const [pendingStrokes, setPendingStrokes] = useState<WhiteboardStroke[]>([]);
    const [syncingStrokes, setSyncingStrokes] = useState<WhiteboardStroke[]>([]);
    const [pendingImages, setPendingImages] = useState<WhiteboardImage[]>([]);
    const [pendingTexts, setPendingTexts] = useState<ExtendedWhiteboardText[]>([]);
    const [pendingKeyframes, setPendingKeyframes] = useState<{ [pageId: string]: string[] }>({});

    const [activeKeyframeId, setActiveKeyframeId] = useState<string>('kf_default');
    const [showBoardDropdown, setShowBoardDropdown] = useState(false);

    // --- Library State ---
    const [showLibraryManager, setShowLibraryManager] = useState(false);
    const [showClassLibraryManager, setShowClassLibraryManager] = useState(false);
    const [quickLibraryItems, setQuickLibraryItems] = useState<LibraryItem[]>([]);

    useEffect(() => {
        if (!isTeacher || !user) return;
        const q = query(collection(db, 'libraryItems'), where('teacherId', '==', user.uid), where('isQuick', '==', true));
        const unsub = onSnapshot(q, snap => {
            setQuickLibraryItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as LibraryItem)));
        });
        return () => unsub();
    }, [user, isTeacher]);


    useEffect(() => {
        const p = presets[activePresetIdx];
        if (p) {
            setColor(p.color);
            setSize(p.size);
            setOpacity(p.opacity);
            
            // Map freehand to ink for backward compatibility
            const loadedStyle = p.drawStyle === 'freehand' ? 'ink' : (p.drawStyle || 'ink');
            setDrawStyle(loadedStyle);
            
            const loadedOptions = {
                ...p.options,
                thinning: p.drawStyle === 'freehand' ? 0 : (p.options?.thinning ?? 0.5)
            };
            setStrokeOpts(loadedOptions);
            
            // Load stroke and fill states from preset options
            setIsStroked(loadedOptions.stroked ?? true);
            setIsFilled(loadedOptions.filled ?? false);
            if (loadedOptions.fillColor) {
                setFillColor(loadedOptions.fillColor);
            }
        }
    }, [activePresetIdx, presets]);

    useEffect(() => {
        const prefsToSave = {
            drawStyle,
            activePresetIdx,
            presets,
            stylusOnly,
            fillColor,
            isFilled,
            isStroked
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefsToSave));
        localStorage.setItem('wb_stylus_only', String(stylusOnly));

        if (user && !isGuestMode) {
            const timer = setTimeout(async () => {
                try {
                    await updateDoc(doc(db, 'users', user.uid), {
                        whiteboardPresets: presets
                    });
                } catch (e) {
                    console.error("Error syncing presets to cloud:", e);
                }
            }, 2000);
            return () => clearTimeout(timer);
        }

    }, [tool, drawStyle, activePresetIdx, presets, stylusOnly, STORAGE_KEY, user, isGuestMode, fillColor, isFilled, isStroked]);

    const handleUpdatePreset = useCallback((index: number, updates: Partial<ToolPreset>) => {
        setPresets(prev => prev.map((p, idx) => idx === index ? { ...p, ...updates } : p));
        if (index === activePresetIdx) {
            if (updates.color) setColor(updates.color);
            if (updates.size) setSize(updates.size);
            if (updates.opacity) setOpacity(updates.opacity);
            if (updates.options) setStrokeOpts(updates.options);
            if (updates.drawStyle) setDrawStyle(updates.drawStyle);
        }
    }, [activePresetIdx]);

    const handleSelectPreset = useCallback((index: number) => {
        setActivePresetIdx(index);
        setTool('pen');
    }, []);

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const requestConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
        setConfirmConfig({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            },
            isDestructive
        });
    };

    const {
        boards, activeBoardId, setActiveBoardId, createBoard, deleteBoard,
        pages, activePageId, setActivePageId, addPage, deletePage, movePage,
        layers, activeLayerId, setActiveLayerId, addLayer, toggleLayerVisibility, deleteLayer, moveLayer: moveLayerOrder, updateLayer,
        strokes, images, texts,
        snapshots, createSnapshot, restoreSnapshot, deleteSnapshot,
        boardSettings, updateBoardSettings,
        isSyncing, setIsSyncing,
        exportBoard, importBoard,
    saveBoardToLibrary, savePageToLibrary, loadBoardFromLibrary,
        courseTitle,
        courseCode,
        syncEnabled, toggleGlobalSync
    } = useWhiteboardSync(user, isTeacher, courseId, isFollowingTeacher);

    // Sorted boards with fallback: use explicit `order` if present, otherwise timestamp
    const sortedBoards = useMemo(() => {
        const raw = boards || [];
        return [...raw].sort((a, b) => {
            const aKey = (a as any).order ?? a.timestamp ?? 0;
            const bKey = (b as any).order ?? b.timestamp ?? 0;
            return aKey - bKey;
        });
    }, [boards]);

    // Drag & drop handlers for reordering boards
    const handleDragStartBoard = (e: React.DragEvent, boardId: string) => {
        draggedBoardIdRef.current = boardId;
        try { e.dataTransfer?.setData('text/plain', boardId); } catch (e) {}
        e.dataTransfer!.effectAllowed = 'move';
    };

    const handleDragStartPage = (e: React.DragEvent, pageId: string) => {
        draggedPageIdRef.current = pageId;
        try { e.dataTransfer?.setData('text/plain', pageId); } catch (e) {}
        e.dataTransfer!.effectAllowed = 'move';
    };

    const handleDragOverBoard = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
    };

    const handleDragOverPage = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
    };

    const handleDropOnIndex = async (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const draggedId = draggedBoardIdRef.current || e.dataTransfer?.getData('text/plain');
        if (!draggedId) return;
        const currentIndex = sortedBoards.findIndex(b => b.id === draggedId);
        if (currentIndex === -1) return;

        // Build new order array
        const newOrderList = [...sortedBoards];
        const [dragged] = newOrderList.splice(currentIndex, 1);
        // Adjust targetIndex if dragging forward
        const insertIndex = targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
        newOrderList.splice(insertIndex, 0, dragged);

        // Persist orders as sequential integers
        const batch = writeBatch(db);
        newOrderList.forEach((b, i) => {
            if (!b.id) return;
            batch.update(doc(db, 'whiteboardBoards', b.id), { order: i });
        });
        try {
            await batch.commit();
        } catch (err) {
            console.error('Error reordering boards:', err);
        }
        draggedBoardIdRef.current = null;
    };

    const handleDropOnPageIndex = async (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const draggedId = draggedPageIdRef.current || e.dataTransfer?.getData('text/plain');
        if (!draggedId) return;
        const currentIndex = pages.findIndex(p => p.id === draggedId);
        if (currentIndex === -1) return;

        const newOrderList = [...pages];
        const [dragged] = newOrderList.splice(currentIndex, 1);
        const insertIndex = targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
        newOrderList.splice(insertIndex, 0, dragged);

        const batch = writeBatch(db);
        newOrderList.forEach((p, i) => {
            if (!p.id) return;
            batch.update(doc(db, 'whiteboardPages', p.id), { order: i });
        });
        try {
            await batch.commit();
        } catch (err) {
            console.error('Error reordering pages:', err);
        }
        draggedPageIdRef.current = null;
    };

    const addBoardAtIndex = async (index: number) => {
        if (!courseId) return;
        const name = prompt('Nombre de la nueva clase:');
        if (!name) return;

        const newList = [...sortedBoards];
        // Insert placeholder for new board to compute orders
        newList.splice(index, 0, { id: 'temp_new' } as any);

        const batch = writeBatch(db);
        // Update existing boards order
        newList.forEach((b, i) => {
            if (!b.id || b.id === 'temp_new') return;
            batch.update(doc(db, 'whiteboardBoards', b.id), { order: i });
        });

        // Create new board with specific order
        const newRef = doc(collection(db, 'whiteboardBoards'));
        batch.set(newRef, { name, courseId, timestamp: Date.now(), order: index });

        try {
            await batch.commit();
            setActiveBoardId(newRef.id);
        } catch (err) {
            console.error('Error adding board at index:', err);
        }
    };

    const addPageAtIndex = async (index: number) => {
        if (!activeBoardId) return;
        const name = prompt('AÃ±adir nueva pizarra (diapositiva) - nombre opcional:');

        const newList = [...pages];
        newList.splice(index, 0, { id: 'temp_new' } as any);

        const batch = writeBatch(db);
        newList.forEach((p, i) => {
            if (!p.id || p.id === 'temp_new') return;
            batch.update(doc(db, 'whiteboardPages', p.id), { order: i });
        });

    const newRef = doc(collection(db, 'whiteboardPages'));
    const pagePayload: any = { boardId: activeBoardId, order: index, timestamp: Date.now() };
    if (name) pagePayload.name = name;
    batch.set(newRef, pagePayload);

        try {
            await batch.commit();
            setActivePageId(newRef.id);
        } catch (err) {
            console.error('Error adding page at index:', err);
        }
    };

    const handleSavePageToLibrary = async (pageId: string) => {
        if (!isTeacher || !user) return;
        const name = prompt('Nombre para guardar la diapositiva en la librerÃ­a:', `Diapositiva ${pages.findIndex(p => p.id === pageId) + 1}`);
        if (!name) return;
        try {
            await savePageToLibrary(pageId, user.uid, name);
            alert('Diapositiva guardada en la librerÃ­a.');
        } catch (e) {
            console.error('Error guardando diapositiva en librerÃ­a:', e);
            alert('Error al guardar la diapositiva.');
        }
    };

    const handleDownloadPageAsJpeg = async (pageId: string) => {
        try {
            // Fetch content for that page
            const strokesSnap = await getDocs(query(collection(db, 'whiteboardStrokes'), where('pageId', '==', pageId)));
            const imagesSnap = await getDocs(query(collection(db, 'whiteboardImages'), where('pageId', '==', pageId)));
            const textsSnap = await getDocs(query(collection(db, 'whiteboardTexts'), where('pageId', '==', pageId)));

            const strokesData = strokesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const imagesData = imagesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const textsData = textsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const normalized = normalizeItems(strokesData as any, imagesData as any, textsData as any);
            if (!normalized) { alert('Diapositiva vacÃ­a. Nada que descargar.'); return; }

            const svgDataUri = generateThumbnailSvg(normalized.data, normalized.width || 800, normalized.height || 600);

            await new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scale = 2; // improve resolution
                    canvas.width = (normalized.width + 20) * scale;
                    canvas.height = (normalized.height + 20) * scale;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { reject(new Error('Canvas no soportado')); return; }
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                    const a = document.createElement('a');
                    const pageObj = pages.find(p => p.id === pageId);
                    const name = pageObj && (pageObj as any).name ? (pageObj as any).name : `diapositiva_${pageId}`;
                    a.href = dataUrl;
                    a.download = `${name.replace(/\s+/g, '_')}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    resolve();
                };
                img.onerror = (err) => reject(err);
                img.src = svgDataUri;
            });

        } catch (err) {
            console.error('Error descargando la diapositiva:', err);
            alert('Error al generar la imagen.');
        }
    };


    const { undo, redo, recordAction, recordActionGroup, historyIndex, redoStack, clearHistory } = useWhiteboardHistory(setIsSyncing);

    useEffect(() => {
        if (activePageId && pagesListRef.current) {
            const activeElement = pagesListRef.current.querySelector(`[data-page-id="${activePageId}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'nearest'
                });
            }
        }
    }, [activePageId]);

    const currentPageKeyframes = useMemo(() => {
        const page = pages.find(p => p.id === activePageId);
        const serverKeys = page?.keyframeIds || ['kf_default'];
        const localKeys = activePageId && pendingKeyframes[activePageId] ? pendingKeyframes[activePageId] : [];
        return [...serverKeys, ...localKeys];
    }, [pages, activePageId, pendingKeyframes]);

    useEffect(() => {
        if (currentPageKeyframes.length > 0 && !currentPageKeyframes.includes(activeKeyframeId)) {
            setActiveKeyframeId(currentPageKeyframes[0]);
        }
    }, [activePageId, currentPageKeyframes]);


    useEffect(() => {
        const updateDimensionsAndZoom = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });

                const margin = 20;
                const boardW = boardSettings.width || 1920;
                const boardH = boardSettings.height || 1080;
                const availableWidth = width - margin * 2;
                const availableHeight = height - margin * 2;
                const scale = Math.min(availableWidth / boardW, availableHeight / boardH);

                setCamera({
                    x: (width - boardW * scale) / 2,
                    y: (height - boardH * scale) / 2,
                    scale
                });
            }
        };

        updateDimensionsAndZoom();
        const observer = new ResizeObserver(() => updateDimensionsAndZoom());
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [activeBoardId, boardSettings.width, boardSettings.height, isSidePanelOpen]);

    const visibleLayerIds = useMemo(() => new Set(layers.filter(l => l.visible).map(l => l.id)), [layers]);
    const lockedLayerIds = useMemo(() => new Set(layers.filter(l => l.locked).map(l => l.id)), [layers]);

    const activeStrokes = useMemo(() => {
        const strokeIds = new Set(strokes.map(s => s.id));
        const filteredSyncing = syncingStrokes.filter(s => !strokeIds.has(s.id));
        const allStrokes = [...strokes, ...pendingStrokes, ...filteredSyncing];
        return allStrokes.filter(s => {
            if (s.deleted) return false;
            if (s.layerId && !visibleLayerIds.has(s.layerId)) return false;
            if (s.keyframeId === activeKeyframeId) return true;
            if (!s.keyframeId && activeKeyframeId === currentPageKeyframes[0]) return true;
            return false;
        });
    }, [strokes, pendingStrokes, syncingStrokes, visibleLayerIds, activeKeyframeId, currentPageKeyframes]);

    const activeImages = useMemo(() => {
        const allImages = [...images, ...pendingImages];
        return allImages.filter(i => {
            if (i.deleted) return false;
            if (i.layerId && !visibleLayerIds.has(i.layerId)) return false;
            if (i.teacherOnly === true && !isTeacher) return false;
            if (i.keyframeId === activeKeyframeId) return true;
            if (!i.keyframeId && activeKeyframeId === currentPageKeyframes[0]) return true;
            return false;
        });
    }, [images, pendingImages, visibleLayerIds, activeKeyframeId, currentPageKeyframes, isTeacher]);

    const activeTexts = useMemo(() => {
        const allTexts = [...texts, ...pendingTexts];
        return allTexts.filter(t => {
            if (t.deleted) return false;
            if (t.layerId && !visibleLayerIds.has(t.layerId)) return false;
            if (t.teacherOnly === true && !isTeacher) return false;
            if (t.keyframeId === activeKeyframeId) return true;
            if (!t.keyframeId && activeKeyframeId === currentPageKeyframes[0]) return true;
            return false;
        });
    }, [texts, pendingTexts, visibleLayerIds, activeKeyframeId, currentPageKeyframes, isTeacher]);

    const markerScales = useMemo(() => {
        const scales = new Set<number>();
        if (strokeOpts?.markerTextureScale) {
            const curScale = Number(Number(strokeOpts.markerTextureScale).toFixed(2));
            if (curScale !== 0.1) scales.add(curScale);
        }
        for (let i = 0; i < activeStrokes.length; i++) {
            const s = activeStrokes[i];
            const opts = s.options as ExtendedStrokeOptions | undefined;
            if (s.type === 'marker' || opts?.isNaturalMarker) {
                const scale = opts?.markerTextureScale !== undefined ? Number(Number(opts.markerTextureScale).toFixed(2)) : 0.1;
                if (scale !== 0.1) scales.add(scale);
            }
        }
        return Array.from(scales);
    }, [activeStrokes, strokeOpts?.markerTextureScale]);

    const [localImages, setLocalImages] = useState<any[]>(activeImages);
    const [localTexts, setLocalTexts] = useState<any[]>(activeTexts);

    useEffect(() => { setLocalImages(activeImages); }, [activeImages]);
    useEffect(() => { setLocalTexts(activeTexts); }, [activeTexts]);

    useEffect(() => {
        const handlePaste = (event: Event) => {
            const e = event as ClipboardEvent;
            if (!isTeacher) return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || target.closest('[contenteditable="true"]')) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            const list = Array.from(items as any);
            for (const item of list) {
                const it = item as any;
                if (it.type.indexOf('image') !== -1) {
                    const file = it.getAsFile();
                    if (file) { e.preventDefault(); setImportingFile(file); return; }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isTeacher]);

    const handleDeleteStrokes = useCallback(async (idsToDelete: string[]) => {
        const tempIds = idsToDelete.filter(id => id.startsWith('temp_'));
        const realIds = idsToDelete.filter(id => !id.startsWith('temp_'));

        if (tempIds.length > 0) {
            setPendingStrokes(prev => prev.filter(s => !tempIds.includes(s.id)));
        }
        setSyncingStrokes(prev => prev.filter(s => !idsToDelete.includes(s.id)));

        if (realIds.length > 0) {
            if (isSyncPaused) {
                alert("No se pueden borrar trazos sincronizados en modo offline.");
                return;
            }

            setIsSyncing(true);
            try {
                const batch = writeBatch(db);
                const actions: WhiteboardAction[] = [];
                realIds.forEach(id => {
                    const stroke = activeStrokes.find(s => s.id === id);
                    if (stroke) {
                        const { id: _, ...data } = stroke;
                        batch.delete(doc(db, 'whiteboardStrokes', id));
                        actions.push({ type: 'delete', targetType: 'stroke', targetId: id, data });
                    }
                });
                await batch.commit();
                if (actions.length > 0) {
                    recordActionGroup(actions);
                }
            } catch (e) {
                console.error("Error deleting strokes:", e);
                alert("Error al borrar trazos. Verifique su conexión.");
            } finally {
                setIsSyncing(false);
            }
        }
    }, [isSyncPaused, recordActionGroup, setIsSyncing, activeStrokes]);

    const handleDeleteElements = useCallback(async (imageIds: string[], textIds: string[]) => {
        if (imageIds.length === 0 && textIds.length === 0) return;
        if (isSyncPaused) {
            alert("No se pueden borrar elementos en modo offline.");
            return;
        }

        setIsSyncing(true);
        try {
            const batch = writeBatch(db);
            const actions: WhiteboardAction[] = [];
            imageIds.forEach(id => {
                const item = localImages.find(i => i.id === id);
                if (item) {
                    const { id: _, ...data } = item;
                    batch.delete(doc(db, 'whiteboardImages', id));
                    actions.push({ type: 'delete', targetType: 'image', targetId: id, data });
                }
            });
            textIds.forEach(id => {
                const item = localTexts.find(t => t.id === id);
                if (item) {
                    const { id: _, ...data } = item;
                    batch.delete(doc(db, 'whiteboardTexts', id));
                    actions.push({ type: 'delete', targetType: 'text', targetId: id, data });
                }
            });
            await batch.commit();
            if (actions.length > 0) {
                recordActionGroup(actions);
            }
        } catch (e) {
            console.error("Error deleting elements:", e);
            alert("Error al borrar elementos de la pizarra.");
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncPaused, recordActionGroup, setIsSyncing, localImages, localTexts]);

    const {
        selectedId, setSelectedId, setSelectedType, selectedType,
        isCropMode, setIsCropMode,
        selectedStrokeIds, setSelectedStrokeIds, strokeSelectionBounds, setStrokeSelectionBounds,
        tempStrokeTransform, setTempStrokeTransform, transformMode, setTransformMode, clipboard, setClipboard,
        initialTransformParams, handleUpdateSelectedItem, handleGroupStrokes, handleUngroupStrokes, finalizeStrokeTransform, cancelStrokeTransform,
        isSelectionGrouped,
        copySelection, cutSelection, pasteFromClipboard, deleteSelection, moveSelectionToLayer
    } = useWhiteboardSelection({
        strokes, images, texts, activeLayerId, cameraScale: camera.scale, setIsSyncing, recordAction, recordActionGroup, activeStrokes, activeImages, activeTexts,
        onDeleteStrokes: handleDeleteStrokes
    });

    // Clear selection if an item's layer becomes locked
    useEffect(() => {
        if (selectedId) {
            const itemLayerId = activeImages.find(i => i.id === selectedId)?.layerId || activeTexts.find(t => t.id === selectedId)?.layerId;
            if (itemLayerId && lockedLayerIds.has(itemLayerId)) {
                setSelectedId(null);
                setTransformMode(null);
            }
        }
        if (selectedStrokeIds.length > 0) {
            const hasLockedSelectedStrokes = activeStrokes.some(s => selectedStrokeIds.includes(s.id) && lockedLayerIds.has(s.layerId || ''));
            if (hasLockedSelectedStrokes) {
                setSelectedStrokeIds([]);
                setStrokeSelectionBounds(null);
                setTransformMode(null);
            }
        }
    }, [lockedLayerIds, selectedId, selectedStrokeIds, activeImages, activeTexts, activeStrokes, setSelectedId, setTransformMode, setSelectedStrokeIds, setStrokeSelectionBounds]);

    const screenToWorld = useCallback((clientX: number, clientY: number) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const ctm = svgRef.current.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };

        const pt = svgRef.current.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const globalPoint = pt.matrixTransform(ctm.inverse());
        return { x: (globalPoint.x - camera.x) / camera.scale, y: (globalPoint.y - camera.y) / camera.scale };
    }, [camera]);

    const isShapeTool = ['line', 'polyline', 'circle', 'arc', 'square', 'rectangle', 'parallelogram'].includes(tool);
    // Include all geometric tools in isSharpTool to enforce constant width
    const isSharpTool = ['line', 'polyline', 'square', 'rectangle', 'parallelogram', 'circle', 'arc'].includes(tool);

    const handleStrokeComplete = async (points: Point[]) => {
        if (!activePageId) return;
        const shouldUsePressure = !isShapeTool && drawStyle === 'ink';

        // Ensure at least one is true if not erasing
        let effectiveStroked = isStroked;
        let effectiveFilled = isFilled;
        if (tool !== 'eraser' && !effectiveStroked && !effectiveFilled) {
            effectiveStroked = true; // Default
        }

        const finalOptions = {
            ...strokeOpts,
            simulatePressure: shouldUsePressure,
            filled: effectiveFilled,
            stroked: effectiveStroked,
            fillColor: fillColor,
            sharpCorners: isSharpTool // Set sharpCorners flag for geometric shapes
        };

        if (isShapeTool) {
            finalOptions.smoothing = 0;
            finalOptions.thinning = 0;
            finalOptions.streamline = 0;
            finalOptions.simulatePressure = false;
            (finalOptions as any).taperStart = 0;
            (finalOptions as any).taperEnd = 0;
            (finalOptions as any).cap = 'butt';
        } else if (shouldUsePressure) {
            const uniquePressures = new Set(points.map(p => p.pressure).filter(p => p !== undefined && p !== 0.5 && p !== 1.0));
            if (uniquePressures.size > 1) {
                finalOptions.simulatePressure = false;
            }
        }

        if (tool === 'eraser') {
            const isItemInEraserScope = (itemLayerId?: string) => {
                if (eraserLayerScope === 'all') return true;
                if (itemLayerId === activeLayerId) return true;
                const activeLayer = layers.find(l => l.id === activeLayerId);
                if ((!activeLayer || activeLayer.order === 0 || layers.length <= 1) && !itemLayerId) return true;
                return false;
            };

            const strokesScope = activeStrokes.filter(s => !lockedLayerIds.has(s.layerId || '') && isItemInEraserScope(s.layerId));
            const imagesScope = activeImages.filter(img => !lockedLayerIds.has(img.layerId || '') && isItemInEraserScope(img.layerId));
            const textsScope = activeTexts.filter(txt => !lockedLayerIds.has(txt.layerId || '') && isItemInEraserScope(txt.layerId));

            const strokeIdsToDelete: string[] = [];
            const imageIdsToDelete: string[] = [];
            const textIdsToDelete: string[] = [];

            // Geometric distance & intersection helpers
            const distSq = (x1: number, y1: number, x2: number, y2: number) => (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);

            const distToSegmentSq = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
                const l2 = distSq(x1, y1, x2, y2);
                if (l2 === 0) return distSq(px, py, x1, y1);
                let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
                t = Math.max(0, Math.min(1, t));
                return distSq(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
            };

            const segmentsIntersect = (a1x: number, a1y: number, a2x: number, a2y: number, b1x: number, b1y: number, b2x: number, b2y: number) => {
                const ccw = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (ry - py) * (qx - px) > (qy - py) * (rx - px);
                return (
                    ccw(a1x, a1y, b1x, b1y, b2x, b2y) !== ccw(a2x, a2y, b1x, b1y, b2x, b2y) &&
                    ccw(a1x, a1y, a2x, a2y, b1x, b1y) !== ccw(a1x, a1y, a2x, a2y, b2x, b2y)
                );
            };

            const isPointInRect = (px: number, py: number, rx: number, ry: number, rw: number, rh: number) => {
                return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
            };

            const isPointInCircle = (px: number, py: number, cx: number, cy: number, radius: number) => {
                return distSq(px, py, cx, cy) <= radius * radius;
            };

            const segmentIntersectsRect = (x1: number, y1: number, x2: number, y2: number, rx: number, ry: number, rw: number, rh: number) => {
                if (isPointInRect(x1, y1, rx, ry, rw, rh) || isPointInRect(x2, y2, rx, ry, rw, rh)) return true;
                if (segmentsIntersect(x1, y1, x2, y2, rx, ry, rx + rw, ry)) return true;
                if (segmentsIntersect(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh)) return true;
                if (segmentsIntersect(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh)) return true;
                if (segmentsIntersect(x1, y1, x2, y2, rx, ry, rx, ry + rh)) return true;
                return false;
            };

            const canEraseStrokes = eraserTargets.strokes !== false;
            const canEraseImages = !!eraserTargets.images;
            const canEraseTexts = !!eraserTargets.texts;

            if (eraserMode === 'freehand' && points.length > 0) {
                const baseEraserRadius = Math.max(8, (size + 10) / camera.scale);

                if (canEraseStrokes) {
                    strokesScope.forEach(s => {
                        const hitRadius = baseEraserRadius + (s.size || 4) / 2;
                        const hitRadiusSq = hitRadius * hitRadius;

                        // Fast bounding box check
                        let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
                        s.points.forEach(p => {
                            if (p.x < sMinX) sMinX = p.x;
                            if (p.y < sMinY) sMinY = p.y;
                            if (p.x > sMaxX) sMaxX = p.x;
                            if (p.y > sMaxY) sMaxY = p.y;
                        });

                        let eMinX = Infinity, eMinY = Infinity, eMaxX = -Infinity, eMaxY = -Infinity;
                        points.forEach(p => {
                            if (p.x < eMinX) eMinX = p.x;
                            if (p.y < eMinY) eMinY = p.y;
                            if (p.x > eMaxX) eMaxX = p.x;
                            if (p.y > eMaxY) eMaxY = p.y;
                        });

                        if (eMaxX + hitRadius < sMinX || eMinX - hitRadius > sMaxX ||
                            eMaxY + hitRadius < sMinY || eMinY - hitRadius > sMaxY) {
                            return; // No overlap possible
                        }

                        let hit = false;
                        if (points.length === 1) {
                            const ep = points[0];
                            if (s.points.length === 1) {
                                hit = distSq(ep.x, ep.y, s.points[0].x, s.points[0].y) <= hitRadiusSq;
                            } else {
                                for (let i = 0; i < s.points.length - 1; i++) {
                                    if (distToSegmentSq(ep.x, ep.y, s.points[i].x, s.points[i].y, s.points[i + 1].x, s.points[i + 1].y) <= hitRadiusSq) {
                                        hit = true;
                                        break;
                                    }
                                }
                            }
                        } else {
                            // Compare each eraser segment against stroke segments
                            for (let j = 0; j < points.length - 1 && !hit; j++) {
                                const ep1 = points[j];
                                const ep2 = points[j + 1];

                                if (s.points.length === 1) {
                                    if (distToSegmentSq(s.points[0].x, s.points[0].y, ep1.x, ep1.y, ep2.x, ep2.y) <= hitRadiusSq) {
                                        hit = true;
                                        break;
                                    }
                                } else {
                                    for (let i = 0; i < s.points.length - 1; i++) {
                                        const sp1 = s.points[i];
                                        const sp2 = s.points[i + 1];

                                        if (segmentsIntersect(ep1.x, ep1.y, ep2.x, ep2.y, sp1.x, sp1.y, sp2.x, sp2.y) ||
                                            distToSegmentSq(ep1.x, ep1.y, sp1.x, sp1.y, sp2.x, sp2.y) <= hitRadiusSq ||
                                            distToSegmentSq(ep2.x, ep2.y, sp1.x, sp1.y, sp2.x, sp2.y) <= hitRadiusSq ||
                                            distToSegmentSq(sp1.x, sp1.y, ep1.x, ep1.y, ep2.x, ep2.y) <= hitRadiusSq ||
                                            distToSegmentSq(sp2.x, sp2.y, ep1.x, ep1.y, ep2.x, ep2.y) <= hitRadiusSq) {
                                            hit = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        if (hit) {
                            strokeIdsToDelete.push(s.id);
                        }
                    });
                }

                if (canEraseImages) {
                    imagesScope.forEach(img => {
                        let hit = false;
                        if (points.length === 1) {
                            hit = isPointInRect(points[0].x, points[0].y, img.x, img.y, img.width, img.height);
                        } else {
                            for (let j = 0; j < points.length - 1; j++) {
                                if (segmentIntersectsRect(points[j].x, points[j].y, points[j + 1].x, points[j + 1].y, img.x, img.y, img.width, img.height)) {
                                    hit = true;
                                    break;
                                }
                            }
                        }
                        if (hit) imageIdsToDelete.push(img.id);
                    });
                }

                if (canEraseTexts) {
                    textsScope.forEach(txt => {
                        let hit = false;
                        if (points.length === 1) {
                            hit = isPointInRect(points[0].x, points[0].y, txt.x, txt.y, txt.width, txt.height);
                        } else {
                            for (let j = 0; j < points.length - 1; j++) {
                                if (segmentIntersectsRect(points[j].x, points[j].y, points[j + 1].x, points[j + 1].y, txt.x, txt.y, txt.width, txt.height)) {
                                    hit = true;
                                    break;
                                }
                            }
                        }
                        if (hit) textIdsToDelete.push(txt.id);
                    });
                }
            } else if (eraserMode === 'rect' && points.length > 1) {
                const minX = Math.min(points[0].x, points[points.length - 1].x);
                const minY = Math.min(points[0].y, points[points.length - 1].y);
                const width = Math.abs(points[0].x - points[points.length - 1].x);
                const height = Math.abs(points[0].y - points[points.length - 1].y);

                if (canEraseStrokes) {
                    strokesScope.forEach(s => {
                        const intersects = s.points.some(p => isPointInRect(p.x, p.y, minX, minY, width, height)) ||
                            s.points.some((p, idx) => idx < s.points.length - 1 && segmentIntersectsRect(p.x, p.y, s.points[idx + 1].x, s.points[idx + 1].y, minX, minY, width, height));
                        if (intersects) strokeIdsToDelete.push(s.id);
                    });
                }

                if (canEraseImages) {
                    imagesScope.forEach(img => {
                        const intersects = !(minX > img.x + img.width || minX + width < img.x || minY > img.y + img.height || minY + height < img.y);
                        if (intersects) imageIdsToDelete.push(img.id);
                    });
                }

                if (canEraseTexts) {
                    textsScope.forEach(txt => {
                        const intersects = !(minX > txt.x + txt.width || minX + width < txt.x || minY > txt.y + txt.height || minY + height < txt.y);
                        if (intersects) textIdsToDelete.push(txt.id);
                    });
                }
            } else if (eraserMode === 'circle' && points.length > 1) {
                const cx = points[0].x;
                const cy = points[0].y;
                const radius = Math.hypot(points[points.length - 1].x - cx, points[points.length - 1].y - cy);
                const radiusSq = radius * radius;

                if (canEraseStrokes) {
                    strokesScope.forEach(s => {
                        let intersects = s.points.some(p => isPointInCircle(p.x, p.y, cx, cy, radius));
                        if (!intersects) {
                            for (let i = 0; i < s.points.length - 1; i++) {
                                if (distToSegmentSq(cx, cy, s.points[i].x, s.points[i].y, s.points[i + 1].x, s.points[i + 1].y) <= radiusSq) {
                                    intersects = true;
                                    break;
                                }
                            }
                        }
                        if (intersects) strokeIdsToDelete.push(s.id);
                    });
                }

                if (canEraseImages) {
                    imagesScope.forEach(img => {
                        const closestX = Math.max(img.x, Math.min(cx, img.x + img.width));
                        const closestY = Math.max(img.y, Math.min(cy, img.y + img.height));
                        const intersects = isPointInCircle(closestX, closestY, cx, cy, radius);
                        if (intersects) imageIdsToDelete.push(img.id);
                    });
                }

                if (canEraseTexts) {
                    textsScope.forEach(txt => {
                        const closestX = Math.max(txt.x, Math.min(cx, txt.x + txt.width));
                        const closestY = Math.max(txt.y, Math.min(cy, txt.y + txt.height));
                        const intersects = isPointInCircle(closestX, closestY, cx, cy, radius);
                        if (intersects) textIdsToDelete.push(txt.id);
                    });
                }
            }

            if (strokeIdsToDelete.length > 0) {
                handleDeleteStrokes(strokeIdsToDelete);
            }
            if (imageIdsToDelete.length > 0 || textIdsToDelete.length > 0) {
                handleDeleteElements(imageIdsToDelete, textIdsToDelete);
            }
            return;
        }

        const roundedPath = points.map(p => ({
            x: Math.round(p.x * 100) / 100,
            y: Math.round(p.y * 100) / 100,
            pressure: Math.round((p.pressure ?? 0.5) * 100) / 100
        }));

        // Pre-calcular cachedPath para renderizado idéntico tanto en profesor como en estudiante
        let cachedPath = '';
        if (effectiveStroked) {
            if (isSharpTool) {
                cachedPath = getStrokePath(roundedPath);
            } else {
                const strokeOptions = {
                    size: size,
                    ...finalOptions
                };
                const outlinePoints = getStroke(roundedPath, strokeOptions);
                cachedPath = getSvgPathFromStroke(outlinePoints);
            }
        }

        if (isSyncPaused) {
            const tempId = `temp_stroke_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const newStroke: WhiteboardStroke = {
                id: tempId, points: roundedPath, color, size, opacity, timestamp: Date.now(),
                boardId: activeBoardId, pageId: activePageId, layerId: activeLayerId, keyframeId: activeKeyframeId,
                type: tool === 'pen' ? 'pen' : 'eraser', deleted: false, options: finalOptions,
                cachedPath
            };
            setPendingStrokes(prev => [...prev, newStroke]);
            return;
        }

        setIsSyncing(true);
        try {
            const docRef = doc(collection(db, 'whiteboardStrokes'));
            const strokeId = docRef.id;

            const strokeData = {
                points: roundedPath, color, size, opacity, timestamp: Date.now(),
                boardId: activeBoardId, pageId: activePageId, layerId: activeLayerId, keyframeId: activeKeyframeId,
                type: (tool === 'pen' ? 'pen' : 'eraser') as 'pen' | 'eraser', deleted: false, options: finalOptions,
                cachedPath
            };

            const syncingStroke: WhiteboardStroke = {
                id: strokeId,
                ...strokeData,
                cachedPath
            };

            setSyncingStrokes(prev => [...prev, syncingStroke]);

            // Timeout de respaldo (2s) para evitar parpadeos si la red tiene latencia
            setTimeout(() => {
                setSyncingStrokes(prev => prev.filter(s => s.id !== strokeId));
            }, 2000);

            await setDoc(docRef, strokeData);
            recordAction({ type: 'create', targetType: 'stroke', targetId: strokeId, data: strokeData });
        } catch (e) { console.error(e); } finally { setIsSyncing(false); }
    };

    const handleLassoEnd = useCallback((closedLoop: Point[]) => {
        const selected = activeStrokes.filter(s => !lockedLayerIds.has(s.layerId || '') && s.points.some(p => isPointInPolygon(p, closedLoop)));
        const newSelectedIds = selected.map(s => s.id);

        const groupIds = new Set(selected.map(s => s.groupId).filter(Boolean));
        if (groupIds.size > 0) {
            const groupMembers = activeStrokes.filter(s => s.groupId && groupIds.has(s.groupId));
            const allIds = Array.from(new Set([...newSelectedIds, ...groupMembers.map(s => s.id)]));
            setSelectedStrokeIds(allIds);
        } else {
            setSelectedStrokeIds(newSelectedIds);
        }

        if (newSelectedIds.length === 0) {
            const selectedImg = activeImages.find(img => {
                if (lockedLayerIds.has(img.layerId || '')) return false;
                const center = { x: img.x + img.width / 2, y: img.y + img.height / 2, pressure: 0.5 };
                return isPointInPolygon(center, closedLoop);
            });
            if (selectedImg) {
                setSelectedId(selectedImg.id);
                setSelectedType('image');
                return;
            }

            const selectedTxt = activeTexts.find(txt => {
                if (lockedLayerIds.has(txt.layerId || '')) return false;
                const center = { x: txt.x + txt.width / 2, y: txt.y + txt.height / 2, pressure: 0.5 };
                return isPointInPolygon(center, closedLoop);
            });
            if (selectedTxt) {
                setSelectedId(selectedTxt.id);
                setSelectedType('text');
                return;
            }
        } else {
            setSelectedId(null);
            setSelectedType(null);
        }
    }, [activeStrokes, lockedLayerIds, activeImages, activeTexts, setSelectedStrokeIds, setSelectedId, setSelectedType]);

    const handleUpdateFirestore = useCallback(async (id: string, type: 'image' | 'text', data: any) => {
        if (id.startsWith('temp_')) {
            if (type === 'image') setPendingImages(prev => prev.map(img => img.id === id ? { ...img, ...data } : img));
            else setPendingTexts(prev => prev.map(txt => txt.id === id ? { ...txt, ...data } : txt));
            return;
        }
        const coll = type === 'image' ? 'whiteboardImages' : 'whiteboardTexts';
        setIsSyncing(true);
        try { await updateDoc(doc(db, coll, id), data); } finally { setIsSyncing(false); }
    }, [setIsSyncing]);

    const contentGroupRef = useRef<SVGGElement | null>(null);

    const handleCameraChangeDirect = useCallback((cam: { x: number, y: number, scale: number }) => {
        cameraRef.current = cam;
        if (contentGroupRef.current) {
            contentGroupRef.current.setAttribute('transform', `translate(${cam.x}, ${cam.y}) scale(${cam.scale})`);
        }
        setCamera(cam);
    }, [setCamera]);

    const handleCloseSidePanel = useCallback(() => setIsSidePanelOpen(false), []);

    const handleDragSidePanelImageStart = useCallback((e: React.DragEvent, url: string) => {
        e.dataTransfer.setData('text/plain', url);
        e.dataTransfer.effectAllowed = 'copy';
    }, []);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target?.files && e.target.files[0]) {
            setImportingFile(e.target.files[0]);
        }
    }, []);

    const { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, currentStroke, isInteracting, finishPolyline } = useWhiteboardGestures({
        tool, isTeacher, stylusOnly, isNavLocked, strokeOpts, screenToWorld, setCamera, camera, onStrokeComplete: handleStrokeComplete,
        lassoPoints, setLassoPoints: (pts) => { if (Array.isArray(pts)) { setSelectedStrokeIds([]); setStrokeSelectionBounds(null); } setLassoPoints(pts); },
        setSelectedId, setSelectedType, setTransformMode, selectedId, isCropMode,
        activeImages: localImages, activeTexts: localTexts, setImages: setLocalImages, setTexts: setLocalTexts,
        strokeSelectionBounds, selectedStrokeIds, initialTransformParams, tempStrokeTransform, setTempStrokeTransform, finalizeStrokeTransform,
        onLassoEnd: handleLassoEnd, updateItemInFirestore: handleUpdateFirestore, transformMode, drawStyle, activeStrokes, lockedLayerIds,
        eraserMode, onCameraChangeDirect: handleCameraChangeDirect
    });

    // ... (Library and Import functions omitted for brevity, keeping same logic as before) ...
    // Note: I'm keeping the rest of the file essentially unchanged, just focusing on the rendering part below.

    // ...

    // Helper function to render current drawing stroke properly
    const renderCurrentStroke = () => {
        if (!currentStroke || !isTeacher || lassoPoints) return null;

        if (tool === 'eraser') {
            if (eraserMode === 'rect' && currentStroke.length > 1) {
                const start = currentStroke[0];
                const end = currentStroke[currentStroke.length - 1];
                const minX = Math.min(start.x, end.x);
                const minY = Math.min(start.y, end.y);
                const width = Math.abs(start.x - end.x);
                const height = Math.abs(start.y - end.y);
                return (
                    <rect
                        x={minX}
                        y={minY}
                        width={width}
                        height={height}
                        fill="rgba(239, 68, 68, 0.15)"
                        stroke="rgba(239, 68, 68, 0.8)"
                        strokeWidth={2 / camera.scale}
                        strokeDasharray="4 4"
                    />
                );
            }
            if (eraserMode === 'circle' && currentStroke.length > 1) {
                const start = currentStroke[0];
                const end = currentStroke[currentStroke.length - 1];
                const radius = Math.hypot(end.x - start.x, end.y - start.y);
                return (
                    <circle
                        cx={start.x}
                        cy={start.y}
                        r={radius}
                        fill="rgba(239, 68, 68, 0.15)"
                        stroke="rgba(239, 68, 68, 0.8)"
                        strokeWidth={2 / camera.scale}
                        strokeDasharray="4 4"
                    />
                );
            }
        }

        const effectiveFilled = isFilled;
        const effectiveStroked = isStroked || (tool !== 'eraser' && !effectiveFilled);
        const shouldUseLinearPath = isSharpTool;
        const isMarker = tool === 'pen' && strokeOpts.isNaturalMarker;
        const currentMarkerScale = Number(Number(strokeOpts.markerTextureScale ?? 0.1).toFixed(2));

        return (
            <g opacity={opacity} style={isMarker ? { mixBlendMode: 'multiply', filter: `url(#marker-texture-${currentMarkerScale})` } : undefined}>
                {effectiveFilled && (
                    <path
                        d={getSimplePolygonPath(currentStroke)}
                        fill={fillColor}
                        stroke="none"
                    />
                )}

                {effectiveStroked && (
                    shouldUseLinearPath ? (
                        <path
                            d={getStrokePath(currentStroke)}
                            fill="none"
                            stroke={color}
                            strokeWidth={size}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ) : (
                        (() => {
                            let liveSimulatePressure = drawStyle === 'ink';
                            if (strokeOpts.useStylusPressure !== false) {
                                let firstPressure: number | null = null;
                                for (let i = 0; i < currentStroke.length; i++) {
                                    const pr = currentStroke[i].pressure;
                                    if (pr !== undefined && pr !== 0.5 && pr !== 1.0) {
                                        if (firstPressure === null) {
                                            firstPressure = pr;
                                        } else if (Math.abs(pr - firstPressure) > 0.01) {
                                            liveSimulatePressure = false;
                                            break;
                                        }
                                    }
                                }
                            }
                            return (
                                <path
                                    d={getSvgPathFromStroke(getStroke(currentStroke, { size, ...strokeOpts, simulatePressure: liveSimulatePressure }))}
                                    fill={tool === 'eraser' ? 'rgba(239, 68, 68, 0.4)' : color}
                                    fillOpacity={tool === 'eraser' ? 0.4 : 1}
                                    className={tool === 'eraser' ? 'animate-pulse' : ''}
                                />
                            );
                        })()
                    )
                )}
            </g>
        );
    };

    // ... (Rest of component functions: processLibraryImport, handleSaveToLibrary, etc. - keeping existing) ...
    const processLibraryImport = async (processedBlob: Blob) => {
        if (!isTeacher || !user) return;
        setIsSyncing(true);
        try {
            const file = new File([processedBlob], `lib_image_${Date.now()}.png`, { type: 'image/png' });
            const url = await uploadFile(`library/${user.uid}`, file);

            const imgData = {
                strokes: [],
                texts: [],
                images: [{
                    id: `lib_img_${Date.now()}`,
                    url: url,
                    x: 0, y: 0, width: 200, height: 200, rotation: 0,
                    opacity: 1, deleted: false
                }]
            };

            await addDoc(collection(db, 'libraryItems'), {
                teacherId: user.uid,
                type: 'image',
                name: (libraryImportFile as File).name || 'Imagen importada',
                thumbnailUrl: url,
                data: imgData,
                isQuick: true,
                timestamp: Date.now()
            });
        } catch (e) {
            console.error(e);
            alert("Error al guardar en la librerÃ­a.");
        } finally {
            setIsSyncing(false);
            setLibraryImportFile(null);
        }
    };

    const handleSaveToLibrary = async () => {
        if (!isTeacher || !user) return;
        if (selectedStrokeIds.length === 0 && !selectedId) {
            alert("No hay nada seleccionado para guardar.");
            return;
        }

        const selectedStrokes = activeStrokes.filter(s => selectedStrokeIds.includes(s.id));
        const selImages = selectedId && !selectedStrokeIds.length ? activeImages.filter(i => i.id === selectedId) : [];
        const selTexts = selectedId && !selectedStrokeIds.length ? activeTexts.filter(t => t.id === selectedId) : [];

        const normalized = normalizeItems(selectedStrokes, selImages, selTexts);

        if (normalized) {
            const name = prompt("Nombre del grupo/item para la librerÃ­a:", "Nuevo Grupo");
            if (!name) return;

            let thumbUrl = '';
            if (selImages.length === 1 && selectedStrokes.length === 0 && selTexts.length === 0) {
                thumbUrl = selImages[0].url;
            } else {
                thumbUrl = generateThumbnailSvg(normalized.data, normalized.width, normalized.height);
            }

            await addDoc(collection(db, 'libraryItems'), {
                teacherId: user.uid,
                type: selectedStrokeIds.length > 0 ? 'group' : (selImages.length > 0 ? 'image' : 'group'),
                name,
                thumbnailUrl: thumbUrl,
                data: normalized.data,
                isQuick: true,
                timestamp: Date.now()
            });

            setSelectedStrokeIds([]);
            setStrokeSelectionBounds(null);
            setSelectedId(null);
            setTool('pen');
        }
    };

    const handleSaveBoardAsClass = async () => {
        if (!isTeacher || !user || !activeBoardId) return;
        const name = prompt("Nombre de la clase para guardar:", boards.find(b => b.id === activeBoardId)?.name || "Clase Guardada");
        if (!name) return;
        await saveBoardToLibrary(activeBoardId, user.uid, name);
    };

    const handleAddItemToCanvas = async (item: LibraryItem) => {
        if (!activeBoardId || !activePageId) return;
        const centerX = (dimensions.width / 2 - camera.x) / camera.scale;
        const centerY = (dimensions.height / 2 - camera.y) / camera.scale;
        const x = centerX - 100;
        const y = centerY - 100;
        await handleLibraryItemDrop(item, x, y, true);
    };

    const handleAddItemToTopLeft = async (item: LibraryItem) => {
        if (!activeBoardId || !activePageId || !containerRef.current) return;
        // place near top-left of the visible canvas area with a small margin
        try {
            const rect = containerRef.current.getBoundingClientRect();
            const clientX = rect.left + 40;
            const clientY = rect.top + 40;
            const { x, y } = screenToWorld(clientX, clientY);
            // small offset so item is fully visible
            await handleLibraryItemDrop(item, x, y, false);
        } catch (e) {
            console.error('Error adding item to top-left:', e);
        }
    };

    const handleLibraryManualDrop = async (item: LibraryItem, clientX: number, clientY: number) => {
        const { x, y } = screenToWorld(clientX, clientY);
        await handleLibraryItemDrop(item, x, y, false);
    };

    const handleRemoveLibraryItem = async (itemId: string) => {
        if (!isTeacher) return;
        requestConfirm("Â¿Eliminar de librerÃ­a?", "Esta acciÃ³n no se puede deshacer.", async () => {
            try {
                await deleteDoc(doc(db, 'libraryItems', itemId));
            } catch (error) {
                console.error("Error removing library item:", error);
            }
        }, true);
    };

    const handleLibraryItemDrop = async (item: LibraryItem, x: number, y: number, isCenter: boolean) => {
        if (!activeBoardId || !activePageId) return;

        try {
            const batch = writeBatch(db);
            const { strokes, images, texts } = item.data;
            const newGroupId = item.type === 'group' ? `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;

            strokes.forEach((s: any) => {
                const newRef = doc(collection(db, 'whiteboardStrokes'));
                const { id, groupId: oldGroupId, ...safeStroke } = s;
                const newPoints = s.points.map((p: Point) => ({ ...p, x: p.x + x, y: p.y + y }));

                const strokeData: any = {
                    ...safeStroke,
                    points: newPoints,
                    boardId: activeBoardId,
                    pageId: activePageId,
                    layerId: activeLayerId,
                    keyframeId: activeKeyframeId,
                    timestamp: Date.now()
                };
                if (newGroupId) strokeData.groupId = newGroupId;
                batch.set(newRef, strokeData);
            });

            images.forEach((img: any) => {
                const newRef = doc(collection(db, 'whiteboardImages'));
                const { id, groupId: oldGroupId, ...safeImage } = img;
                const imageData: any = {
                    ...safeImage,
                    x: img.x + x,
                    y: img.y + y,
                    boardId: activeBoardId,
                    pageId: activePageId,
                    layerId: activeLayerId,
                    keyframeId: activeKeyframeId,
                    timestamp: Date.now()
                };
                if (newGroupId) imageData.groupId = newGroupId;
                batch.set(newRef, imageData);
            });

            texts.forEach((txt: any) => {
                const newRef = doc(collection(db, 'whiteboardTexts'));
                const { id, groupId: oldGroupId, ...safeText } = txt;
                const textData: any = {
                    ...safeText,
                    x: txt.x + x,
                    y: txt.y + y,
                    boardId: activeBoardId,
                    pageId: activePageId,
                    layerId: activeLayerId,
                    keyframeId: activeKeyframeId,
                    timestamp: Date.now()
                };
                if (newGroupId) textData.groupId = newGroupId;
                batch.set(newRef, textData);
            });

            setIsSyncing(true);
            await batch.commit();
        } catch (error) {
            console.error("Error adding library item:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLibraryDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        if (!activeBoardId || !activePageId) return;
        try {
            const dataStr = e.dataTransfer.getData('application/json');
            if (!dataStr) return;
            const item = JSON.parse(dataStr) as LibraryItem;
            const { x, y } = screenToWorld(e.clientX, e.clientY);
            await handleLibraryItemDrop(item, x, y, false);
        } catch (error) {
            console.error("Error dropping library item:", error);
        }
    };

    const handleLibraryDragStart = (e: React.DragEvent, item: LibraryItem) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const base64ToBlob = (base64: string, mimeType: string) => {
        const byteString = atob(base64.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeType });
    };

    const handleSidePanelImageDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        if (!activeBoardId || !activePageId || !isTeacher) return;

        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;

        const { x, y } = screenToWorld(e.clientX, e.clientY);

        setIsSyncing(true);
        try {
            let finalUrl = rawData;
            if (rawData.startsWith('data:image')) {
                const blob = base64ToBlob(rawData, 'image/png');
                const file = new File([blob], `ai-gen-${Date.now()}.png`, { type: 'image/png' });
                finalUrl = await uploadFile(`whiteboard-assets/ai-generated/${user?.uid}`, file);
            }

            const imageData = {
                boardId: activeBoardId,
                pageId: activePageId,
                layerId: activeLayerId,
                keyframeId: activeKeyframeId,
                url: finalUrl,
                x: x - 150,
                y: y - 150,
                width: 300,
                height: 300,
                rotation: 0,
                zIndex: images.length,
                timestamp: Date.now(),
                deleted: false,
                teacherOnly: false
            };

            const docRef = await addDoc(collection(db, 'whiteboardImages'), imageData);
            recordAction({ type: 'create', targetType: 'image', targetId: docRef.id, data: imageData });
        } catch (e) {
            console.error("Error dropping panel image:", e);
            alert("Error al subir la imagen generada. Verifique su conexiÃ³n.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleToggleSync = async () => {
        const newState = !isSyncPaused;
        setIsSyncPaused(newState);

        if (newState) {
            if (toggleGlobalSync) await toggleGlobalSync(false);
        } else {
            setIsSyncing(true);
            try {
                const batch = writeBatch(db);
                pendingStrokes.forEach(s => { const { id, ...data } = s; batch.set(doc(collection(db, 'whiteboardStrokes')), data); });
                pendingImages.forEach(i => { const { id, ...data } = i; batch.set(doc(collection(db, 'whiteboardImages')), data); });
                pendingTexts.forEach(t => { const { id, ...data } = t; batch.set(doc(collection(db, 'whiteboardTexts')), data); });
                Object.entries(pendingKeyframes).forEach(([pid, kfs]) => { if ((kfs as string[]).length > 0) batch.update(doc(db, 'whiteboardPages', pid), { keyframeIds: arrayUnion(...(kfs as string[])) }); });
                await batch.commit();
                setPendingStrokes([]); setPendingImages([]); setPendingTexts([]); setPendingKeyframes({});
                if (toggleGlobalSync) await toggleGlobalSync(true);
            } catch (e) {
                console.error("Error syncing:", e);
            } finally {
                setIsSyncing(false);
            }
        }
    };

    const handleAddKeyframe = async () => {
        if (!activePageId) return;
        const newKeyframeId = `kf_${Date.now()}`;
        if (isSyncPaused) {
            setPendingKeyframes(prev => ({ ...prev, [activePageId]: [...(prev[activePageId] || []), newKeyframeId] }));
            activeStrokes.filter(s => !s.deleted).forEach(s => setPendingStrokes(prev => [...prev, { ...s, id: `temp_s_${Date.now()}`, keyframeId: newKeyframeId, timestamp: Date.now() }]));
            activeImages.filter(i => !i.deleted).forEach(i => setPendingImages(prev => [...prev, { ...i, id: `temp_i_${Date.now()}`, keyframeId: newKeyframeId, timestamp: Date.now() }]));
            activeTexts.filter(t => !t.deleted).forEach(t => setPendingTexts(prev => [...prev, { ...t, id: `temp_t_${Date.now()}`, keyframeId: newKeyframeId, timestamp: Date.now() }]));
            setActiveKeyframeId(newKeyframeId);
            return;
        }
        setIsSyncing(true);
        try {
            const batch = writeBatch(db);
            const newKeyframes = [...currentPageKeyframes, newKeyframeId];
            batch.update(doc(db, 'whiteboardPages', activePageId), { keyframeIds: newKeyframes });
            activeStrokes.forEach(s => !s.deleted && batch.set(doc(collection(db, 'whiteboardStrokes')), { ...s, id: undefined, keyframeId: newKeyframeId, timestamp: Date.now(), deleted: false }));
            activeImages.forEach(i => !i.deleted && batch.set(doc(collection(db, 'whiteboardImages')), { ...i, id: undefined, keyframeId: newKeyframeId, timestamp: Date.now(), deleted: false }));
            activeTexts.forEach(t => !t.deleted && batch.set(doc(collection(db, 'whiteboardTexts')), { ...t, id: undefined, keyframeId: newKeyframeId, timestamp: Date.now(), deleted: false }));
            await batch.commit();
            setActiveKeyframeId(newKeyframeId);
        } catch (e) { console.error(e); } finally { setIsSyncing(false); }
    };

    const handleDeleteKeyframe = async (keyframeIdToDelete: string) => {
        if (!activePageId || currentPageKeyframes.length <= 1) return;
        if (isSyncPaused) {
            if (!pendingKeyframes[activePageId]?.includes(keyframeIdToDelete)) { alert("Offline: Solo puedes borrar fotogramas locales."); return; }
            setPendingKeyframes(prev => ({ ...prev, [activePageId]: prev[activePageId].filter(k => k !== keyframeIdToDelete) }));
            setPendingStrokes(prev => prev.filter(s => s.keyframeId !== keyframeIdToDelete));
            setPendingImages(prev => prev.filter(i => i.keyframeId !== keyframeIdToDelete));
            setPendingTexts(prev => prev.filter(t => t.keyframeId !== keyframeIdToDelete));
            if (activeKeyframeId === keyframeIdToDelete) {
                const newKeys = currentPageKeyframes.filter(k => k !== keyframeIdToDelete);
                setActiveKeyframeId(newKeys[Math.max(0, newKeys.length - 1)] || 'kf_default');
            }
            return;
        }
        requestConfirm("Â¿Eliminar Fotograma?", "Se borrarÃ¡n objetos.", async () => {
            setIsSyncing(true);
            try {
                const batch = writeBatch(db);
                if (keyframeIdToDelete === activeKeyframeId) {
                    activeStrokes.forEach(s => batch.delete(doc(db, 'whiteboardStrokes', s.id)));
                    activeImages.forEach(i => batch.delete(doc(db, 'whiteboardImages', i.id)));
                    activeTexts.forEach(t => batch.delete(doc(db, 'whiteboardTexts', t.id)));
                }
                const newKeyframes = currentPageKeyframes.filter(k => k !== keyframeIdToDelete);
                batch.update(doc(db, 'whiteboardPages', activePageId), { keyframeIds: newKeyframes });
                await batch.commit();
                if (activeKeyframeId === keyframeIdToDelete) {
                    const nextId = newKeyframes[Math.max(0, currentPageKeyframes.indexOf(keyframeIdToDelete) - 1)];
                    setActiveKeyframeId(nextId);
                }
            } catch (e) { console.error(e); } finally { setIsSyncing(false); }
        }, true);
    };

    const handlePrevKeyframe = () => { const idx = currentPageKeyframes.indexOf(activeKeyframeId); if (idx > 0) setActiveKeyframeId(currentPageKeyframes[idx - 1]); };
    const handleNextKeyframe = () => { const idx = currentPageKeyframes.indexOf(activeKeyframeId); if (idx < currentPageKeyframes.length - 1) setActiveKeyframeId(currentPageKeyframes[idx + 1]); };

    const handleRenameBoard = async (boardId: string, currentName: string) => {
        const newName = window.prompt("Nombre de la clase:", currentName);
        if (newName && newName.trim() !== "" && newName !== currentName) {
            try {
                await updateDoc(doc(db, 'whiteboardBoards', boardId), { name: newName.trim() });
            } catch (error) {
                console.error("Error renaming board:", error);
            }
        }
    };

    const handleDeleteBoard = (boardId: string) => { requestConfirm("Â¿Borrar Clase?", "Irreversible.", () => deleteBoard(boardId), true); };
    const handleDeleteLayer = (layerId: string) => { requestConfirm("Â¿Eliminar Capa?", "Irreversible.", () => deleteLayer(layerId), true); };

    const handleZoomExtents = useCallback(() => {
        const margin = 20;
        const availableWidth = Math.max(100, dimensions.width - margin * 2);
        const availableHeight = Math.max(100, dimensions.height - margin * 2);
        const newScale = Math.min(availableWidth / boardSettings.width, availableHeight / boardSettings.height);
        setCamera({ scale: newScale, x: (dimensions.width - boardSettings.width * newScale) / 2, y: (dimensions.height - boardSettings.height * newScale) / 2 });
    }, [dimensions.width, dimensions.height, boardSettings.width, boardSettings.height]);

    // Use a ref to always read latest camera inside native wheel handler
    const cameraRef = useRef(camera);
    useEffect(() => { cameraRef.current = camera; }, [camera]);

    // Attach a native wheel listener with passive: false to allow preventDefault
    useEffect(() => {
        const node = svgRef.current;
        if (!node) return;

        let wheelRafId: number | null = null;
        let pendingWheelCamera: { x: number, y: number, scale: number } | null = null;

        const wheelHandler = (ev: WheelEvent) => {
            try { ev.preventDefault(); } catch (e) { /* ignore */ }
            if (isNavLocked) return;

            const rect = node.getBoundingClientRect();
            const mouseX = ev.clientX - rect.left;
            const mouseY = ev.clientY - rect.top;

            const cur = pendingWheelCamera || cameraRef.current;

            // Detectar trackpad pan (desplazamiento con dos dedos sin ctrlKey) vs zoom
            const isPinchZoom = ev.ctrlKey || ev.metaKey;
            const isMouseWheel = ev.deltaMode !== 0 || Math.abs(ev.deltaY) >= 40;

            if (!isPinchZoom && !isMouseWheel && (Math.abs(ev.deltaX) > 0 || Math.abs(ev.deltaY) < 40)) {
                // Two-finger trackpad panning fluido
                const newX = cur.x - ev.deltaX;
                const newY = cur.y - ev.deltaY;
                pendingWheelCamera = { x: newX, y: newY, scale: cur.scale };
            } else {
                // Zooming (rueda de ratón, Ctrl+Wheel o pellizco en trackpad)
                const delta = ev.deltaY;
                const zoomIntensity = isPinchZoom ? 0.006 : 0.0015;
                const zoomFactor = Math.exp(-delta * zoomIntensity);
                const newScale = Math.min(10, Math.max(0.1, cur.scale * zoomFactor));

                // Zoom anclado exactamente en la posición del puntero dentro del SVG
                const worldX = (mouseX - cur.x) / cur.scale;
                const worldY = (mouseY - cur.y) / cur.scale;

                const newX = mouseX - worldX * newScale;
                const newY = mouseY - worldY * newScale;
                pendingWheelCamera = { x: newX, y: newY, scale: newScale };
            }

            cameraRef.current = pendingWheelCamera;

            // Aplicar inmediatamente al elemento SVG para respuesta a 60/120 FPS sin lag
            if (contentGroupRef.current && pendingWheelCamera) {
                contentGroupRef.current.setAttribute('transform', `translate(${pendingWheelCamera.x}, ${pendingWheelCamera.y}) scale(${pendingWheelCamera.scale})`);
            }

            if (!wheelRafId) {
                wheelRafId = requestAnimationFrame(() => {
                    wheelRafId = null;
                    if (pendingWheelCamera) {
                        setCamera(pendingWheelCamera);
                        pendingWheelCamera = null;
                    }
                });
            }
        };

        node.addEventListener('wheel', wheelHandler, { passive: false });
        return () => {
            if (wheelRafId) cancelAnimationFrame(wheelRafId);
            node.removeEventListener('wheel', wheelHandler as EventListener);
        };
    }, [svgRef, isNavLocked, setCamera]);

    const handleAddText = async (x: number, y: number) => {
        if (!isTeacher || !activeBoardId || !activePageId) return;
        const textData = {
            boardId: activeBoardId, pageId: activePageId, layerId: activeLayerId, keyframeId: activeKeyframeId,
            content: 'Texto nuevo', x: x - 100, y: y - 25, width: 200, height: 50, rotation: 0, zIndex: texts.length,
            timestamp: Date.now(), deleted: false, color: '#000000', fontSize: 24, textAlign: 'left' as const, fontFamily: 'sans' as const, backgroundColor: 'white', borderColor: '#d1d5db',
            // Nuevo: por defecto permitimos copiar el texto
            allowCopy: true
        };
        if (isSyncPaused) {
            const tempId = `temp_text_${Date.now()}`;
            setPendingTexts(prev => [...prev, { ...textData, id: tempId }]);
            setEditingTextId(tempId);
            setTool('move');
            return;
        }
        setIsSyncing(true);
        try {
            const docRef = await addDoc(collection(db, 'whiteboardTexts'), textData);
            recordAction({ type: 'create', targetType: 'text', targetId: docRef.id, data: textData });
            setEditingTextId(docRef.id);
            setTool('move');
        } finally { setIsSyncing(false); }
    };

    const handleUpdateText = async (id: string, updates: Partial<ExtendedWhiteboardText>) => {
        if (id.startsWith('temp_')) {
            setPendingTexts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
            return;
        }
        setIsSyncing(true);
        try {
            await updateDoc(doc(db, 'whiteboardTexts', id), updates);
        } finally { setIsSyncing(false); }
    };

    const handleEditImage = async () => {
        if (selectedId && selectedType === 'image') {
            const img = images.find(i => i.id === selectedId);
            if (!img) return;
            try {
                const response = await fetch(img.url);
                const blob = await response.blob();
                setEditingImageId(selectedId);
                setEditingImageTeacherOnly(!!img.teacherOnly);
                setImportingFile(blob);
            } catch (e) { alert("Error al cargar imagen."); }
        }
    };

    const onPointerDownWrapper = (e: React.PointerEvent) => {
        if (!activePageId) return;
        if (editingTextId) { e.stopPropagation(); return; }
        if (tool === 'text' && isTeacher) {
            const { x, y } = screenToWorld(e.clientX, e.clientY);
            handleAddText(x, y);
            return;
        }
        handlePointerDown(e);
    }

    // Keyboard shortcuts: Ctrl/Cmd+Z => undo, Ctrl/Cmd+Y or Ctrl+Shift+Z => redo
    useEffect(() => {
        const onKey = (ev: KeyboardEvent) => {
            const mod = ev.ctrlKey || ev.metaKey;
            if (!mod) return;
            const key = ev.key.toLowerCase();
            if (key === 'z' && !ev.shiftKey) {
                ev.preventDefault();
                try { undo(); } catch (e) { console.error(e); }
            } else if (key === 'y' || (key === 'z' && ev.shiftKey)) {
                ev.preventDefault();
                try { redo(); } catch (e) { console.error(e); }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [undo, redo]);

    const handleImageProcessed = async (processedBlob: Blob, teacherOnly: boolean) => {
        if (!activeBoardId || !activePageId) return;
        setIsSyncing(true);
        try {
            const file = new File([processedBlob], `wb_image_${Date.now()}.png`, { type: 'image/png' });
            const url = await uploadFile('whiteboard-assets', file);
            const isTeacherOnly = !!teacherOnly;

            if (editingImageId) {
                const oldImg = images.find(i => i.id === editingImageId);
                if (oldImg) { recordAction({ type: 'update', targetType: 'image', targetId: editingImageId, prevData: { ...oldImg }, newData: { ...oldImg, url, teacherOnly: isTeacherOnly } }); await updateDoc(doc(db, 'whiteboardImages', editingImageId), { url, teacherOnly: isTeacherOnly }); }
                setEditingImageId(null);
                setEditingImageTeacherOnly(false);
            } else {
                const worldPos = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
                const imageData = { boardId: activeBoardId, pageId: activePageId, layerId: activeLayerId, keyframeId: activeKeyframeId, url, x: worldPos.x - 150, y: worldPos.y - 150, width: 300, height: 300, rotation: 0, zIndex: images.length, timestamp: Date.now(), deleted: false, teacherOnly: isTeacherOnly };
                if (isSyncPaused) { setPendingImages(prev => [...prev, { ...imageData, id: `temp_img_${Date.now()}` }]); }
                else { const docRef = await addDoc(collection(db, 'whiteboardImages'), imageData); recordAction({ type: 'create', targetType: 'image', targetId: docRef.id, data: imageData }); }
            }
        } catch (e) { console.error(e); } finally { setIsSyncing(false); setImportingFile(null); }
    };

    const handleClearBoard = () => {
        if (!isTeacher || !activeBoardId) return;
        requestConfirm("Â¿Vaciar Pizarra?", "Irreversible.", async () => {
            setIsSyncing(true);
            try {
                const strokeRefs = activeStrokes.filter(s => !s.id.startsWith('temp_')).map(s => doc(db, 'whiteboardStrokes', s.id));
                const imageRefs = activeImages.filter(i => !i.id.startsWith('temp_')).map(i => doc(db, 'whiteboardImages', i.id));
                const textRefs = activeTexts.filter(t => !t.id.startsWith('temp_')).map(t => doc(db, 'whiteboardTexts', t.id));
                const allRefs = [...strokeRefs, ...imageRefs, ...textRefs];
                const CHUNK_SIZE = 500;
                for (let i = 0; i < allRefs.length; i += CHUNK_SIZE) {
                    const chunk = allRefs.slice(i, i + CHUNK_SIZE);
                    const batch = writeBatch(db);
                    chunk.forEach(ref => batch.delete(ref));
                    await batch.commit();
                }
                setPendingStrokes([]); setPendingImages([]); setPendingTexts([]); clearHistory();
            } catch (error) {
                console.error("Error clearing board:", error);
                alert("Hubo un error al vaciar la pizarra. Por favor, intÃ©ntelo de nuevo.");
            } finally { setIsSyncing(false); }
        }, true);
    };

    const handleSaveSnapshot = async () => {
        const name = prompt("Nombre del estado:");
        if (!name) return;
        await createSnapshot(name, { strokes: strokes.map(({ cachedPath, ...s }: any) => ({ ...s })), images, texts });
    };

    const dynamicViewBox = useMemo(() => `0 0 ${dimensions.width} ${dimensions.height}`, [dimensions]);
    const contentTransform = `translate(${camera.x}, ${camera.y}) scale(${camera.scale})`;

    const grid = (boardSettings as any).grid || {};
    const shouldRenderGrid = grid.enabled && (!grid.teacherOnly || isTeacher);

    const editingTextObject = useMemo(() => {
        if (!editingTextId) return null;
        return activeTexts.find(t => t.id === editingTextId) || null;
    }, [editingTextId, activeTexts]);

    const showTransformConfirm = useMemo(() => {
        return isTeacher && (
            (selectedStrokeIds.length > 0 && strokeSelectionBounds) ||
            (!!selectedId)
        );
    }, [isTeacher, selectedStrokeIds, strokeSelectionBounds, selectedId]);

    const transformToolbarPos = useMemo(() => {
        let bounds = null;
        if (strokeSelectionBounds) {
            bounds = {
                cx: strokeSelectionBounds.cx + tempStrokeTransform.x,
                cy: strokeSelectionBounds.cy + tempStrokeTransform.y,
                bottomY: strokeSelectionBounds.y + tempStrokeTransform.y + strokeSelectionBounds.height
            };
        } else if (selectedId) {
            const item = selectedType === 'image'
                ? localImages.find(i => i.id === selectedId)
                : localTexts.find(t => t.id === selectedId);
            if (item) {
                bounds = {
                    cx: item.x + item.width / 2,
                    cy: item.y + item.height / 2,
                    bottomY: item.y + item.height
                };
            }
        }
        if (!bounds) return null;
        const x = (bounds.cx * camera.scale) + camera.x;
        const y = (bounds.bottomY * camera.scale) + camera.y + 20;
        return { x, y };
    }, [strokeSelectionBounds, tempStrokeTransform, camera, selectedId, selectedType, localImages, localTexts]);


    return (
        <div
            ref={containerRef}
            className="flex flex-col h-[calc(100vh-theme(spacing.20))] w-full bg-[#1e1e1e] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 relative overflow-hidden z-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                if (e.dataTransfer.types.includes('text/plain')) {
                    handleSidePanelImageDrop(e);
                } else {
                    handleLibraryDrop(e);
                }
            }}
        >
            <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
            <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isDestructive={confirmConfig.isDestructive} />

            {showLibraryManager && user && (
                <LibraryManager
                    user={user}
                    onClose={() => setShowLibraryManager(false)}
                    onAddToCanvas={handleAddItemToCanvas}
                />
            )}

            {showBoardTabs && (isTeacher || !syncEnabled) && (
                <div className="flex-none h-12 bg-gray-200 dark:bg-gray-800 flex items-center px-2 border-b border-gray-300 dark:border-gray-700 rounded-t-2xl justify-between">
                    <div className="flex items-center gap-1 overflow-x-auto flex-1 pr-4 no-scrollbar">
                        {sortedBoards.map((board, idx) => (
                            <div
                                key={board.id}
                                draggable={isTeacher}
                                onDragStart={(e) => { if (isTeacher && board.id) handleDragStartBoard(e, board.id); }}
                                onDragOver={(e) => { if (isTeacher) handleDragOverBoard(e); }}
                                onDrop={(e) => { if (isTeacher) handleDropOnIndex(e, idx); }}
                                onClick={() => setActiveBoardId(board.id)}
                                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer text-xs font-bold transition-all select-none min-w-[120px] max-w-[350px] h-full border-b-2 ${activeBoardId === board.id ? 'bg-white dark:bg-black text-primary border-primary' : 'bg-transparent text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-700 border-transparent'}`}
                            >
                                <span className="truncate flex-grow" title={board.name}>{board.name}</span>

                                {/* Acciones flotantes que aparecen al hacer hover (teacher only) */}
                                {isTeacher && (
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <button onClick={(e) => { e.stopPropagation(); addBoardAtIndex(idx); }} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400" title="Agregar antes"><IconPlus className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); addBoardAtIndex(idx + 1); }} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400" title="Agregar despuÃ©s"><IconPlus className="w-3 h-3" /></button>
                                        
                                        {activeBoardId === board.id && (
                                            <>
                                                <button onClick={(e) => { e.stopPropagation(); handleRenameBoard(board.id, board.name); }} className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-gray-400 hover:text-blue-500" title="Renombrar"><IconPencil className="w-3 h-3" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); exportBoard(board.id); }} className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-gray-400 hover:text-blue-500" title="Descargar"><IconDownload className="w-3 h-3" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleSaveBoardAsClass(); }} className="p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 text-gray-400 hover:text-green-500" title="Guardar en LibrerÃ­a"><IconBook className="w-3 h-3" /></button>
                                                {sortedBoards.length > 1 && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board.id); }} className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-400 hover:text-red-500" title="Borrar"><IconX className="w-3 h-3" /></button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 bg-gray-200 dark:bg-gray-800 pl-2 shadow-[-10px_0_10px_-5px_rgba(0,0,0,0.1)] dark:shadow-none z-10">
                        {isTeacher && (
                            <>
                                <button onClick={() => { const name = prompt("Nombre de la nueva clase:"); if (name) createBoard(name); }} className="p-2 text-gray-500 hover:text-primary hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Nueva Clase"><IconPlus className="w-4 h-4" /></button>
                                <label className="p-2 text-gray-500 hover:text-green-500 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer" title="Cargar (.json)"><IconUpload className="w-4 h-4" /><input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={(e) => { if (e.target.files?.[0]) importBoard(e.target.files[0]); if (importInputRef.current) importInputRef.current.value = ''; }} /></label>
                                <button onClick={() => setShowClassLibraryManager(true)} className="p-2 text-gray-500 hover:text-blue-500 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors" title="LibrerÃ­a de Clases"><IconBook className="w-4 h-4" /></button>
                                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1"></div>
                            </>
                        )}
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider leading-none mb-0.5">SalÃ³n</span>
                                <span className="font-bold text-gray-700 dark:text-gray-200 truncate max-w-[150px] text-sm leading-none" title={courseTitle}>
                                    {courseTitle || '...'}
                                </span>
                            </div>
                            {courseCode && isTeacher && (
                                <div className="flex flex-col items-end border-l border-gray-300 dark:border-gray-600 pl-2">
                                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider leading-none mb-0.5">CÃ³digo</span>
                                    <span className="font-mono font-bold text-primary text-sm leading-none select-all cursor-pointer hover:scale-105 transition-transform" title="Copiar cÃ³digo" onClick={() => navigator.clipboard.writeText(courseCode)}>
                                        {courseCode}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div id="whiteboard-canvas-container" className={`flex-grow relative overflow-hidden bg-[#2a2a2a] ${!isTeacher && isInteracting ? 'cursor-grabbing' : (!isTeacher ? 'cursor-grab' : '')}`}>
                {!activePageId && <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"><div className="bg-black/50 backdrop-blur-md p-6 rounded-2xl text-white text-center"><p className="font-bold text-lg mb-2">Cargando...</p></div></div>}

                {editingTextId && editingTextObject && (
                    <HtmlTextEditor
                        text={editingTextObject}
                        camera={camera}
                        layers={layers}
                        onUpdate={(updates) => handleUpdateText(editingTextId, updates)}
                        onClose={() => setEditingTextId(null)}
                        onCopy={() => {
                            // Respetar flag allowCopy
                            const txt = editingTextObject;
                            if (!txt) return;
                            if (txt.allowCopy === false) {
                                // Indicamos al profesor que la copia estÃ¡ deshabilitada
                                alert('Copiar deshabilitado para este texto.');
                                return;
                            }
                            try {
                                const temp = document.createElement('div');
                                temp.innerHTML = txt.content || '';
                                const textToCopy = temp.innerText || temp.textContent || '';
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                    navigator.clipboard.writeText(textToCopy);
                                } else {
                                    // Fallback
                                    const ta = document.createElement('textarea');
                                    ta.value = textToCopy;
                                    document.body.appendChild(ta);
                                    ta.select();
                                    document.execCommand('copy');
                                    document.body.removeChild(ta);
                                }
                            } catch (e) {
                                console.error('Error copiando texto:', e);
                            }
                        }}
                        onCut={() => { }}
                        onDelete={async () => {
                            if (editingTextId.startsWith('temp_')) {
                                setPendingTexts(prev => prev.filter(t => t.id !== editingTextId));
                            } else {
                                const textObj = activeTexts.find(t => t.id === editingTextId);
                                if (textObj) {
                                    const { id: _, ...data } = textObj;
                                    recordAction({ type: 'delete', targetType: 'text', targetId: editingTextId, data });
                                    await deleteDoc(doc(db, 'whiteboardTexts', editingTextId));
                                }
                            }
                            setEditingTextId(null);
                        }}
                        onMoveToLayer={(lId) => handleUpdateText(editingTextId, { layerId: lId })}
                    />
                )}

                <svg
                    ref={svgRef}
                    className="w-full h-full"
                    viewBox={dynamicViewBox}
                    onPointerDown={onPointerDownWrapper}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onLostPointerCapture={handlePointerCancel}
                    onContextMenu={(e) => e.preventDefault()}
                    preserveAspectRatio="none"
                    style={{
                        touchAction: 'none',
                        pointerEvents: activePageId ? 'auto' : 'none',
                        marginRight: isSidePanelOpen ? '320px' : '0',
                        transition: 'margin-right 0.3s ease'
                    }}
                >
                    <defs>
                        {localImages.map(img => <clipPath key={`clip-${img.id}`} id={`clip-${img.id}`}><rect x={(img.crop?.x || 0) * img.width} y={(img.crop?.y || 0) * img.height} width={(img.crop?.width || 1) * img.width} height={(img.crop?.height || 1) * img.height} /></clipPath>)}
                        <filter id="shadow"><feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="black" floodOpacity="0.3" /></filter>

                        {/* Static default marker-texture for backward compatibility */}
                        <filter id="marker-texture" x="-20%" y="-20%" width="140%" height="140%">
                            <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="3" result="noise" />
                            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" in="noise" result="alphaNoise" />
                            <feComponentTransfer in="alphaNoise" result="adjustedNoise">
                                <feFuncA type="linear" slope="1.5" intercept="-0.1" />
                            </feComponentTransfer>
                            <feComposite operator="in" in="SourceGraphic" in2="adjustedNoise" />
                        </filter>
                        <filter id="marker-texture-0.1" x="-20%" y="-20%" width="140%" height="140%">
                            <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="3" result="noise" />
                            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" in="noise" result="alphaNoise" />
                            <feComponentTransfer in="alphaNoise" result="adjustedNoise">
                                <feFuncA type="linear" slope="1.5" intercept="-0.1" />
                            </feComponentTransfer>
                            <feComposite operator="in" in="SourceGraphic" in2="adjustedNoise" />
                        </filter>

                        {/* Dynamic marker-texture filters based on used scales */}
                        {markerScales.map(scale => (
                            <filter key={`marker-texture-${scale}`} id={`marker-texture-${scale}`} x="-20%" y="-20%" width="140%" height="140%">
                                <feTurbulence type="fractalNoise" baseFrequency={scale} numOctaves="3" result="noise" />
                                <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" in="noise" result="alphaNoise" />
                                <feComponentTransfer in="alphaNoise" result="adjustedNoise">
                                    <feFuncA type="linear" slope="1.5" intercept="-0.1" />
                                </feComponentTransfer>
                                <feComposite operator="in" in="SourceGraphic" in2="adjustedNoise" />
                            </filter>
                        ))}
                        {shouldRenderGrid && (
                            <>
                                <pattern id="grid-minor" width={grid.minor?.spacing || 20} height={grid.minor?.spacing || 20} patternUnits="userSpaceOnUse">
                                    <path d={`M ${grid.minor?.spacing || 20} 0 L 0 0 0 ${grid.minor?.spacing || 20}`} fill="none" stroke={grid.minor?.color || '#e5e7eb'} strokeWidth="1" strokeOpacity={grid.minor?.opacity ?? 0.5} />
                                </pattern>
                                <pattern id="grid-medium" width={grid.medium?.spacing || 100} height={grid.medium?.spacing || 100} patternUnits="userSpaceOnUse">
                                    <path d={`M ${grid.medium?.spacing || 100} 0 L 0 0 0 ${grid.medium?.spacing || 100}`} fill="none" stroke={grid.medium?.color || '#9ca3af'} strokeWidth="1" strokeOpacity={grid.medium?.opacity ?? 0.5} />
                                </pattern>
                                <pattern id="grid-major" width={grid.major?.spacing || 500} height={grid.major?.spacing || 500} patternUnits="userSpaceOnUse">
                                    <path d={`M ${grid.major?.spacing || 500} 0 L 0 0 0 ${grid.major?.spacing || 500}`} fill="none" stroke={grid.major?.color || '#374151'} strokeWidth="2" strokeOpacity={grid.major?.opacity ?? 0.5} />
                                </pattern>
                            </>
                        )}
                    </defs>

                    <g
                        ref={contentGroupRef}
                        transform={contentTransform}
                        style={{
                            pointerEvents: isInteracting && (tool === 'hand' || !isTeacher) ? 'none' : 'auto'
                        }}
                    >
                        {/* Static Graphics (Background, Grid, BoardLayers) */}
                        <g>
                            <g filter="url(#shadow)"><rect x="0" y="0" width={boardSettings.width || 1920} height={boardSettings.height || 1080} fill={boardSettings.bgColor} />{boardSettings.bgImageUrl && <image href={boardSettings.bgImageUrl} x="0" y="0" width={boardSettings.width || 1920} height={boardSettings.height || 1080} preserveAspectRatio="xMidYMid slice" onDragStart={(e) => e.preventDefault()} style={{ pointerEvents: 'none' }} />}</g>

                            {shouldRenderGrid && (
                                <g pointerEvents="none">
                                    <rect width={Math.max(12000, (boardSettings.width || 1920) * 4)} height={Math.max(12000, (boardSettings.height || 1080) * 4)} x={-Math.max(5000, (boardSettings.width || 1920))} y={-Math.max(5000, (boardSettings.height || 1080))} fill="url(#grid-minor)" />
                                    <rect width={Math.max(12000, (boardSettings.width || 1920) * 4)} height={Math.max(12000, (boardSettings.height || 1080) * 4)} x={-Math.max(5000, (boardSettings.width || 1920))} y={-Math.max(5000, (boardSettings.height || 1080))} fill="url(#grid-medium)" />
                                    <rect width={Math.max(12000, (boardSettings.width || 1920) * 4)} height={Math.max(12000, (boardSettings.height || 1080) * 4)} x={-Math.max(5000, (boardSettings.width || 1920))} y={-Math.max(5000, (boardSettings.height || 1080))} fill="url(#grid-major)" />
                                </g>
                            )}

                            <BoardLayers
                                layers={layers}
                                localImages={localImages}
                                localTexts={localTexts}
                                activeStrokes={activeStrokes}
                                selectedStrokeIds={selectedStrokeIds}
                                selectedId={selectedId}
                                isTeacher={isTeacher}
                                tool={tool}
                                cameraScale={camera.scale}
                                tempStrokeTransform={tempStrokeTransform}
                                strokeSelectionBounds={strokeSelectionBounds}
                                setEditingTextId={setEditingTextId}
                                setTool={setTool}
                                editingTextId={editingTextId}
                            />
                        </g>

                        {strokeSelectionBounds && selectedStrokeIds.length > 0 && (
                            <g transform={`translate(${tempStrokeTransform.x + strokeSelectionBounds.cx}, ${tempStrokeTransform.y + strokeSelectionBounds.cy}) rotate(${tempStrokeTransform.rotation}) scale(${tempStrokeTransform.scale}) translate(${-strokeSelectionBounds.cx}, ${-strokeSelectionBounds.cy})`}>
                                <rect x={strokeSelectionBounds.x} y={strokeSelectionBounds.y} width={strokeSelectionBounds.width} height={strokeSelectionBounds.height} fill="transparent" stroke="var(--color-primary)" strokeWidth={2 / camera.scale} strokeDasharray="5,5" opacity="0.8" data-handle="strokes-drag" cursor="move" />
                                <circle cx={strokeSelectionBounds.x + strokeSelectionBounds.width} cy={strokeSelectionBounds.y + strokeSelectionBounds.height} r={14 / camera.scale} fill="white" stroke="var(--color-primary)" strokeWidth={3 / camera.scale} cursor="nwse-resize" data-handle="strokes-resize" />
                                <circle cx={strokeSelectionBounds.cx} cy={strokeSelectionBounds.y - 30 / camera.scale} r={10 / camera.scale} fill="var(--color-primary)" stroke="white" strokeWidth={2 / camera.scale} cursor="alias" data-handle="strokes-rotate" />
                                <line x1={strokeSelectionBounds.cx} y1={strokeSelectionBounds.y} x2={strokeSelectionBounds.cx} y2={strokeSelectionBounds.y - 30 / camera.scale} stroke="var(--color-primary)" strokeWidth={2 / camera.scale} />
                                <circle cx={strokeSelectionBounds.x} cy={strokeSelectionBounds.y} r={14 / camera.scale} fill="var(--color-secondary)" stroke="white" strokeWidth={3 / camera.scale} cursor="move" data-handle="strokes-move" />
                            </g>
                        )}

                        {/* Active drawing stroke */}
                        <g>
                            {renderCurrentStroke()}
                        </g>
                        {lassoPoints && isTeacher && (
                            <path
                                d={getSvgPathFromStroke(getStroke(lassoPoints, { size: 2 / camera.scale, thinning: 0, smoothing: 0, streamline: 0, simulatePressure: false }))}
                                fill="rgba(59, 130, 246, 0.2)"
                                stroke="var(--color-primary)"
                                strokeWidth={2 / camera.scale}
                                strokeDasharray="4 4"
                            />
                        )}
                    </g>
                </svg>

                {showTransformConfirm && (
                    <div
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-1 p-1.5 bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-5 pointer-events-auto"
                    >
                        <div className="flex items-center gap-1">
                            <div className="relative group/layer">
                                <button onClick={() => setShowLayerSelector(!showLayerSelector)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 transition-colors" title="Mover a Capa"><IconLayers className="w-5 h-5" /></button>
                                {showLayerSelector && (<div className="absolute top-full left-0 mt-2 bg-white dark:bg-dark-card border dark:border-gray-700 rounded-lg shadow-lg w-40 z-50 p-1">{layers.map(l => (<button key={l.id} onClick={() => { moveSelectionToLayer(l.id); setShowLayerSelector(false); }} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 rounded truncate">{l.name}</button>))}</div>)}
                            </div>
                            {selectedStrokeIds.length > 1 && (
                                <button onClick={handleGroupStrokes} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 transition-colors" title="Agrupar"><IconGroup className="w-5 h-5" /></button>
                            )}
                            {isSelectionGrouped && (
                                <button onClick={handleUngroupStrokes} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 transition-colors" title="Desagrupar"><IconUngroup className="w-5 h-5" /></button>
                            )}
                            <button onClick={copySelection} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-blue-500 transition-colors" title="Copiar"><IconClipboardCopy className="w-5 h-5" /></button>
                            {selectedId && selectedType === 'image' && !selectedStrokeIds.length && (
                                <button onClick={handleEditImage} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-green-500 transition-colors" title="Editar Imagen"><IconCrop className="w-5 h-5" /></button>
                            )}
                            <button onClick={handleSaveToLibrary} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-purple-500 transition-colors" title="Guardar en LibrerÃ­a"><IconLibrary className="w-5 h-5" /></button>
                            <button onClick={deleteSelection} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 transition-colors" title="Eliminar"><IconTrash className="w-5 h-5" /></button>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={async (e) => { 
                                    e.stopPropagation(); 
                                    if (selectedStrokeIds.length > 0) {
                                        await finalizeStrokeTransform(); 
                                        setSelectedStrokeIds([]); 
                                        setStrokeSelectionBounds(null); 
                                    }
                                    if (selectedId) {
                                        const img = localImages.find(i => i.id === selectedId);
                                        const txt = localTexts.find(t => t.id === selectedId);
                                        if (img) {
                                            await handleUpdateFirestore(img.id, 'image', { x: img.x, y: img.y, width: img.width, height: img.height, rotation: img.rotation });
                                        } else if (txt) {
                                            await handleUpdateFirestore(txt.id, 'text', { x: txt.x, y: txt.y, width: txt.width, height: txt.height, rotation: txt.rotation });
                                        }
                                        setSelectedId(null);
                                        setSelectedType(null);
                                    }
                                }} 
                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm" 
                                title="Confirmar y Deseleccionar"
                            >
                                <IconCheck className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    cancelStrokeTransform(); 
                                    if (selectedId) {
                                        setLocalImages(activeImages);
                                        setLocalTexts(activeTexts);
                                        setSelectedId(null);
                                        setSelectedType(null);
                                    }
                                    setSelectedStrokeIds([]);
                                    setStrokeSelectionBounds(null);
                                }} 
                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm" 
                                title="Cancelar Transformación"
                            >
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
                    {!isTeacher && (
                        <div className="flex bg-white/80 dark:bg-black/80 backdrop-blur-xl rounded-xl p-1 shadow-xl border border-white/20 items-center">
                            <button onClick={() => setIsFollowingTeacher(!isFollowingTeacher)} className={`p-2 rounded-lg shadow-sm transition-colors flex items-center gap-2 text-xs font-bold ${isFollowingTeacher ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`} title={isFollowingTeacher ? "Siguiendo al profesor" : "NavegaciÃ³n libre"}>
                                {isFollowingTeacher ? <IconLockClosed className="w-4 h-4" /> : <IconLockOpen className="w-4 h-4" />}
                                {isFollowingTeacher ? 'Sincronizado' : 'Modo Libre'}
                            </button>
                        </div>
                    )}
                    {!isTeacher && !isFollowingTeacher && boards.length > 0 && (
                        <div className="relative pointer-events-auto select-none">
                            <button
                                onClick={() => setShowBoardDropdown(!showBoardDropdown)}
                                className="glass-panel px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 backdrop-blur-xl bg-white/70 dark:bg-black/70 text-gray-800 dark:text-gray-200 border border-white/20 hover:bg-white/90 dark:hover:bg-gray-800 transition-all shadow-md"
                            >
                                <span>{boards.find(b => b.id === activeBoardId)?.name || 'Seleccionar Pizarra'}</span>
                                <IconChevronDown className="w-3.5 h-3.5 opacity-60" />
                            </button>
                            {showBoardDropdown && (
                                <div className="glass-panel absolute top-full left-0 mt-1.5 rounded-xl shadow-xl w-48 z-[150] p-1 flex flex-col gap-0.5 backdrop-blur-xl bg-white/80 dark:bg-black/80 border border-white/10 dark:border-gray-800/40 animate-in slide-in-from-top-2 duration-150">
                                    {boards.map(b => (
                                        <button
                                            key={b.id}
                                            onClick={() => {
                                                setActiveBoardId(b.id);
                                                setShowBoardDropdown(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg truncate transition-colors ${
                                                b.id === activeBoardId
                                                    ? 'bg-primary text-white'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            {b.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex bg-white/80 dark:bg-black/80 backdrop-blur-xl rounded-2xl p-1.5 shadow-2xl border border-white/20 items-stretch">
                        {isTeacher && (
                            <>
                                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
                                    <button onClick={() => setShowBoardTabs(!showBoardTabs)} className={`p-2 rounded-lg shadow-sm transition-colors ${showBoardTabs ? 'bg-primary text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary'}`} title={showBoardTabs ? "Ocultar lista de clases" : "Mostrar lista de clases"}><IconDashboard className="w-5 h-5" /></button>
                                    <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                                    <button onClick={handleToggleSync} className={`p-2 rounded-lg shadow-sm transition-colors ${isSyncPaused ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300' : 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300'}`} title={isSyncPaused ? "Modo Offline" : "Sincronizado"}>{isSyncPaused ? <IconCloudOff className="w-5 h-5" /> : <IconCloud className="w-5 h-5" />}</button>
                                    <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                                    <button onClick={() => setIsNavLocked(!isNavLocked)} className={`p-2 rounded-lg shadow-sm transition-colors ${isNavLocked ? 'bg-red-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary'}`}>{isNavLocked ? <IconLockClosed className="w-5 h-5" /> : <IconLockOpen className="w-5 h-5" />}</button>
                                </div>
                                <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                            </>
                        )}
                        {!isTeacher && (
                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
                                <button onClick={handleZoomExtents} className="p-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg shadow-sm hover:text-primary transition-colors"><IconArrowsExpand className="w-5 h-5" /></button>
                                <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                                <button onClick={() => setCamera(prev => ({ ...prev, scale: Math.min(10, prev.scale * 1.25) }))} className="p-2 bg-white dark:bg-gray-700 font-black text-lg rounded-lg shadow-sm w-9">+</button>
                                <button onClick={() => setCamera(prev => ({ ...prev, scale: Math.max(0.1, prev.scale * 0.8) }))} className="p-2 bg-white dark:bg-gray-700 font-black text-lg rounded-lg shadow-sm w-9">-</button>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <button onClick={() => { if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); }} className="p-2 text-gray-500 hover:text-primary rounded-xl transition-colors"><IconArrowsExpand className="w-5 h-5" /></button>
                            {isTeacher && <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary'}`}><IconDeviceFloppy className="w-5 h-5" /></button>}
                        </div>
                    </div>
                </div>

                {isTeacher && (
                    <TeacherSidePanel
                        isOpen={isSidePanelOpen}
                        onClose={handleCloseSidePanel}
                        onDragImageStart={handleDragSidePanelImageStart}
                    />
                )}

                {isTeacher && tool === 'polyline' && currentStroke && currentStroke.length > 1 && (
                    <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-3 pointer-events-auto">
                        <button
                            onClick={finishPolyline}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg border border-green-400 font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105"
                            title="Finalizar PolilÃ­nea (Enter / Clic Largo)"
                        >
                            <IconCheck className="w-4 h-4" />
                            <span>Finalizar PolilÃ­nea</span>
                        </button>
                    </div>
                )}

                {isTeacher && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[40]">
                        <WhiteboardToolbar
                            tool={tool}
                            setTool={setTool}
                            presets={presets}
                            activePresetIdx={activePresetIdx}
                            onSelectPreset={handleSelectPreset}
                            onUpdatePreset={handleUpdatePreset}
                            stylusOnly={stylusOnly}
                            setStylusOnly={setStylusOnly}
                            showLayers={showLayers}
                            setShowLayers={setShowLayers}
                            onImageUpload={handleImageUpload}
                            currentColor={color}
                            onSetColor={setColor}
                            fillColor={fillColor}
                            onSetFillColor={setFillColor}
                            isFilled={isFilled}
                            onToggleFill={setIsFilled}
                            isStroked={isStroked}
                            onToggleStroke={setIsStroked}
                            drawStyle={drawStyle}
                            setDrawStyle={setDrawStyle}
                            currentSize={size}
                            onSizeChange={setSize}
                            opacity={opacity}
                            onOpacityChange={setOpacity}
                            currentStrokeOptions={strokeOpts}
                            onStrokeOptionsChange={setStrokeOpts}
                            undo={undo}
                            redo={redo}
                            canUndo={historyIndex >= 0}
                            canRedo={redoStack.length > 0}
                            cameraScale={camera.scale}
                            setCamera={setCamera}
                            onZoomExtents={handleZoomExtents}
                            isTeacher={isTeacher}
                            isSidePanelOpen={isSidePanelOpen}
                            setIsSidePanelOpen={setIsSidePanelOpen}
                            eraserTargets={eraserTargets}
                            setEraserTargets={setEraserTargets}
                            eraserLayerScope={eraserLayerScope}
                            setEraserLayerScope={setEraserLayerScope}
                            eraserMode={eraserMode}
                            setEraserMode={setEraserMode}
                        />
                    </div>
                )}
                {isTeacher && clipboard && (
                    <div className="absolute bottom-20 left-6 z-[40]">
                        <button 
                            onClick={pasteFromClipboard} 
                            className="p-3 bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 text-green-500 hover:scale-105 transition-all flex items-center gap-1.5 font-bold text-xs"
                            title="Pegar elemento del portapapeles"
                        >
                            <IconClipboard className="w-4 h-4" /> 
                            <span>Pegar</span>
                        </button>
                    </div>
                )}

                <div
                    className={`absolute bottom-0 left-0 h-16 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700 z-50 transition-all duration-300 ${(isTeacher || !syncEnabled) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    style={{ right: isSidePanelOpen ? '320px' : '0' }}
                >
                    <div className="flex items-center gap-2 px-2 overflow-hidden w-full h-full min-w-0">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest hidden sm:block flex-shrink-0">Pizarras</span>
                        <button onClick={() => { const idx = pages.findIndex(p => p.id === activePageId); if (idx > 0) setActivePageId(pages[idx - 1].id); }} disabled={pages.length === 0 || pages[0].id === activePageId} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent flex-shrink-0" title="Pizarra Anterior"><IconChevronUp className="w-5 h-5 -rotate-90" /></button>
                        <div className="flex-1 overflow-x-auto flex gap-2 py-2 scrollbar-hide items-center min-w-0" ref={pagesListRef}>
                            {pages.map((page, idx) => (
                                <div
                                    key={page.id}
                                    data-page-id={page.id}
                                    onClick={() => setActivePageId(page.id)}
                                    draggable={isTeacher}
                                    onDragStart={(e) => { if (isTeacher) handleDragStartPage(e, page.id); }}
                                    onDragOver={(e) => { if (isTeacher) handleDragOverPage(e); }}
                                    onDrop={(e) => { if (isTeacher) handleDropOnPageIndex(e, idx); }}
                                    onDragEnd={() => { draggedPageIdRef.current = null; }}
                                    className={`group relative flex-shrink-0 w-20 h-10 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-center bg-white dark:bg-black ${activePageId === page.id ? 'border-primary ring-2 ring-primary/30' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                                >
                                    <span className={`text-xs font-bold ${activePageId === page.id ? 'text-primary' : 'text-gray-500'}`}>{idx + 1}</span>

                                    {/* Add-before / Add-after buttons for teachers */}
                                    {isTeacher && (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); addPageAtIndex(idx); }} title="Agregar antes" className="absolute -left-3 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 border rounded-full p-0.5 shadow text-gray-500 hover:text-primary hover:scale-110"><IconPlus className="w-3 h-3" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); addPageAtIndex(idx + 1); }} title="Agregar despuÃ©s" className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 border rounded-full p-0.5 shadow text-gray-500 hover:text-primary hover:scale-110"><IconPlus className="w-3 h-3" /></button>
                                        </>
                                    )}

                                    {/* Save to library (top-left) - only show when page is active */}
                                    {isTeacher && activePageId === page.id && (
                                        <button onClick={(e) => { e.stopPropagation(); handleSavePageToLibrary(page.id); }} title="Guardar diapositiva en librerÃ­a" className="absolute -top-2 -left-2 bg-white dark:bg-gray-800 border rounded-full p-0.5 shadow text-purple-600 hover:text-purple-800 z-10 transition-transform hover:scale-110"><IconLibrary className="w-3 h-3" /></button>
                                    )}

                                    {/* Download as JPG (bottom-right) - only show when page is active */}
                                    {isTeacher && activePageId === page.id && (
                                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPageAsJpeg(page.id); }} title="Descargar como JPG" className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 border rounded-full p-0.5 shadow text-gray-600 hover:text-primary z-10 transition-transform hover:scale-110"><IconDownload className="w-3 h-3" /></button>
                                    )}

                                    {isTeacher && activePageId === page.id && pages.length > 1 && (
                                        <button onClick={(e) => { e.stopPropagation(); deletePage(page.id); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 z-10 transition-transform hover:scale-110"><IconX className="w-3 h-3" /></button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={() => { const idx = pages.findIndex(p => p.id === activePageId); if (idx < pages.length - 1) setActivePageId(pages[idx + 1].id); }} disabled={pages.length === 0 || pages[pages.length - 1].id === activePageId} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent flex-shrink-0" title="Pizarra Siguiente"><IconChevronUp className="w-5 h-5 rotate-90" /></button>
                        {isTeacher && <button onClick={addPage} className="flex-shrink-0 w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary transition-colors" title="Nueva Pizarra"><IconPlus className="w-5 h-5" /></button>}
                    </div>

                    <div className="h-full overflow-hidden w-full min-w-0" ref={libraryBarRef}>
                        {isTeacher ? (
                            <QuickLibraryBar
                                items={quickLibraryItems}
                                onDragStart={handleLibraryDragStart}
                                onDrop={handleLibraryManualDrop}
                                onAddToCenter={(item) => handleAddItemToCanvas(item)}
                                onAddToTopLeft={(item) => handleAddItemToTopLeft(item)}
                                onRemoveItem={handleRemoveLibraryItem}
                                onOpenLibrary={() => setShowLibraryManager(true)}
                                onImportImage={(file) => setLibraryImportFile(file)}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs italic">Vista de Estudiante</div>
                        )}
                    </div>
                </div>

                {isTeacher && showLayers && <LayerManager layers={layers} activeLayerId={activeLayerId} onSetActiveLayer={setActiveLayerId} onAddLayer={addLayer} onDeleteLayer={handleDeleteLayer} onToggleVisibility={toggleLayerVisibility} onMoveLayer={moveLayerOrder} onUpdateLayer={updateLayer} onClose={() => setShowLayers(false)} />}
                {isTeacher && showSettings && <WhiteboardSettings bgColor={boardSettings.bgColor} bgImageUrl={boardSettings.bgImageUrl} snapshots={snapshots} boardDimensions={{ width: boardSettings.width, height: boardSettings.height }} onClose={() => setShowSettings(false)} onUpdateSettings={updateBoardSettings} grid={boardSettings.grid} onUploadBackground={async (e) => { if (e.target.files) { const file = e.target.files[0]; const resizedBlob = await resizeImage(file, 2048); const url = await uploadFile('whiteboard-assets/backgrounds', new File([resizedBlob], file.name)); const img = new Image(); img.src = URL.createObjectURL(resizedBlob); img.onload = () => updateBoardSettings({ bgImageUrl: url }); } }} onRemoveBackground={() => updateBoardSettings({ bgImageUrl: deleteField() })} onSaveSnapshot={handleSaveSnapshot} onLoadSnapshot={restoreSnapshot} onDeleteSnapshot={deleteSnapshot} onClearBoard={handleClearBoard} stylusOnly={stylusOnly} setStylusOnly={setStylusOnly} />}

                {importingFile && <ImageImportModal file={importingFile} onClose={() => setImportingFile(null)} onConfirm={handleImageProcessed} initialTeacherOnly={editingImageId ? editingImageTeacherOnly : false} />}

                {libraryImportFile && <ImageImportModal file={libraryImportFile} onClose={() => setLibraryImportFile(null)} onConfirm={(blob) => processLibraryImport(blob)} initialTeacherOnly={false} />}

                {isSyncing && <div className="absolute bottom-20 right-4 bg-white/90 dark:bg-black/90 px-4 py-2 rounded-full text-[10px] font-bold flex items-center gap-3 shadow-xl backdrop-blur-md z-50"><div className="w-2 h-2 bg-primary rounded-full animate-ping" />SINCRO...</div>}
                {isSyncPaused && <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-orange-100 dark:bg-orange-900/80 px-4 py-2 rounded-full text-[10px] font-bold flex items-center gap-3 shadow-xl backdrop-blur-md z-50 border border-orange-300 pointer-events-none"><div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />OFFLINE (Pausado)</div>}
            </div>
        </div>
    );
};

export default WhiteboardModule;
