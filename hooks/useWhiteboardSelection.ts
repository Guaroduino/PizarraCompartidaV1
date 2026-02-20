
import { useState, useRef, useEffect, useMemo } from 'react';
import { doc, updateDoc, writeBatch, collection, deleteField } from "firebase/firestore";
import { db } from '../services/firebase';
import type { WhiteboardStroke, WhiteboardImage, WhiteboardText } from '../types';
import type { BoundingBox, TransformState, WhiteboardAction, ExtendedWhiteboardText } from '../types/whiteboardTypes';
import { getBoundingBox } from '../utils/whiteboardUtils';

interface UseWhiteboardSelectionProps {
    strokes: WhiteboardStroke[];
    images: WhiteboardImage[];
    texts: WhiteboardText[];
    activeLayerId: string;
    cameraScale: number;
    setIsSyncing: (val: boolean) => void;
    recordAction: (action: WhiteboardAction) => void;
    activeStrokes: WhiteboardStroke[];
    activeImages: WhiteboardImage[];
    activeTexts: WhiteboardText[];
    onDeleteStrokes: (ids: string[]) => void; // New prop
}

export const useWhiteboardSelection = ({
    strokes, images, texts, activeLayerId, cameraScale, setIsSyncing, recordAction, activeStrokes, activeImages, activeTexts, onDeleteStrokes
}: UseWhiteboardSelectionProps) => {
    // Single Item Selection
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<'image' | 'text' | null>(null);
    const [isCropMode, setIsCropMode] = useState(false);
    
    // Multi/Stroke Selection
    const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
    const [strokeSelectionBounds, setStrokeSelectionBounds] = useState<BoundingBox | null>(null);
    const [tempStrokeTransform, setTempStrokeTransform] = useState<TransformState>({ x: 0, y: 0, scale: 1, rotation: 0 });
    
    // Transform State
    const [transformMode, setTransformMode] = useState<'drag' | 'resize' | 'rotate' | 'crop-handle' | 'strokes-drag' | 'strokes-resize' | 'strokes-rotate' | 'strokes-move' | null>(null);
    
    // Clipboard
    const [clipboard, setClipboard] = useState<{ type: 'strokes' | 'images' | 'texts', data: any[] } | null>(null);

    // Initial drag state
    const initialTransformParams = useRef<{ 
        startX: number, 
        startY: number, 
        startScale: number, 
        startRotation: number, 
        startDistance?: number, 
        startAngle?: number, 
        centerX: number, 
        centerY: number,
        initialTx?: number,
        initialTy?: number,
        initialScale?: number,
        initialRotation?: number
    } | null>(null);

    // Update bounding box whenever selected strokes or activeStrokes change
    useEffect(() => {
        if (selectedStrokeIds.length > 0) {
             const relevantStrokes = activeStrokes.filter(s => selectedStrokeIds.includes(s.id));
             if (relevantStrokes.length > 0) {
                 const bounds = getBoundingBox(relevantStrokes);
                 setStrokeSelectionBounds(bounds);
             } else {
                 setStrokeSelectionBounds(null);
                 if (strokes.length > 0 && !strokes.some(s => selectedStrokeIds.includes(s.id))) {
                     setSelectedStrokeIds([]);
                 }
             }
        } else {
            setStrokeSelectionBounds(null);
        }
    }, [selectedStrokeIds, activeStrokes, strokes]);

    // Check if current selection contains any grouped items
    const isSelectionGrouped = useMemo(() => {
        if (selectedStrokeIds.length === 0) return false;
        return activeStrokes.some(s => selectedStrokeIds.includes(s.id) && s.groupId);
    }, [selectedStrokeIds, activeStrokes]);

    // --- Actions ---

    const copySelection = () => {
        if (selectedStrokeIds.length > 0) {
            const strokesToCopy = strokes.filter(s => selectedStrokeIds.includes(s.id));
            if (strokesToCopy.length > 0) setClipboard({ type: 'strokes', data: strokesToCopy });
        } else if (selectedId && selectedType) {
            if (selectedType === 'image') {
                const img = images.find(i => i.id === selectedId);
                if (img) setClipboard({ type: 'images', data: [img] });
            } else if (selectedType === 'text') {
                const txt = texts.find(t => t.id === selectedId);
                if (txt) setClipboard({ type: 'texts', data: [txt] });
            }
        }
    };

    const deleteSelection = async () => {
        if (selectedStrokeIds.length > 0) {
            // Use the passed handler which knows how to handle temp vs real IDs safely
            onDeleteStrokes(selectedStrokeIds);
            
            setSelectedStrokeIds([]);
            setStrokeSelectionBounds(null);
        } else if (selectedId && selectedType) {
            // Handle single item deletion
            if (selectedId.startsWith('temp_')) {
                // Should be handled by parent if it's temp, but images/texts usually real doc writes immediately.
                // Assuming images/texts are always real docs for now or parent handles deletion via updateItemInFirestore equivalent?
                // Actually WhiteboardModule doesn't pass a deleter for single items here, it does it directly below.
                // But wait, Images/Texts logic:
                // WhiteboardModule.tsx handles creation.
                // Here we delete. 
                // If it's a real doc, we update deleted: true.
            }
            
            const coll = selectedType === 'image' ? 'whiteboardImages' : 'whiteboardTexts';
            // Only attempt delete if it looks like a real ID (or just try, if it fails it fails)
            if (!selectedId.startsWith('temp_')) {
                await updateDoc(doc(db, coll, selectedId), { deleted: true });
            } else {
               // If temp, we can't easily delete from here without a callback. 
               // For now, let's assume single items are synced fast or we'd need a similar callback.
               // Given stroke issue was main complaint, leaving single item logic as is but safe-guarded slightly.
               console.warn("Cannot delete temp item from selection hook yet");
            }
            
            setSelectedId(null);
            setSelectedType(null);
        }
    };

    const cutSelection = async () => {
        copySelection();
        await deleteSelection();
    };

    const pasteFromClipboard = async () => {
        if (clipboard) {
            setIsSyncing(true);
            try {
                const batch = writeBatch(db);
                const newIds: string[] = [];
                
                if (clipboard.type === 'strokes') {
                    const offset = 20 / cameraScale;
                    
                    clipboard.data.forEach((s: WhiteboardStroke) => {
                        const newPoints = s.points.map(p => ({ ...p, x: p.x + offset, y: p.y + offset }));
                        const ref = doc(collection(db, 'whiteboardStrokes'));
                        newIds.push(ref.id);
                        const { id, ...data } = s;
                        
                        const { groupId, ...cleanData } = data; 
                        
                        batch.set(ref, { ...cleanData, points: newPoints, layerId: activeLayerId, timestamp: Date.now() });
                    });
                    await batch.commit();
                    setSelectedStrokeIds(newIds); 
                } else if (clipboard.type === 'images') {
                    const offset = 30 / cameraScale;
                    const img = clipboard.data[0] as WhiteboardImage;
                    const ref = doc(collection(db, 'whiteboardImages'));
                    const { id, ...data } = img;
                    batch.set(ref, { ...data, x: img.x + offset, y: img.y + offset, layerId: activeLayerId, timestamp: Date.now() });
                    await batch.commit();
                    setSelectedId(ref.id);
                    setSelectedType('image');
                } else if (clipboard.type === 'texts') {
                    const offset = 30 / cameraScale;
                    const txt = clipboard.data[0] as WhiteboardText;
                    const ref = doc(collection(db, 'whiteboardTexts'));
                    const { id, ...data } = txt;
                    batch.set(ref, { ...data, x: txt.x + offset, y: txt.y + offset, layerId: activeLayerId, timestamp: Date.now() });
                    await batch.commit();
                    setSelectedId(ref.id);
                    setSelectedType('text');
                }
            } catch (err) { console.error(err); } 
            finally { setIsSyncing(false); }
        }
    };

    const moveSelectionToLayer = async (targetLayerId: string) => {
        setIsSyncing(true);
        try {
            const batch = writeBatch(db);
            let hasOps = false;
            
            if (selectedStrokeIds.length > 0) {
                selectedStrokeIds.forEach(id => {
                    if(!id.startsWith('temp_')) {
                        batch.update(doc(db, 'whiteboardStrokes', id), { layerId: targetLayerId });
                        hasOps = true;
                    }
                });
            } else if (selectedId && selectedType && !selectedId.startsWith('temp_')) {
                const coll = selectedType === 'image' ? 'whiteboardImages' : 'whiteboardTexts';
                batch.update(doc(db, coll, selectedId), { layerId: targetLayerId });
                hasOps = true;
            }
            
            if (hasOps) await batch.commit();
            
            setSelectedStrokeIds([]);
            setSelectedId(null);
        } catch(e) { console.error(e); } finally { setIsSyncing(false); }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && !e.repeat) {
                if (e.key === 'c') copySelection();
                else if (e.key === 'x') cutSelection();
                else if (e.key === 'v') pasteFromClipboard();
                else if (e.key === 'g') {
                    e.preventDefault();
                    if (e.shiftKey) handleUngroupStrokes();
                    else handleGroupStrokes();
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && !(document.activeElement as HTMLElement)?.isContentEditable) {
                    deleteSelection();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [clipboard, selectedStrokeIds, selectedId, selectedType, strokes, images, texts, activeLayerId, cameraScale]);

    // Update single item
    const handleUpdateSelectedItem = async (newData: any) => {
        if (selectedStrokeIds.length > 0) {
            setIsSyncing(true);
            try {
                const batch = writeBatch(db);
                let hasOps = false;
                selectedStrokeIds.forEach(id => {
                    if (!id.startsWith('temp_')) {
                        batch.update(doc(db, 'whiteboardStrokes', id), newData);
                        hasOps = true;
                    }
                });
                if(hasOps) await batch.commit();
            } catch (e) { console.error(e); } finally { setIsSyncing(false); }
            return;
        }

        if (!selectedId || !selectedType || selectedId.startsWith('temp_')) return;
        const actualColl = selectedType === 'image' ? 'whiteboardImages' : 'whiteboardTexts';
        setIsSyncing(true);
        try {
            const item = (selectedType === 'image' ? activeImages : activeTexts).find(i => i.id === selectedId);
            if (item) {
                recordAction({ type: 'update', targetType: selectedType, targetId: selectedId, prevData: { ...item }, newData: { ...item, ...newData } });
                await updateDoc(doc(db, actualColl, selectedId), newData);
            }
        } catch (e) { console.error(e); } finally { setIsSyncing(false); }
    };

    const handleGroupStrokes = async () => {
        if (selectedStrokeIds.length < 2) return; 
        const newGroupId = `group_${Date.now()}`;
        setIsSyncing(true);
        try {
            const batch = writeBatch(db);
            let hasOps = false;
            selectedStrokeIds.forEach(id => {
                if (!id.startsWith('temp_')) {
                    batch.update(doc(db, 'whiteboardStrokes', id), { groupId: newGroupId });
                    hasOps = true;
                }
            });
            if(hasOps) await batch.commit();
        } catch(e) { console.error(e); } finally { setIsSyncing(false); }
    };

    const handleUngroupStrokes = async () => {
        if (selectedStrokeIds.length === 0) return;
        setIsSyncing(true);
        try {
            const batch = writeBatch(db);
            let hasOps = false;
            selectedStrokeIds.forEach(id => {
                if (!id.startsWith('temp_')) {
                    batch.update(doc(db, 'whiteboardStrokes', id), { groupId: deleteField() });
                    hasOps = true;
                }
            });
            if(hasOps) await batch.commit();
        } catch(e) { console.error(e); } finally { setIsSyncing(false); }
    };

    const cancelStrokeTransform = () => {
        setTempStrokeTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
    };

    const finalizeStrokeTransform = async () => {
        if (selectedStrokeIds.length > 0 && strokeSelectionBounds) {
            setIsSyncing(true);
            try {
                const selectedStrokes = activeStrokes.filter(s => selectedStrokeIds.includes(s.id));
                const ops: any[] = [];
                const { cx, cy } = strokeSelectionBounds; 
                const { x: tx, y: ty, scale, rotation } = tempStrokeTransform;
                
                const rad = rotation * (Math.PI / 180);
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                let newMinX = Infinity, newMinY = Infinity, newMaxX = -Infinity, newMaxY = -Infinity;

                selectedStrokes.forEach(s => {
                    const newSize = s.size * scale;

                    const newPoints = s.points.map(p => {
                        let x = p.x - cx;
                        let y = p.y - cy;
                        x *= scale;
                        y *= scale;
                        const rx = x * cos - y * sin;
                        const ry = x * sin + y * cos;
                        const finalX = Math.round((rx + cx + tx) * 100) / 100;
                        const finalY = Math.round((ry + cy + ty) * 100) / 100;

                        newMinX = Math.min(newMinX, finalX);
                        newMinY = Math.min(newMinY, finalY);
                        newMaxX = Math.max(newMaxX, finalX);
                        newMaxY = Math.max(newMaxY, finalY);

                        return { ...p, x: finalX, y: finalY };
                    });
                    
                    if (!s.id.startsWith('temp_')) {
                        ops.push({ 
                            ref: doc(db, 'whiteboardStrokes', s.id), 
                            data: { points: newPoints, size: newSize } 
                        });
                    }
                });

                for (let i = 0; i < ops.length; i += 500) {
                    const chunkBatch = writeBatch(db);
                    ops.slice(i, i + 500).forEach(op => chunkBatch.update(op.ref, op.data));
                    await chunkBatch.commit();
                }

                setTempStrokeTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
                
                if (newMinX !== Infinity) {
                    setStrokeSelectionBounds({ 
                        x: newMinX, 
                        y: newMinY, 
                        width: newMaxX - newMinX, 
                        height: newMaxY - newMinY, 
                        cx: (newMinX + newMaxX) / 2, 
                        cy: (newMinY + newMaxY) / 2 
                    });
                } else {
                    setStrokeSelectionBounds(null);
                    setSelectedStrokeIds([]); 
                }

            } catch (e) { console.error(e); } finally { setIsSyncing(false); }
        }
    };

    return {
        selectedId, setSelectedId,
        selectedType, setSelectedType,
        isCropMode, setIsCropMode,
        selectedStrokeIds, setSelectedStrokeIds,
        strokeSelectionBounds, setStrokeSelectionBounds,
        tempStrokeTransform, setTempStrokeTransform,
        transformMode, setTransformMode,
        clipboard, setClipboard,
        initialTransformParams,
        isSelectionGrouped, 
        handleUpdateSelectedItem,
        handleGroupStrokes,
        handleUngroupStrokes,
        finalizeStrokeTransform,
        cancelStrokeTransform,
        copySelection,
        cutSelection,
        pasteFromClipboard,
        deleteSelection,
        moveSelectionToLayer
    };
};
