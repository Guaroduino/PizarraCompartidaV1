// File: src/components/whiteboard/ui/WhiteboardToolbar.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    IconPencil, IconTrash, IconSettings, IconLayers, IconX, IconScribble,
    IconSquare, IconRectangle, IconParallelogram, IconFill, IconBorder,
    IconBrush, IconEraser, IconLine, IconPolyline, IconCircle, IconArc,
    IconSelect, IconLasso, IconImage, IconUndo, IconRedo, IconSidebar
} from '../../Icons';
import type { ToolPreset, ToolType, DrawStyle, ExtendedStrokeOptions } from '../../../types/whiteboardTypes';
import { ColorPicker, ColorPickerButton } from '../../ColorPicker';

const GEO_TOOLS = [
    { id: 'pen', icon: IconScribble, label: 'Mano Alzada' },
    { id: 'line', icon: IconLine, label: 'Línea' },
    { id: 'polyline', icon: IconPolyline, label: 'Polilínea' },
    { id: 'circle', icon: IconCircle, label: 'Círculo' },
    { id: 'square', icon: IconSquare, label: 'Cuadrado' },
    { id: 'rectangle', icon: IconRectangle, label: 'Rectángulo' },
    { id: 'parallelogram', icon: IconParallelogram, label: 'Paralelogramo' },
    { id: 'arc', icon: IconArc, label: 'Arco' }
];

const MIN_SIZE = 0.25;
const MAX_SIZE = 50;
const getSliderValue = (size: number) => {
    const normalized = (size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
    return Math.sqrt(Math.max(0, normalized)) * 100;
};
const getSizeValue = (sliderVal: number) => {
    const normalized = Math.pow(sliderVal / 100, 2);
    const val = MIN_SIZE + (normalized * (MAX_SIZE - MIN_SIZE));
    return parseFloat(val.toFixed(2));
};

interface WhiteboardToolbarProps {
    tool: ToolType;
    setTool: (tool: ToolType) => void;
    activePresetIdx: number;
    presets: ToolPreset[];
    onSelectPreset: (idx: number) => void;
    onUpdatePreset: (idx: number, updates: Partial<ToolPreset>) => void;
    stylusOnly: boolean;
    setStylusOnly: (val: boolean) => void;
    showLayers: boolean;
    setShowLayers: (show: boolean) => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;

    // Stroke State
    currentColor: string;
    onSetColor: (color: string) => void;

    // Fill State
    fillColor: string;
    onSetFillColor: (color: string) => void;
    isFilled: boolean;
    onToggleFill: (val: boolean) => void;
    isStroked: boolean;
    onToggleStroke: (val: boolean) => void;

    drawStyle: DrawStyle;
    setDrawStyle: (style: DrawStyle) => void;
    currentSize?: number;
    onSizeChange?: (size: number) => void;
    currentStrokeOptions?: ExtendedStrokeOptions;
    onStrokeOptionsChange?: (options: ExtendedStrokeOptions) => void;
    opacity?: number;
    onOpacityChange?: (opacity: number) => void;

    // Zoom & Undo/Redo Integration
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    cameraScale: number;
    setCamera: React.Dispatch<React.SetStateAction<{ x: number, y: number, scale: number }>>;
    onZoomExtents: () => void;
    isTeacher: boolean;
    isSidePanelOpen: boolean;
    setIsSidePanelOpen: (val: boolean) => void;

    // Eraser configuration states
    eraserTargets: { strokes: boolean; images: boolean; texts: boolean };
    setEraserTargets: React.Dispatch<React.SetStateAction<{ strokes: boolean; images: boolean; texts: boolean }>>;
    eraserLayerScope: 'current' | 'all';
    setEraserLayerScope: (scope: 'current' | 'all') => void;
    eraserMode: 'freehand' | 'rect' | 'circle';
    setEraserMode: (mode: 'freehand' | 'rect' | 'circle') => void;
}

// PresetEditor stays as a popover inside the brush panel
const PresetEditor: React.FC<{
    preset: ToolPreset;
    onUpdate: (updates: Partial<ToolPreset>) => void;
    onClose: () => void;
}> = ({ preset, onUpdate, onClose }) => {
    return (
        <div
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-4 border border-gray-200 dark:border-gray-700 z-[140] cursor-default flex flex-col"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-3 pb-2 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-dark-card z-10 flex-shrink-0">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Detalles de Preset</span>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><IconX className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                {/* Color Selector */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase">Color</label>
                        <ColorPickerButton
                            color={preset.color}
                            onChange={(c) => onUpdate({ color: c })}
                            className="w-5 h-5 rounded-full"
                            position="top"
                        />
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-between">
                        {['#000000', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'].map(c => (
                            <button
                                key={c}
                                onClick={() => onUpdate({ color: c })}
                                className={`w-5.5 h-5.5 rounded-full border border-gray-200 dark:border-gray-600 ${preset.color === c ? 'ring-2 ring-primary ring-offset-1 scale-105' : ''}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {/* Size and Opacity sliders */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                            <span>Grosor</span>
                            <span className="font-bold text-primary">{preset.size}px</span>
                        </div>
                        <input
                            type="range" min="0" max="100" step="1"
                            value={getSliderValue(preset.size)}
                            onChange={e => onUpdate({ size: getSizeValue(parseInt(e.target.value)) })}
                            className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                            <span>Opacidad</span>
                            <span className="font-bold text-primary">{Math.round(preset.opacity * 100)}%</span>
                        </div>
                        <input
                            type="range" min="0.1" max="1" step="0.05"
                            value={preset.opacity}
                            onChange={e => onUpdate({ opacity: parseFloat(e.target.value) })}
                            className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                </div>

                {/* Advanced brush settings */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="flex items-center gap-2 cursor-pointer p-0.5 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                        <input
                            type="checkbox"
                            checked={preset.options.isNaturalMarker || false}
                            onChange={e => onUpdate({ options: { ...preset.options, isNaturalMarker: e.target.checked } })}
                            className="peer h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-300 uppercase">Efecto Rotulador</span>
                    </div>

                    {preset.options.isNaturalMarker && (
                        <div className="space-y-1 animate-in slide-in-from-top-1 fade-in">
                            <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                <span>Textura (Ruido)</span>
                                <span>{(preset.options.markerTextureScale ?? 0.1).toFixed(2)}</span>
                            </div>
                            <input
                                type="range" min="0.01" max="0.5" step="0.01"
                                value={preset.options.markerTextureScale ?? 0.1}
                                onChange={e => onUpdate({ options: { ...preset.options, markerTextureScale: parseFloat(e.target.value) } })}
                                className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2 cursor-pointer p-0.5 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                        <input
                            type="checkbox"
                            checked={preset.options.simulatePressure ?? true}
                            onChange={e => onUpdate({ options: { ...preset.options, simulatePressure: e.target.checked } })}
                            className="peer h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-300 uppercase">Simular Presión</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = (props) => {
    const {
        tool, setTool, activePresetIdx, presets, onSelectPreset, onUpdatePreset,
        stylusOnly, setStylusOnly, showLayers, setShowLayers, onImageUpload,
        currentColor, onSetColor,
        fillColor, onSetFillColor, isFilled, onToggleFill, isStroked, onToggleStroke,
        currentSize, onSizeChange, currentStrokeOptions, onStrokeOptionsChange, opacity, onOpacityChange,
        undo, redo, canUndo, canRedo, cameraScale, setCamera, onZoomExtents, isTeacher, isSidePanelOpen, setIsSidePanelOpen,
        eraserTargets, setEraserTargets, eraserLayerScope, setEraserLayerScope, eraserMode, setEraserMode
    } = props;

    // Popover states
    const [showBrushPanel, setShowBrushPanel] = useState(false);
    const [showGeoMenu, setShowGeoMenu] = useState(false);
    const [showEraserPanel, setShowEraserPanel] = useState(false);
    const [showZoomMenu, setShowZoomMenu] = useState(false);

    const [quickColors, setQuickColors] = useState<string[]>(() => {
        const saved = localStorage.getItem('wb_quick_colors');
        return saved ? JSON.parse(saved) : ['#000000', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'];
    });
    const [editingQuickColorIdx, setEditingQuickColorIdx] = useState<number | null>(null);

    const [lastGeoTool, setLastGeoTool] = useState<ToolType>('line');
    const isShapeTool = ['line', 'polyline', 'circle', 'arc', 'square', 'rectangle', 'parallelogram'].includes(tool);

    useEffect(() => {
        localStorage.setItem('wb_quick_colors', JSON.stringify(quickColors));
    }, [quickColors]);

    useEffect(() => {
        if (isShapeTool) {
            setLastGeoTool(tool);
        }
    }, [tool, isShapeTool]);

    // Handle clicking outside to close popovers automatically
    useEffect(() => {
        const handleClickOutside = () => {
            setShowGeoMenu(false);
            setShowBrushPanel(false);
            setEditingQuickColorIdx(null);
            setShowZoomMenu(false);
            setShowEraserPanel(false);
        };
        if (showGeoMenu || showBrushPanel || editingQuickColorIdx !== null || showZoomMenu || showEraserPanel) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showGeoMenu, showBrushPanel, editingQuickColorIdx, showZoomMenu, showEraserPanel]);

    // Custom gesture / click / hold trigger refs
    const longPressTimeoutRef = useRef<{ [key: string]: any }>({});
    const startPointRef = useRef<{ [key: string]: { x: number, y: number } }>({});

    const createTriggerHandlers = (toolName: string, onSingleClick: () => void, onDoubleClickOrLongPress: () => void) => {
        return {
            onPointerDown: (e: React.PointerEvent) => {
                if (e.button !== 0) return;
                startPointRef.current[toolName] = { x: e.clientX, y: e.clientY };
                if (longPressTimeoutRef.current[toolName]) {
                    clearTimeout(longPressTimeoutRef.current[toolName]);
                }
                longPressTimeoutRef.current[toolName] = setTimeout(() => {
                    onDoubleClickOrLongPress();
                    delete startPointRef.current[toolName];
                }, 500);
            },
            onPointerUp: (e: React.PointerEvent) => {
                if (longPressTimeoutRef.current[toolName]) {
                    clearTimeout(longPressTimeoutRef.current[toolName]);
                    delete longPressTimeoutRef.current[toolName];
                }
                if (startPointRef.current[toolName]) {
                    const dx = e.clientX - startPointRef.current[toolName].x;
                    const dy = e.clientY - startPointRef.current[toolName].y;
                    const dist = Math.hypot(dx, dy);
                    delete startPointRef.current[toolName];
                    if (dist < 10) {
                        onSingleClick();
                    }
                }
            },
            onPointerLeave: () => {
                if (longPressTimeoutRef.current[toolName]) {
                    clearTimeout(longPressTimeoutRef.current[toolName]);
                    delete longPressTimeoutRef.current[toolName];
                }
                delete startPointRef.current[toolName];
            },
            onDoubleClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                if (longPressTimeoutRef.current[toolName]) {
                    clearTimeout(longPressTimeoutRef.current[toolName]);
                    delete longPressTimeoutRef.current[toolName];
                }
                delete startPointRef.current[toolName];
                onDoubleClickOrLongPress();
            }
        };
    };

    const brushHandlers = createTriggerHandlers(
        'brush',
        () => {
            setTool('pen');
            setShowBrushPanel(false);
            setShowGeoMenu(false);
            setShowEraserPanel(false);
        },
        () => {
            setTool('pen');
            setShowBrushPanel(true);
            setShowGeoMenu(false);
            setShowEraserPanel(false);
        }
    );

    const geoHandlers = createTriggerHandlers(
        'geo',
        () => {
            setTool(lastGeoTool);
            setShowBrushPanel(false);
            setShowGeoMenu(false);
            setShowEraserPanel(false);
        },
        () => {
            setTool(lastGeoTool);
            setShowBrushPanel(false);
            setShowGeoMenu(true);
            setShowEraserPanel(false);
        }
    );

    const eraserHandlers = createTriggerHandlers(
        'eraser',
        () => {
            setTool('eraser');
            setShowBrushPanel(false);
            setShowGeoMenu(false);
            setShowEraserPanel(false);
        },
        () => {
            setTool('eraser');
            setShowBrushPanel(false);
            setShowGeoMenu(false);
            setShowEraserPanel(true);
        }
    );

    const selectGeoTool = (selectedId: string) => {
        setTool(selectedId as ToolType);
        setLastGeoTool(selectedId as ToolType);
    };

    const handleQuickColorClick = (idx: number, color: string) => {
        onSetColor(color);
        if (tool !== 'pen' && !isShapeTool) {
            setTool('pen');
        }
    };

    const handleQuickColorUpdate = (idx: number, newColor: string) => {
        const newColors = [...quickColors];
        newColors[idx] = newColor;
        setQuickColors(newColors);
        onSetColor(newColor);
    };

    const handleZoomOption = (scale: number) => {
        setCamera(prev => ({
            ...prev,
            x: window.innerWidth / 2 - (window.innerWidth / 2 - prev.x) * (scale / prev.scale),
            y: window.innerHeight / 2 - (window.innerHeight / 2 - prev.y) * (scale / prev.scale),
            scale: scale
        }));
        setShowZoomMenu(false);
    };

    const ActiveGeoIcon = GEO_TOOLS.find(t => t.id === lastGeoTool)?.icon || IconLine;

    return (
        <div className="glass-panel flex items-center justify-between gap-1.5 px-3 py-2 rounded-2xl pointer-events-auto select-none shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            
            {/* ZONE A: NAVIGATION & ACTIONS (UNDO, REDO, ZOOM) */}
            <div className="flex items-center gap-1">
                <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all hover:scale-105"
                    title="Deshacer (Ctrl+Z)"
                >
                    <IconUndo className="w-5 h-5" />
                </button>
                <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all hover:scale-105"
                    title="Rehacer (Ctrl+Y)"
                >
                    <IconRedo className="w-5 h-5" />
                </button>
                
                <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1.5" />

                {/* ZOOM DOCK */}
                <div className="flex items-center gap-0.5">
                    <button
                        onClick={() => setCamera(prev => ({ ...prev, scale: Math.max(0.1, prev.scale * 0.8) }))}
                        className="p-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                        title="Reducir Zoom"
                    >
                        -
                    </button>
                    
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowZoomMenu(!showZoomMenu); }}
                            className="px-2 py-1 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md min-w-[50px] text-center"
                            title="Opciones de Zoom"
                        >
                            {Math.round(cameraScale * 100)}%
                        </button>
                        {showZoomMenu && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-1 z-[130] w-28 flex flex-col gap-0.5 animate-in slide-in-from-bottom-2 duration-150">
                                {[0.25, 0.5, 1.0, 2.0, 4.0].map(s => (
                                    <button key={s} onClick={() => handleZoomOption(s)} className="px-3 py-1.5 text-xs text-left text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md font-medium">
                                        {s * 100}%
                                    </button>
                                ))}
                                <div className="h-px bg-gray-100 dark:bg-gray-700 my-0.5" />
                                <button onClick={() => { onZoomExtents(); setShowZoomMenu(false); }} className="px-3 py-1.5 text-xs text-left text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md font-bold text-primary">
                                    Ajustar todo
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setCamera(prev => ({ ...prev, scale: Math.min(10, prev.scale * 1.25) }))}
                        className="p-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                        title="Aumentar Zoom"
                    >
                        +
                    </button>
                </div>
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

            {/* ZONE B: CORE CREATION TOOLS */}
            <div className="flex items-center gap-1">
                {/* SELECT / POINTER */}
                <button
                    onClick={() => { setTool('move'); setShowBrushPanel(false); setShowGeoMenu(false); setShowEraserPanel(false); }}
                    className={`p-2.5 rounded-xl transition-all hover:scale-105 ${tool === 'move' ? 'bg-primary text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    title="Seleccionar / Mover (V)"
                >
                    <IconSelect className="w-5 h-5" />
                </button>

                {/* BRUSH (PENCIL / MARKER) */}
                <div className="relative">
                    <button
                        {...brushHandlers}
                        className={`p-2.5 rounded-xl transition-all hover:scale-105 flex items-center relative ${tool === 'pen' ? 'bg-primary text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title="Pincel / Lápiz (P) - Doble click para opciones"
                    >
                        <IconBrush className="w-5 h-5" />
                        {/* Dot showing current brush color & size scale */}
                        <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-900 shadow-sm" style={{ backgroundColor: currentColor }}></span>
                    </button>

                    {/* Consolidated Brush Popover */}
                    {showBrushPanel && onSizeChange && currentSize !== undefined && currentStrokeOptions && onStrokeOptionsChange && (
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 w-72 z-[130] flex flex-col gap-4 animate-in slide-in-from-bottom-2 duration-150 cursor-default" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                            
                            {/* Brush Presets Selector */}
                            <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Ajustes Rápidos (Presets)</span>
                                <div className="flex gap-3 justify-center">
                                    {presets.map((p, i) => (
                                        <div key={i} className="relative">
                                            <button
                                                onClick={() => onSelectPreset(i)}
                                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${activePresetIdx === i ? 'ring-2 ring-offset-2 ring-primary scale-105' : 'opacity-85 hover:opacity-100 hover:scale-105'}`}
                                                style={{ backgroundColor: p.color }}
                                            >
                                                <div className="rounded-full bg-white/40 shadow-sm" style={{ width: Math.min(18, Math.max(5, p.size)), height: Math.min(18, Math.max(5, p.size)) }} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                            {/* Palette Quick Colors for Stroke */}
                            <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Paleta de Colores</span>
                                <div className="flex gap-2 justify-between">
                                    {quickColors.map((c, i) => (
                                        <div key={i} className="relative">
                                            <button
                                                onClick={() => handleQuickColorClick(i, c)}
                                                onContextMenu={(e) => { e.preventDefault(); setEditingQuickColorIdx(i); }}
                                                className={`w-5.5 h-5.5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm transition-transform hover:scale-110 ${currentColor === c ? 'ring-2 ring-primary ring-offset-1 scale-105' : ''}`}
                                                style={{ backgroundColor: c }}
                                            />
                                            {editingQuickColorIdx === i && (
                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-[200]">
                                                    <ColorPicker color={c} onChange={(newVal) => handleQuickColorUpdate(i, newVal)} onClose={() => setEditingQuickColorIdx(null)} label={`Color ${i + 1}`} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                            {/* Sliders Area */}
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                        <span>Grosor</span>
                                        <span className="text-primary font-bold">{currentSize}px</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="100" step="1"
                                        value={getSliderValue(currentSize)}
                                        onChange={(e) => onSizeChange(getSizeValue(parseInt(e.target.value)))}
                                        className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>

                                {onOpacityChange && opacity !== undefined && (
                                    <div>
                                        <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                            <span>Opacidad</span>
                                            <span className="text-primary font-bold">{Math.round(opacity * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0.1" max="1" step="0.05"
                                            value={opacity}
                                            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                                            className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                            {/* Consolidated Stroke Dynamics */}
                            <div className="pt-2 space-y-3">
                                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Dinámicas de Trazo</span>
                                
                                <div className="flex items-center gap-2 cursor-pointer p-0.5 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <input
                                        type="checkbox"
                                        checked={currentStrokeOptions.simulatePressure ?? true}
                                        onChange={e => onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, simulatePressure: e.target.checked } })}
                                        className="peer h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        id="opt-sim-pressure"
                                    />
                                    <label htmlFor="opt-sim-pressure" className="text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">Simular Presión</label>
                                </div>

                                <div className="flex items-center gap-2 cursor-pointer p-0.5 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <input
                                        type="checkbox"
                                        checked={currentStrokeOptions.isNaturalMarker || false}
                                        onChange={e => onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, isNaturalMarker: e.target.checked } })}
                                        className="peer h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        id="opt-nat-marker"
                                    />
                                    <label htmlFor="opt-nat-marker" className="text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">Efecto Rotulador</label>
                                </div>

                                {currentStrokeOptions.isNaturalMarker && (
                                    <div className="space-y-1 animate-in slide-in-from-top-1 fade-in">
                                        <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                            <span>Textura (Ruido)</span>
                                            <span>{(currentStrokeOptions.markerTextureScale ?? 0.1).toFixed(2)}</span>
                                        </div>
                                        <input
                                            type="range" min="0.01" max="0.5" step="0.01"
                                            value={currentStrokeOptions.markerTextureScale ?? 0.1}
                                            onChange={e => onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, markerTextureScale: parseFloat(e.target.value) } })}
                                            className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </div>

                {/* GEOMETRIC SHAPES */}
                <div className="relative">
                    <button
                        {...geoHandlers}
                        className={`p-2.5 rounded-xl transition-all hover:scale-105 flex items-center ${isShapeTool ? 'bg-primary text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title="Formas Geométricas - Doble click para opciones"
                    >
                        <ActiveGeoIcon className="w-5 h-5" />
                        <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-600 rounded-full ml-1"></span>
                    </button>

                    {/* Shapes Menu + Fill/Border Controls inside a single popover */}
                    {showGeoMenu && (
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 w-64 z-[130] flex flex-col gap-4 animate-in slide-in-from-bottom-2 duration-150" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                            
                            {/* Shape Selector grid */}
                            <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Seleccionar Forma</span>
                                <div className="grid grid-cols-4 gap-2">
                                    {GEO_TOOLS.map((gt) => (
                                        <button
                                            key={gt.id}
                                            onClick={() => selectGeoTool(gt.id)}
                                            className={`p-2 rounded-xl flex items-center justify-center transition-all hover:scale-105 ${tool === gt.id ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                            title={gt.label}
                                        >
                                            <gt.icon className="w-5 h-5" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                            {/* Shape style options (Stroke & Fill) */}
                            <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Estilos de Forma</span>
                                <div className="space-y-3">
                                    {/* Stroke Row */}
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={isStroked} onChange={e => onToggleStroke(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1"><IconBorder className="w-3.5 h-3.5" /> Contorno</span>
                                        </label>
                                        <ColorPickerButton color={currentColor} onChange={onSetColor} className="w-5.5 h-5.5 rounded-full border border-gray-300 shadow-sm" position="top" />
                                    </div>

                                    {/* Fill Row */}
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={isFilled} onChange={e => onToggleFill(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1"><IconFill className="w-3.5 h-3.5" /> Relleno</span>
                                        </label>
                                        <ColorPickerButton color={fillColor} onChange={onSetFillColor} className="w-5.5 h-5.5 rounded-md border border-gray-300 shadow-sm" position="top" />
                                    </div>
                                    {!isStroked && !isFilled && <p className="text-[9px] text-red-500 italic text-center pt-1 font-bold">¡Seleccione al menos uno!</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* TEXT BOX */}
                <button
                    onClick={() => { setTool('text'); setShowBrushPanel(false); setShowGeoMenu(false); setShowEraserPanel(false); }}
                    className={`p-2.5 rounded-xl transition-all hover:scale-105 ${tool === 'text' ? 'bg-primary text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    title="Cuadro de Texto (T)"
                >
                    <span className="w-5 h-5 flex items-center justify-center font-black text-lg font-serif">T</span>
                </button>

                {/* INSERT IMAGE */}
                <label
                    className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl cursor-pointer transition-all hover:scale-105 flex items-center"
                    title="Insertar Imagen desde Archivo"
                >
                    <IconImage className="w-5 h-5" />
                    <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
                </label>

                {/* ERASER */}
                <div className="relative">
                    <button
                        {...eraserHandlers}
                        className={`p-2.5 rounded-xl transition-all hover:scale-105 ${tool === 'eraser' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'}`}
                        title="Borrador (E) - Doble click para opciones"
                    >
                        <IconEraser className="w-5 h-5" />
                    </button>

                    {showEraserPanel && (
                        <div
                            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 w-60 z-[130] flex flex-col gap-4 animate-in slide-in-from-bottom-2 duration-150 cursor-default"
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Eraser Mode / Tipo de Borrado */}
                            <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Modo de Borrado</span>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setEraserMode('freehand')}
                                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 ${eraserMode === 'freehand' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                        title="Mano Alzada"
                                    >
                                        <IconBrush className="w-4 h-4" />
                                        <span className="text-[9px] font-semibold">Libre</span>
                                    </button>
                                    <button
                                        onClick={() => setEraserMode('rect')}
                                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 ${eraserMode === 'rect' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                        title="Rectángulo"
                                    >
                                        <IconRectangle className="w-4 h-4" />
                                        <span className="text-[9px] font-semibold">Rect</span>
                                    </button>
                                    <button
                                        onClick={() => setEraserMode('circle')}
                                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 ${eraserMode === 'circle' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                        title="Círculo"
                                    >
                                        <IconCircle className="w-4 h-4" />
                                        <span className="text-[9px] font-semibold">Círculo</span>
                                    </button>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-0.5" />

                            {/* Eraser Targets / Objetos a borrar */}
                            <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Objetos a borrar</span>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={eraserTargets.strokes}
                                            onChange={e => setEraserTargets(prev => ({ ...prev, strokes: e.target.checked }))}
                                            className="rounded text-red-500 focus:ring-red-500 h-3.5 w-3.5"
                                        />
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Trazos</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={eraserTargets.images}
                                            onChange={e => setEraserTargets(prev => ({ ...prev, images: e.target.checked }))}
                                            className="rounded text-red-500 focus:ring-red-500 h-3.5 w-3.5"
                                        />
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Imágenes</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={eraserTargets.texts}
                                            onChange={e => setEraserTargets(prev => ({ ...prev, texts: e.target.checked }))}
                                            className="rounded text-red-500 focus:ring-red-500 h-3.5 w-3.5"
                                        />
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Textos</span>
                                    </label>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-0.5" />

                            {/* Eraser Scope / Capas */}
                            <div>
                                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-2">Alcance</span>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="eraser-scope"
                                            value="current"
                                            checked={eraserLayerScope === 'current'}
                                            onChange={() => setEraserLayerScope('current')}
                                            className="text-red-500 focus:ring-red-500 h-3.5 w-3.5"
                                        />
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Solo capa actual</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="eraser-scope"
                                            value="all"
                                            checked={eraserLayerScope === 'all'}
                                            onChange={() => setEraserLayerScope('all')}
                                            className="text-red-500 focus:ring-red-500 h-3.5 w-3.5"
                                        />
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Todas las capas</span>
                                    </label>
                                </div>
                            </div>

                            {/* Eraser Brush Size (Only for freehand mode) */}
                            {eraserMode === 'freehand' && currentSize !== undefined && onSizeChange && (
                                <>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-0.5" />
                                    <div>
                                        <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                            <span>Grosor Borrador</span>
                                            <span className="text-red-500 font-bold">{currentSize}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={getSliderValue(currentSize)}
                                            onChange={(e) => onSizeChange(getSizeValue(parseInt(e.target.value)))}
                                            className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ZONE C: UTILITIES & COLLABORATION (TEACHER CONTROLS) */}
            {isTeacher && (
                <>
                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

                    <div className="flex items-center gap-1">
                        {/* LAYERS */}
                        <button
                            onClick={() => setShowLayers(!showLayers)}
                            className={`p-2.5 rounded-xl transition-all hover:scale-105 ${showLayers ? 'text-primary bg-primary/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            title="Organizar Capas"
                        >
                            <IconLayers className="w-5 h-5" />
                        </button>
                        
                        {/* CO-PILOT AI SIDE PANEL */}
                        <button
                            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                            className={`p-2.5 rounded-xl transition-all hover:scale-105 ${isSidePanelOpen ? 'text-secondary bg-secondary/15' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            title={isSidePanelOpen ? "Cerrar Panel Asistente IA" : "Abrir Panel Asistente IA"}
                        >
                            <IconSidebar className="w-5 h-5 text-secondary" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
