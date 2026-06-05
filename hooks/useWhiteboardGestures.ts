
import React, { useState, useRef, useEffect } from 'react';
import type { Point, StrokeOptions, WhiteboardStroke } from '../types';
import type { ToolType, TransformState, BoundingBox, DrawStyle, ShapeStyle, ExtendedStrokeOptions } from '../types/whiteboardTypes';
import { getLinePoints, getCirclePoints, getArcPoints, getRectanglePoints, getSquarePoints, getParallelogramPoints } from '../utils/whiteboardUtils';

interface UseWhiteboardGesturesProps {
    tool: ToolType;
    isTeacher: boolean;
    stylusOnly: boolean;
    isNavLocked?: boolean;
    strokeOpts: ExtendedStrokeOptions;
    screenToWorld: (x: number, y: number) => { x: number, y: number };
    setCamera: React.Dispatch<React.SetStateAction<{ x: number, y: number, scale: number }>>;
    camera: { x: number, y: number, scale: number };
    onStrokeComplete: (path: Point[]) => void;
    setLassoPoints: React.Dispatch<React.SetStateAction<Point[] | null>>;
    setSelectedId: (id: string | null) => void;
    setSelectedType: (type: 'image' | 'text' | null) => void;
    setTransformMode: (mode: any) => void;
    selectedId: string | null;
    isCropMode: boolean;
    activeImages: any[];
    activeTexts: any[];
    setImages: React.Dispatch<React.SetStateAction<any[]>>;
    setTexts: React.Dispatch<React.SetStateAction<any[]>>;
    strokeSelectionBounds: BoundingBox | null;
    selectedStrokeIds: string[];
    initialTransformParams: React.MutableRefObject<any>;
    tempStrokeTransform: TransformState;
    setTempStrokeTransform: React.Dispatch<React.SetStateAction<TransformState>>;
    finalizeStrokeTransform: () => void;
    lassoPoints: Point[] | null;
    onLassoEnd: (loop: Point[]) => void;
    updateItemInFirestore: (id: string, type: 'image' | 'text', data: any, prevData?: any) => void;
    transformMode: 'drag' | 'resize' | 'rotate' | 'crop-handle' | 'strokes-drag' | 'strokes-resize' | 'strokes-rotate' | 'strokes-move' | 'pan' | null;
    drawStyle?: DrawStyle;
    activeStrokes: WhiteboardStroke[];
    lockedLayerIds: Set<string>;
    eraserMode: 'freehand' | 'rect' | 'circle';
    onCameraChangeDirect?: (cam: { x: number, y: number, scale: number }) => void;
}

export const useWhiteboardGestures = ({
    tool, isTeacher, stylusOnly, isNavLocked, strokeOpts, screenToWorld, setCamera, camera, onStrokeComplete,
    setLassoPoints, setSelectedId, setSelectedType, setTransformMode, selectedId, isCropMode,
    activeImages, activeTexts, setImages, setTexts, strokeSelectionBounds, selectedStrokeIds,
    initialTransformParams, tempStrokeTransform, setTempStrokeTransform, finalizeStrokeTransform,
    lassoPoints, onLassoEnd, updateItemInFirestore, transformMode, drawStyle = 'ink', activeStrokes, lockedLayerIds,
    eraserMode, onCameraChangeDirect
}: UseWhiteboardGesturesProps) => {

    const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
    const [isInteracting, setIsInteracting] = useState(false);

    const spacePressed = useRef(false);
    const longPressTimeout = useRef<any>(null);
    const startPointerPos = useRef<{ x: number, y: number } | null>(null);

    const finishPolyline = () => {
        if (polylinePoints.current.length > 1) {
            onStrokeComplete([...polylinePoints.current]);
        }
        polylinePoints.current = [];
        setCurrentStroke(null);
        isDrawing.current = false;
        setIsInteracting(false);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.code === 'Space') {
                if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && !(document.activeElement as HTMLElement)?.isContentEditable) {
                    spacePressed.current = true;
                }
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.code === 'Space') {
                spacePressed.current = false;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Track active pointers for multi-touch
    const activePointers = useRef<Map<number, { x: number, y: number, type: string }>>(new Map());

    // Gesture State for Absolute Pinch/Zoom/Pan Calculation
    const gestureStart = useRef<{
        dist: number;               // Distance between fingers at start
        center: { x: number; y: number }; // Screen center between fingers at start
        camera: { x: number; y: number; scale: number }; // Camera snapshot at start
    } | null>(null);

    const lastDrawPoint = useRef<{ x: number, y: number, time: number } | null>(null);
    const isDrawing = useRef(false);
    const rafRef = useRef<number | null>(null);

    // Middle-button panning (mouse)
    const middlePan = useRef(false);
    const lastMiddlePoint = useRef<{ x: number, y: number } | null>(null);

    // Absolute Panning State
    const panStart = useRef<{ x: number, y: number, camera: { x: number, y: number, scale: number } } | null>(null);

    // Camera RequestAnimationFrame throttling refs
    const pendingCamera = useRef<{ x: number, y: number, scale: number } | null>(null);
    const lastCalculatedCamera = useRef<{ x: number, y: number, scale: number } | null>(null);
    const cameraRafActive = useRef<boolean>(false);
    const cameraRafId = useRef<number | null>(null);

    const updateCameraRAF = (newCam: { x: number, y: number, scale: number }) => {
        pendingCamera.current = newCam;
        lastCalculatedCamera.current = newCam;
        if (!cameraRafActive.current) {
            cameraRafActive.current = true;
            cameraRafId.current = requestAnimationFrame(() => {
                if (pendingCamera.current) {
                    if (onCameraChangeDirect) {
                        onCameraChangeDirect(pendingCamera.current);
                    } else {
                        setCamera(pendingCamera.current);
                    }
                    pendingCamera.current = null;
                }
                cameraRafActive.current = false;
            });
        }
    };

    const commitCameraState = () => {
        if (lastCalculatedCamera.current) {
            setCamera(lastCalculatedCamera.current);
            lastCalculatedCamera.current = null;
        }
    };

    useEffect(() => {
        return () => {
            if (cameraRafId.current) cancelAnimationFrame(cameraRafId.current);
        };
    }, []);

    const shapeStartPoint = useRef<Point | null>(null);
    const polylinePoints = useRef<Point[]>([]);
    const arcStage = useRef<number>(0);
    const arcPoints = useRef<{ start: Point, end: Point, control: Point } | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (tool === 'polyline') {
                if (e.key === 'Enter') {
                    if (polylinePoints.current.length > 1) {
                        onStrokeComplete([...polylinePoints.current]);
                    }
                    polylinePoints.current = [];
                    setCurrentStroke(null);
                    isDrawing.current = false;
                    setIsInteracting(false);
                } else if (e.key === 'Escape') {
                    polylinePoints.current = [];
                    setCurrentStroke(null);
                    isDrawing.current = false;
                    setIsInteracting(false);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [tool, onStrokeComplete]);

    const handlePointerDown = (e: React.PointerEvent) => {
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
        setIsInteracting(true);

        if (tool !== 'polyline') {
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
        }

        // Initialize panStart for hand tool or non-teacher
        if (tool === 'hand' || !isTeacher) {
            panStart.current = {
                x: e.clientX,
                y: e.clientY,
                camera: { ...camera }
            };
        }

        // Middle mouse button? start panning mode
        // e.button === 1 indicates middle button for PointerEvent
        // Only enable for mouse pointers
        // Note: keep this early so middle-click doesn't start drawing/etc.
        // (React's PointerEvent has .button)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (e.pointerType === 'mouse' && (e as any).button === 1) {
            if (isNavLocked) return;
            middlePan.current = true;
            panStart.current = {
                x: e.clientX,
                y: e.clientY,
                camera: { ...camera }
            };
            return;
        }
        // CHECK FOR MULTI-TOUCH GESTURE
        if (activePointers.current.size === 2) {
            isDrawing.current = false;
            setCurrentStroke(null);
            setLassoPoints(null);
            panStart.current = null; // Clear single-finger pan

            if (isNavLocked) return;

            const pointers = Array.from(activePointers.current.values());
            const p1 = pointers[0] as { x: number, y: number };
            const p2 = pointers[1] as { x: number, y: number };

            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            const centerX = (p1.x + p2.x) / 2;
            const centerY = (p1.y + p2.y) / 2;

            gestureStart.current = {
                dist,
                center: { x: centerX, y: centerY },
                camera: { ...camera }
            };
            return;
        }

        if (activePointers.current.size > 1) return;

        // Stylus Rejection Logic
        const isStylus = e.pointerType === 'pen';
        const shapes = ['line', 'circle', 'arc', 'polyline', 'square', 'rectangle', 'parallelogram'];
        if (stylusOnly && !isStylus && (tool === 'pen' || tool === 'eraser' || shapes.includes(tool))) {
            return;
        }

        const { x, y } = screenToWorld(e.clientX, e.clientY);

        if (!isTeacher && tool !== 'hand') return;
        if (tool === 'hand') return;

        // Shape Tools
        if (shapes.includes(tool)) {
            if (tool === 'polyline') {
                e.stopPropagation();

                // Setup long press finish detection
                startPointerPos.current = { x: e.clientX, y: e.clientY };
                if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
                longPressTimeout.current = setTimeout(() => {
                    finishPolyline();
                    longPressTimeout.current = null;
                }, 750); // 750ms long press to finish

                if (e.detail === 2) { // Double click to finish
                    if (polylinePoints.current.length > 1) {
                        onStrokeComplete([...polylinePoints.current]);
                        polylinePoints.current = [];
                        setCurrentStroke(null);
                        isDrawing.current = false;
                        setIsInteracting(false);
                    }
                    if (longPressTimeout.current) {
                        clearTimeout(longPressTimeout.current);
                        longPressTimeout.current = null;
                    }
                    return;
                }
                const pt = { x, y, pressure: 0.5 };
                if (!isDrawing.current) {
                    isDrawing.current = true;
                    polylinePoints.current = [pt];
                    setCurrentStroke([pt]);
                } else {
                    if (polylinePoints.current.length > 2) {
                        const start = polylinePoints.current[0];
                        const distToStart = Math.hypot(start.x - x, start.y - y);
                        if (distToStart < 20 / camera.scale) {
                            onStrokeComplete([...polylinePoints.current, start]);
                            polylinePoints.current = [];
                            setCurrentStroke(null);
                            isDrawing.current = false;
                            setIsInteracting(false);
                            return;
                        }
                    }
                    polylinePoints.current.push(pt);
                    setCurrentStroke([...polylinePoints.current]);
                }
                return;
            }

            if (tool === 'arc') {
                if (arcStage.current === 0) {
                    shapeStartPoint.current = { x, y, pressure: 0.5 };
                    arcPoints.current = { start: { x, y, pressure: 0.5 }, end: { x, y, pressure: 0.5 }, control: { x, y, pressure: 0.5 } };
                    arcStage.current = 1;
                    isDrawing.current = true;
                } else if (arcStage.current === 2 && arcPoints.current) {
                    const pts = getArcPoints(arcPoints.current.start, arcPoints.current.end, { x, y, pressure: 0.5 }, strokeOpts);
                    onStrokeComplete(pts);
                    setCurrentStroke(null);
                    arcStage.current = 0;
                    arcPoints.current = null;
                    isDrawing.current = false;
                    setIsInteracting(false);
                }
                return;
            }

            shapeStartPoint.current = { x, y, pressure: 0.5 };
            isDrawing.current = true;
            return;
        }

        // --- STROKE TRANSFORM / SELECTION LOGIC ---
        const isLassoOrMove = tool === 'lasso' || tool === 'move';
        if (isLassoOrMove && isTeacher) {
            if (strokeSelectionBounds && selectedStrokeIds.length > 0) {
                const target = e.target as SVGElement;
                const handleType = target.getAttribute('data-handle');

                if (handleType && handleType.startsWith('strokes-')) {
                    const initCommonParams = () => ({
                        startX: x, startY: y,
                        initialTx: tempStrokeTransform.x,
                        initialTy: tempStrokeTransform.y,
                        initialScale: tempStrokeTransform.scale,
                        initialRotation: tempStrokeTransform.rotation,
                        centerX: strokeSelectionBounds.cx,
                        centerY: strokeSelectionBounds.cy
                    });

                    if (handleType === 'strokes-move') {
                        setTransformMode('strokes-move');
                        initialTransformParams.current = initCommonParams();
                        return;
                    }

                    const common = initCommonParams();
                    const visualCx = common.centerX + common.initialTx;
                    const visualCy = common.centerY + common.initialTy;

                    if (handleType === 'strokes-resize') {
                        setTransformMode('strokes-resize');
                        initialTransformParams.current = {
                            ...common,
                            startDistance: Math.hypot(x - visualCx, y - visualCy),
                        };
                        return;
                    }

                    if (handleType === 'strokes-rotate') {
                        setTransformMode('strokes-rotate');
                        initialTransformParams.current = {
                            ...common,
                            startAngle: Math.atan2(y - visualCy, x - visualCx),
                        };
                        return;
                    }

                    const margin = 20 / camera.scale;
                    const currentTx = tempStrokeTransform.x;
                    const currentTy = tempStrokeTransform.y;
                    const boxX = strokeSelectionBounds.x + currentTx;
                    const boxY = strokeSelectionBounds.y + currentTy;

                    if (handleType === 'strokes-drag' ||
                        (x >= boxX - margin && x <= boxX + strokeSelectionBounds.width + margin &&
                            y >= boxY - margin && y <= boxY + strokeSelectionBounds.height + margin)) {

                        setTransformMode('strokes-drag');
                        initialTransformParams.current = initCommonParams();
                        return;
                    }
                }
            }

            if (tool === 'lasso') {
                setLassoPoints([{ x, y, pressure: 0.5 }]);
                setTempStrokeTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
                isDrawing.current = true;
                return;
            }
        }

        // Single Item Move / Empty canvas selection for Move tool
        if (tool === 'move' || isCropMode) {
            const target = e.target as SVGElement;
            const handleType = target.getAttribute('data-handle');
            if (handleType && selectedId) {
                const item = activeImages.find(i => i.id === selectedId) || activeTexts.find(t => t.id === selectedId);
                if (item) {
                    initialTransformParams.current = {
                        itemSnapshot: { ...item }
                    };
                }
                setTransformMode(handleType as any);
                return;
            }
            if (!isCropMode) {
                const selectableTexts = activeTexts.filter(t => !lockedLayerIds.has(t.layerId || ''));
                const clickedText = [...selectableTexts].reverse().find(txt => x >= txt.x && x <= txt.x + txt.width && y >= txt.y && y <= txt.y + txt.height);
                if (clickedText) {
                    initialTransformParams.current = {
                        itemSnapshot: { ...clickedText }
                    };
                    setSelectedId(clickedText.id); setSelectedType('text'); setTransformMode('drag'); return;
                }
                const selectableImages = activeImages.filter(i => !lockedLayerIds.has(i.layerId || ''));
                const clickedImg = [...selectableImages].reverse().find(img => x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height);
                if (clickedImg) {
                    initialTransformParams.current = {
                        itemSnapshot: { ...clickedImg }
                    };
                    setSelectedId(clickedImg.id); setSelectedType('image'); setTransformMode('drag'); return;
                }

                // Clicked empty canvas:
                setSelectedId(null); setSelectedType(null);

                if (spacePressed.current || e.pointerType === 'touch') {
                    setTransformMode('pan');
                    panStart.current = {
                        x: e.clientX,
                        y: e.clientY,
                        camera: { ...camera }
                    };
                } else {
                    // Stylus/Mouse draws lasso selection loop on empty canvas
                    setLassoPoints([{ x, y, pressure: 0.5 }]);
                    setTempStrokeTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
                    setTransformMode(null);
                    isDrawing.current = true;
                }
            }
            return;
        }

        // Drawing (Pen/Eraser)
        if (tool === 'pen' || tool === 'eraser') {
            isDrawing.current = true;
            lastDrawPoint.current = { x, y, time: Date.now() };
            if (tool === 'eraser' && eraserMode !== 'freehand') {
                shapeStartPoint.current = { x, y, pressure: 0.5 };
                setCurrentStroke([{ x, y, pressure: 0.5 }]);
            } else {
                const isStylusInput = e.pointerType === 'pen' || (e.pressure > 0 && e.pressure !== 0.5 && e.pressure !== 1);
                const inputPressure = isStylusInput ? e.pressure : 0.5;
                const mixedPressure = inputPressure * (strokeOpts.pressureWeight ?? 1);
                setCurrentStroke([{ x, y, pressure: mixedPressure }]);
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (longPressTimeout.current && startPointerPos.current) {
            const dist = Math.hypot(e.clientX - startPointerPos.current.x, e.clientY - startPointerPos.current.y);
            if (dist > 8) {
                clearTimeout(longPressTimeout.current);
                longPressTimeout.current = null;
            }
        }

        if (activePointers.current.has(e.pointerId)) {
            activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
        }

        // Middle-button panning (mouse)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (middlePan.current && e.pointerType === 'mouse') {
            if (isNavLocked) return;
            const start = panStart.current;
            if (start) {
                const dx = e.clientX - start.x;
                const dy = e.clientY - start.y;
                updateCameraRAF({
                    x: start.camera.x + dx,
                    y: start.camera.y + dy,
                    scale: start.camera.scale
                });
            }
            return;
        }

        if (activePointers.current.size === 2) {
            if (isNavLocked) return;

            const pointers = Array.from(activePointers.current.values());
            const p1 = pointers[0] as { x: number, y: number };
            const p2 = pointers[1] as { x: number, y: number };

            const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            const currentCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

            const start = gestureStart.current;
            if (start) {
                const scaleFactor = currentDist / (start.dist || 1);
                const newScale = Math.min(Math.max(start.camera.scale * scaleFactor, 0.1), 10);

                const worldFocusX = (start.center.x - start.camera.x) / start.camera.scale;
                const worldFocusY = (start.center.y - start.camera.y) / start.camera.scale;

                const newX = currentCenter.x - (worldFocusX * newScale);
                const newY = currentCenter.y - (worldFocusY * newScale);

                updateCameraRAF({ x: newX, y: newY, scale: newScale });
            }
            return;
        }

        if (((tool === 'hand' || !isTeacher) || (tool === 'move' && transformMode === 'pan')) && activePointers.current.has(e.pointerId)) {
            if (isNavLocked) return;
            const start = panStart.current;
            if (start) {
                const dx = e.clientX - start.x;
                const dy = e.clientY - start.y;
                updateCameraRAF({
                    x: start.camera.x + dx,
                    y: start.camera.y + dy,
                    scale: start.camera.scale
                });
            }
            return;
        }

        if (!isTeacher) return;

        if (activePointers.current.size > 1) return;

        const isContinuousShape = (tool === 'polyline' || tool === 'arc') && isDrawing.current;
        if (!activePointers.current.has(e.pointerId) && !isContinuousShape) return;

        // --- SYNCHRONOUS EVENT DATA CAPTURE ---
        const clientX = e.clientX;
        const clientY = e.clientY;
        const pointerType = e.pointerType;
        const pressure = e.pressure;
        const movementX = e.movementX;
        const movementY = e.movementY;

        const useStylus = strokeOpts.useStylusPressure !== false;

        const coalesced = (e.nativeEvent && typeof e.nativeEvent.getCoalescedEvents === 'function')
            ? e.nativeEvent.getCoalescedEvents().map(ce => {
                const isStylus = useStylus && (ce.pointerType === 'pen' || (ce.pressure > 0 && ce.pressure !== 0.5 && ce.pressure !== 1));
                return {
                    clientX: ce.clientX,
                    clientY: ce.clientY,
                    pressure: isStylus ? ce.pressure : 0.5
                };
            })
            : [];

        if (coalesced.length === 0) {
            const isStylus = useStylus && (pointerType === 'pen' || (pressure > 0 && pressure !== 0.5 && pressure !== 1));
            coalesced.push({
                clientX,
                clientY,
                pressure: isStylus ? pressure : 0.5
            });
        }

        // Schedule RAF for coordinate mapping and canvas updates
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
            const { x, y } = screenToWorld(clientX, clientY);

            const shapes = ['line', 'circle', 'polyline', 'arc', 'square', 'rectangle', 'parallelogram'];
            if (isDrawing.current && shapes.includes(tool)) {
                if (tool === 'line' && shapeStartPoint.current) setCurrentStroke(getLinePoints(shapeStartPoint.current, { x, y, pressure: 0.5 }, strokeOpts));
                if (tool === 'circle' && shapeStartPoint.current) setCurrentStroke(getCirclePoints(shapeStartPoint.current, { x, y, pressure: 0.5 }, strokeOpts));
                if (tool === 'square' && shapeStartPoint.current) setCurrentStroke(getSquarePoints(shapeStartPoint.current, { x, y, pressure: 0.5 }, strokeOpts));
                if (tool === 'rectangle' && shapeStartPoint.current) setCurrentStroke(getRectanglePoints(shapeStartPoint.current, { x, y, pressure: 0.5 }, strokeOpts));
                if (tool === 'parallelogram' && shapeStartPoint.current) setCurrentStroke(getParallelogramPoints(shapeStartPoint.current, { x, y, pressure: 0.5 }, strokeOpts));
                if (tool === 'polyline') setCurrentStroke([...polylinePoints.current, { x, y, pressure: 0.5 }]);
                if (tool === 'arc') { /* ... */ }
                return;
            }

            if ((tool === 'lasso' || tool === 'move') && isDrawing.current) {
                setLassoPoints(prev => [...(prev || []), { x, y, pressure: 0.5 }]);
                return;
            }

            if ((tool === 'lasso' || tool === 'move') && selectedStrokeIds.length > 0 && strokeSelectionBounds) {
                const params = initialTransformParams.current;
                if (!params) return;

                if (transformMode === 'strokes-drag' || transformMode === 'strokes-move') {
                    const dx = x - params.startX;
                    const dy = y - params.startY;
                    setTempStrokeTransform(prev => ({
                        ...prev,
                        x: (params.initialTx ?? 0) + dx,
                        y: (params.initialTy ?? 0) + dy
                    }));
                    return;
                }

                const effCx = params.centerX + (tempStrokeTransform.x);
                const effCy = params.centerY + (tempStrokeTransform.y);

                if (transformMode === 'strokes-resize') {
                    const currentDist = Math.hypot(x - effCx, y - effCy);
                    const startDist = params.startDistance || 1;
                    const scaleRatio = currentDist / startDist;
                    const newScale = Math.max(0.1, (params.initialScale || 1) * scaleRatio);

                    setTempStrokeTransform(prev => ({ ...prev, scale: newScale }));
                    return;
                }

                if (transformMode === 'strokes-rotate') {
                    const currentAngle = Math.atan2(y - effCy, x - effCx);
                    const angleDiff = currentAngle - (params.startAngle || 0);
                    const angleDeg = angleDiff * (180 / Math.PI);

                    setTempStrokeTransform(prev => ({ ...prev, rotation: (params.initialRotation || 0) + angleDeg }));
                    return;
                }
            }

            if ((tool === 'move' || isCropMode) && selectedId && transformMode) {
                const dx = movementX / camera.scale;
                const dy = movementY / camera.scale;
                if (selectedId) {
                    const targetType = activeImages.find(i => i.id === selectedId) ? 'image' : 'text';
                    if (targetType === 'image') {
                        setImages(prev => prev.map(i => {
                            if (i.id !== selectedId) return i;
                            if (transformMode === 'drag') return { ...i, x: i.x + dx, y: i.y + dy };
                            if (transformMode === 'resize') { const newW = Math.max(20, x - i.x); return { ...i, width: newW, height: newW * (i.height / i.width) }; }
                            if (transformMode === 'rotate') return { ...i, rotation: Math.atan2(y - (i.y + i.height / 2), x - (i.x + i.width / 2)) * (180 / Math.PI) + 90 };
                            return i;
                        }));
                    } else {
                        setTexts(prev => prev.map(t => {
                            if (t.id !== selectedId) return t;
                            if (transformMode === 'drag') return { ...t, x: t.x + dx, y: t.y + dy };
                            if (transformMode === 'resize') return { ...t, width: Math.max(50, x - t.x), height: Math.max(50, y - t.y) };
                            if (transformMode === 'rotate') return { ...t, rotation: Math.atan2(y - (t.y + t.height / 2), x - (t.x + t.width / 2)) * (180 / Math.PI) + 90 };
                            return t;
                        }));
                    }
                }
                return;
            }

            if (isDrawing.current && (tool === 'pen' || tool === 'eraser')) {
                if (tool === 'eraser' && eraserMode !== 'freehand') {
                    if (shapeStartPoint.current) {
                        setCurrentStroke([shapeStartPoint.current, { x, y, pressure: 0.5 }]);
                    }
                } else {
                    const pointsToAdd: Point[] = [];
                    coalesced.forEach(ce => {
                        const { x: cx, y: cy } = screenToWorld(ce.clientX, ce.clientY);
                        const mixedPressure = ce.pressure * (strokeOpts.pressureWeight ?? 1);
                        pointsToAdd.push({ x: cx, y: cy, pressure: mixedPressure });
                    });

                    const currentTime = Date.now();
                    lastDrawPoint.current = { x: clientX, y: clientY, time: currentTime };

                    setCurrentStroke(prev => {
                        const base = prev || [];
                        const newPoints = [...base];
                        pointsToAdd.forEach(p => {
                            if (newPoints.length > 0) {
                                const last = newPoints[newPoints.length - 1];
                                const dist = Math.hypot(p.x - last.x, p.y - last.y);
                                const throttle = strokeOpts.pointThrottle ?? 2;
                                if (dist < throttle / camera.scale) return;
                            }
                            newPoints.push(p);
                        });
                        return newPoints;
                    });
                }
            }
        });
    };

    const handlePointerUp = async (e: React.PointerEvent) => {
        if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
            longPressTimeout.current = null;
        }

        activePointers.current.delete(e.pointerId);

        // End middle-button panning if it was active
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (middlePan.current && e.pointerType === 'mouse' && (e as any).button === 1) {
            middlePan.current = false;
            lastMiddlePoint.current = null;
            panStart.current = null;
            setIsInteracting(false);
            return;
        }

        if (activePointers.current.size < 2) {
            gestureStart.current = null;
            commitCameraState();
        }

        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        if (activePointers.current.size === 0) {
            panStart.current = null;
            if (!(tool === 'polyline' && isDrawing.current) && !(tool === 'arc' && isDrawing.current)) {
                setIsInteracting(false);
            }
        }

        if (!isTeacher) return;

        if (!gestureStart.current) {
            const { x, y } = screenToWorld(e.clientX, e.clientY);

            if ((tool === 'lasso' || tool === 'move') && isDrawing.current && lassoPoints) {
                isDrawing.current = false;
                const closedLoop = [...lassoPoints, lassoPoints[0]];
                onLassoEnd(closedLoop);
                setLassoPoints(null);
                setIsInteracting(false);
                return;
            }

            if ((tool === 'lasso' || tool === 'move') && (transformMode?.startsWith('strokes-'))) {
                setTransformMode(null);
                initialTransformParams.current = null;
                setIsInteracting(false);
                return;
            }

            if (selectedId && transformMode) {
                const item = activeImages.find(i => i.id === selectedId) || activeTexts.find(t => t.id === selectedId);
                if (item) {
                    const type = activeImages.find(i => i.id === selectedId) ? 'image' : 'text';
                    const prevSnapshot = initialTransformParams.current?.itemSnapshot;
                    updateItemInFirestore(selectedId, type, { x: item.x, y: item.y, width: item.width, height: item.height, rotation: item.rotation }, prevSnapshot);
                }
                setTransformMode(null);
                initialTransformParams.current = null;
                setIsInteracting(false);
            } else if (transformMode === 'pan') {
                setTransformMode(null);
                setIsInteracting(false);
            }

            if (isDrawing.current && currentStroke && (tool === 'pen' || tool === 'eraser')) {
                onStrokeComplete([...currentStroke]);
                setCurrentStroke(null);
                isDrawing.current = false;
                shapeStartPoint.current = null;
                setIsInteracting(false);
            }

            const shapes = ['line', 'circle', 'square', 'rectangle', 'parallelogram'];
            if (shapes.includes(tool) && isDrawing.current) {
                onStrokeComplete([...(currentStroke || [])]);
                setCurrentStroke(null);
                isDrawing.current = false;
                shapeStartPoint.current = null;
                setIsInteracting(false);
            }
        }
    };

    const handlePointerCancel = (e: React.PointerEvent) => {
        if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
            longPressTimeout.current = null;
        }

        activePointers.current.delete(e.pointerId);
        if (activePointers.current.size < 2) {
            gestureStart.current = null;
            commitCameraState();
        }
        if (middlePan.current) {
            middlePan.current = false;
            lastMiddlePoint.current = null;
            panStart.current = null;
        }

        if (activePointers.current.size === 0) {
            isDrawing.current = false;
            setCurrentStroke(null);
            setLassoPoints(null);
            polylinePoints.current = [];
            shapeStartPoint.current = null;
            arcStage.current = 0;
            panStart.current = null;
            setIsInteracting(false);
        }
    };

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerCancel,
        currentStroke,
        lassoPoints,
        isInteracting,
        finishPolyline
    };
};
