// File: src/components/whiteboard/ui/WhiteboardToolbar.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    IconPencil, IconTrash, IconSettings, IconLayers, IconX, IconScribble,
    IconSquare, IconRectangle, IconParallelogram, IconFill, IconBorder,
    IconBrush, IconEraser, IconLine, IconPolyline, IconCircle, IconArc,
    IconSelect, IconLasso, IconImage, IconUndo, IconRedo, IconSidebar,
    IconChevronDown, IconChevronUp, IconPlus, IconCheck,
    IconDeviceFloppy, IconDownload, IconUpload, IconDropper
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
            className="glass-panel backdrop-blur-xl bg-white/70 dark:bg-black/75 absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 rounded-2xl shadow-2xl p-4 z-[140] cursor-default flex flex-col"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-3 pb-2 border-b dark:border-gray-700 sticky top-0 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md z-10 flex-shrink-0">
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
                                className={`w-7 h-7 rounded-full border border-gray-200 dark:border-gray-600 ${preset.color === c ? 'ring-2 ring-primary ring-offset-1 scale-105' : ''}`}
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

export const WhiteboardToolbar = React.memo((props: WhiteboardToolbarProps) => {
    const {
        tool, setTool, activePresetIdx, presets, onSelectPreset, onUpdatePreset,
        stylusOnly, setStylusOnly, showLayers, setShowLayers, onImageUpload,
        currentColor, onSetColor,
        fillColor, onSetFillColor, isFilled, onToggleFill, isStroked, onToggleStroke,
        currentSize, onSizeChange, currentStrokeOptions, onStrokeOptionsChange, opacity, onOpacityChange,
        undo, redo, canUndo, canRedo, cameraScale, setCamera, onZoomExtents, isTeacher, isSidePanelOpen, setIsSidePanelOpen,
        eraserTargets, setEraserTargets, eraserLayerScope, setEraserLayerScope, eraserMode, setEraserMode,
        drawStyle, setDrawStyle
    } = props;

    // Popover states
    const [showBrushPanel, setShowBrushPanel] = useState(false);
    const [showEraserPanel, setShowEraserPanel] = useState(false);
    const [showZoomMenu, setShowZoomMenu] = useState(false);

    // Accordion collapsible sections
    const [sectionColoresOpen, setSectionColoresOpen] = useState(true);
    const [sectionMedidasOpen, setSectionMedidasOpen] = useState(true);
    const [sectionDinamicasOpen, setSectionDinamicasOpen] = useState(false);
    const [sectionFormasOpen, setSectionFormasOpen] = useState(true);

    const [quickColors, setQuickColors] = useState<string[]>(() => {
        const saved = localStorage.getItem('wb_quick_colors');
        return saved ? JSON.parse(saved) : ['#000000', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'];
    });
    const [activeColorPicker, setActiveColorPicker] = useState<{ type: 'palette' | 'stroke' | 'fill'; index?: number } | null>(null);
    const [savedFeedback, setSavedFeedback] = useState(false);

    const [lastGeoTool, setLastGeoTool] = useState<ToolType>('line');
    const isShapeTool = ['line', 'polyline', 'circle', 'arc', 'square', 'rectangle', 'parallelogram'].includes(tool);
    const ActiveMainBrushIcon = isShapeTool
        ? (GEO_TOOLS.find(t => t.id === tool)?.icon || IconBrush)
        : IconBrush;

    const brushTimerRef = useRef<any>(null);
    const eraserTimerRef = useRef<any>(null);
    const brushLongPressedRef = useRef(false);
    const eraserLongPressedRef = useRef(false);

    // Cleanup timer refs on unmount
    useEffect(() => {
        return () => {
            if (brushTimerRef.current) clearTimeout(brushTimerRef.current);
            if (eraserTimerRef.current) clearTimeout(eraserTimerRef.current);
        };
    }, []);

    // Brush pointer interaction handlers
    const handleBrushPointerDown = (e: React.PointerEvent) => {
        brushLongPressedRef.current = false;
        brushTimerRef.current = setTimeout(() => {
            brushLongPressedRef.current = true;
            setShowBrushPanel(true);
            setShowEraserPanel(false);
        }, 500);
    };

    const handleBrushPointerUp = (e: React.PointerEvent) => {
        if (brushTimerRef.current) {
            clearTimeout(brushTimerRef.current);
            brushTimerRef.current = null;
        }
    };

    const handleBrushPointerLeave = (e: React.PointerEvent) => {
        if (brushTimerRef.current) {
            clearTimeout(brushTimerRef.current);
            brushTimerRef.current = null;
        }
    };

    const handleBrushClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (brushLongPressedRef.current) {
            brushLongPressedRef.current = false;
            return;
        }

        if (tool === 'pen' || isShapeTool) {
            // Do not toggle, just keep active
        } else {
            if (drawStyle === 'geometric') {
                setTool(lastGeoTool);
            } else {
                setTool('pen');
            }
        }
        setShowEraserPanel(false);
    };

    const handleBrushDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowBrushPanel(prev => !prev);
        setShowEraserPanel(false);
    };

    // Eraser pointer interaction handlers
    const handleEraserPointerDown = (e: React.PointerEvent) => {
        eraserLongPressedRef.current = false;
        eraserTimerRef.current = setTimeout(() => {
            eraserLongPressedRef.current = true;
            setShowEraserPanel(true);
            setShowBrushPanel(false);
        }, 500);
    };

    const handleEraserPointerUp = (e: React.PointerEvent) => {
        if (eraserTimerRef.current) {
            clearTimeout(eraserTimerRef.current);
            eraserTimerRef.current = null;
        }
    };

    const handleEraserPointerLeave = (e: React.PointerEvent) => {
        if (eraserTimerRef.current) {
            clearTimeout(eraserTimerRef.current);
            eraserTimerRef.current = null;
        }
    };

    const handleEraserClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (eraserLongPressedRef.current) {
            eraserLongPressedRef.current = false;
            return;
        }

        setTool('eraser');
        setShowBrushPanel(false);
    };

    const handleEraserDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowEraserPanel(prev => !prev);
        setShowBrushPanel(false);
    };

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
            setShowBrushPanel(false);
            setActiveColorPicker(null);
            setShowZoomMenu(false);
            setShowEraserPanel(false);
        };
        if (showBrushPanel || activeColorPicker !== null || showZoomMenu || showEraserPanel) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showBrushPanel, activeColorPicker, showZoomMenu, showEraserPanel]);

    const selectGeoTool = (selectedId: string) => {
        setTool(selectedId as ToolType);
        setLastGeoTool(selectedId as ToolType);
    };

    const handleQuickColorClick = (idx: number, color: string) => {
        onSetColor(color);
        onUpdatePreset(activePresetIdx, { color });
        if (tool !== 'pen' && !isShapeTool) {
            setTool('pen');
        }
    };

    const handleQuickColorUpdate = (idx: number, newColor: string) => {
        const newColors = [...quickColors];
        newColors[idx] = newColor;
        setQuickColors(newColors);
        onSetColor(newColor);
        onUpdatePreset(activePresetIdx, { color: newColor });
    };

    const handleSaveToActivePreset = () => {
        if (activePresetIdx !== null && activePresetIdx !== undefined && onUpdatePreset) {
            onUpdatePreset(activePresetIdx, {
                color: currentColor,
                size: currentSize,
                opacity: opacity ?? 1,
                drawStyle: drawStyle,
                options: currentStrokeOptions
            });
            setSavedFeedback(true);
            setTimeout(() => setSavedFeedback(false), 2000);
        }
    };

    const handleExportPresets = () => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(presets, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `pizarra_presets_${Date.now()}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch (error) {
            console.error("Error al exportar presets:", error);
            alert("Error al exportar preajustes");
        }
    };

    const handleImportPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            fileReader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target?.result as string);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        parsed.slice(0, 4).forEach((presetData, idx) => {
                            if (presetData && typeof presetData === 'object') {
                                onUpdatePreset(idx, {
                                    color: presetData.color || '#000000',
                                    size: typeof presetData.size === 'number' ? presetData.size : 5,
                                    opacity: typeof presetData.opacity === 'number' ? presetData.opacity : 1,
                                    drawStyle: presetData.drawStyle || 'ink',
                                    options: presetData.options || {},
                                    label: presetData.label || `Preset ${idx + 1}`
                                });
                            }
                        });
                        alert("Preajustes cargados con éxito");
                    } else {
                        alert("El archivo JSON no tiene un formato de preajustes válido");
                    }
                } catch (error) {
                    console.error("Error al importar presets:", error);
                    alert("Error al importar preajustes: Archivo JSON corrupto");
                }
            };
            fileReader.readAsText(file);
        }
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
        <div className="bg-white/95 dark:bg-gray-900/95 border border-gray-200/80 dark:border-gray-800/80 flex items-center justify-between gap-1.5 px-3 py-2 rounded-2xl pointer-events-auto select-none shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            
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
                            <div className="glass-panel backdrop-blur-xl bg-white/80 dark:bg-black/80 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-xl shadow-xl p-1 z-[130] w-28 flex flex-col gap-0.5 animate-in slide-in-from-bottom-2 duration-150">
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
                    onClick={() => { setTool('move'); setShowBrushPanel(false); setShowEraserPanel(false); }}
                    className={`p-2.5 rounded-xl transition-all hover:scale-105 ${tool === 'move' ? 'bg-primary text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    title="Seleccionar / Mover (V)"
                >
                    <IconSelect className="w-5 h-5" />
                </button>

                {/* BRUSH (PENCIL / MARKER / GEOMETRIC SHAPES) */}
                <div className="relative">
                    <button
                        onPointerDown={handleBrushPointerDown}
                        onPointerUp={handleBrushPointerUp}
                        onPointerLeave={handleBrushPointerLeave}
                        onClick={handleBrushClick}
                        onDoubleClick={handleBrushDoubleClick}
                        className={`p-2.5 rounded-xl transition-all hover:scale-105 flex items-center relative ${tool === 'pen' || isShapeTool ? 'bg-primary text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        title="Ajustes de Pincel y Formas (P) (Doble click o click largo para abrir panel)"
                    >
                        <ActiveMainBrushIcon className="w-5 h-5" />
                        {/* Dot showing current brush color & size scale */}
                        <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-900 shadow-sm" style={{ backgroundColor: currentColor }}></span>
                    </button>
                    {/* Consolidated Brush Popover */}
                    {showBrushPanel && onSizeChange && currentSize !== undefined && currentStrokeOptions && onStrokeOptionsChange && (
                        <div 
                            className="glass-panel backdrop-blur-xl bg-white/70 dark:bg-black/75 absolute bottom-full mb-3 left-1/2 -translate-x-1/2 rounded-2xl shadow-2xl p-4 z-[130] flex flex-col gap-3.5 animate-in slide-in-from-bottom-2 duration-150 cursor-default" 
                            style={{ width: '290px', minWidth: '290px', maxWidth: '290px', maxHeight: '500px' }}
                            onPointerDown={e => e.stopPropagation()} 
                            onClick={e => e.stopPropagation()}
                        >
                            {activeColorPicker ? (
                                <div className="animate-in fade-in zoom-in-95 duration-100 flex flex-col w-full">
                                    <ColorPicker
                                        color={
                                            activeColorPicker.type === 'palette'
                                                ? quickColors[activeColorPicker.index!]
                                                : activeColorPicker.type === 'fill'
                                                ? fillColor
                                                : currentColor
                                        }
                                        onChange={(newVal) => {
                                            if (activeColorPicker.type === 'palette') {
                                                const updatedColors = [...quickColors];
                                                updatedColors[activeColorPicker.index!] = newVal;
                                                setQuickColors(updatedColors);
                                                localStorage.setItem('wb_quick_colors', JSON.stringify(updatedColors));
                                                onSetColor(newVal);
                                            } else if (activeColorPicker.type === 'fill') {
                                                onSetFillColor(newVal);
                                            } else {
                                                onSetColor(newVal);
                                            }
                                        }}
                                        onClose={() => setActiveColorPicker(null)}
                                        label={
                                            activeColorPicker.type === 'palette'
                                                ? `Editar Color ${activeColorPicker.index! + 1}`
                                                : activeColorPicker.type === 'fill'
                                                ? 'Color de Relleno'
                                                : 'Color de Contorno'
                                        }
                                        className="w-full flex flex-col gap-3"
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* Popover Header */}
                                    <div className="flex justify-between items-center pb-1.5 border-b border-gray-150 dark:border-gray-800 flex-shrink-0">
                                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Ajustes de Pincel y Formas</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowBrushPanel(false); }}
                                            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            title="Cerrar"
                                        >
                                            <IconX className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    
                                    {/* Scrollable Contents Container */}
                                    <div className="flex-1 overflow-y-auto max-h-[420px] pr-1.5 custom-scrollbar space-y-3.5 pt-0.5">
                                        {/* Brush Presets Selector - ALWAYS VISIBLE */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">Preajustes Rápidos</span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={handleSaveToActivePreset}
                                                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold shadow-sm transition-all flex items-center gap-0.5 ${savedFeedback ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/95'}`}
                                                        title="Guardar ajustes actuales en el preajuste activo"
                                                    >
                                                        <IconDeviceFloppy className="w-2.5 h-2.5" />
                                                        <span>{savedFeedback ? '¡Guardado!' : 'Guardar'}</span>
                                                    </button>
                                                    <button
                                                        onClick={handleExportPresets}
                                                        className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-850 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-750 rounded text-[8px] font-bold shadow-sm transition-colors flex items-center gap-0.5 border border-gray-200 dark:border-gray-700"
                                                        title="Exportar preajustes a un archivo JSON"
                                                    >
                                                        <IconDownload className="w-2.5 h-2.5" />
                                                        <span>Exportar</span>
                                                    </button>
                                                    <label
                                                        className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-850 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-750 rounded text-[8px] font-bold shadow-sm transition-colors flex items-center gap-0.5 cursor-pointer border border-gray-200 dark:border-gray-700"
                                                        title="Cargar preajustes desde un archivo JSON"
                                                    >
                                                        <IconUpload className="w-2.5 h-2.5" />
                                                        <span>Cargar</span>
                                                        <input type="file" accept=".json" className="hidden" onChange={handleImportPresets} />
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 justify-center">
                                                {presets.map((p, i) => (
                                                    <div key={i} className="relative">
                                                        <button
                                                            onClick={() => onSelectPreset(i)}
                                                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${activePresetIdx === i ? 'ring-2 ring-offset-2 ring-primary scale-105' : 'opacity-85 hover:opacity-100 hover:scale-105'}`}
                                                            style={{ backgroundColor: p.color }}
                                                            title={p.label || `Preset ${i + 1}`}
                                                        >
                                                            <div className="rounded-full bg-white/40 shadow-sm" style={{ width: Math.min(18, Math.max(5, p.size)), height: Math.min(18, Math.max(5, p.size)) }} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Palette Quick Colors for Stroke - ALWAYS VISIBLE */}
                                        <div>
                                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1.5">Paleta de Colores</span>
                                            <div className="flex gap-2 justify-between items-center">
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {quickColors.slice(0, 5).map((c, i) => (
                                                        <div key={i} className="relative">
                                                            <button
                                                                onClick={() => handleQuickColorClick(i, c)}
                                                                onDoubleClick={(e) => { e.stopPropagation(); setActiveColorPicker({ type: 'palette', index: i }); }}
                                                                onContextMenu={(e) => { e.preventDefault(); setActiveColorPicker({ type: 'palette', index: i }); }}
                                                                className={`w-7 h-7 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm transition-transform hover:scale-110 ${currentColor === c ? 'ring-2 ring-primary ring-offset-1 scale-105' : ''}`}
                                                                style={{ backgroundColor: c }}
                                                                title="Seleccionar (Doble clic o click derecho para editar)"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveColorPicker({ type: 'stroke' });
                                                    }}
                                                    className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm hover:scale-110 transition-transform flex-shrink-0 relative overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800"
                                                    title="Selector de Color Personalizado"
                                                    style={{
                                                        background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                                                    }}
                                                >
                                                    <IconDropper className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.8)] filter" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Contorno y Relleno - ALWAYS VISIBLE */}
                                        <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase block mb-1">Estilo de Trazo / Forma</span>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={isStroked}
                                                            onChange={e => onToggleStroke(e.target.checked)}
                                                            className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                                                        />
                                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                                            <IconBorder className="w-3.5 h-3.5" /> Contorno
                                                        </span>
                                                    </label>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveColorPicker({ type: 'stroke' });
                                                        }}
                                                        className="w-7 h-7 rounded-full border border-gray-205 dark:border-gray-600 shadow-sm hover:scale-110 transition-transform relative overflow-hidden animate-none"
                                                        title="Color de Contorno"
                                                    >
                                                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNTAgMEg0VjBIMHoiIGZpbGw9IiNjY2MiLz48L3N2Zz4=')" }}></div>
                                                        <div className="absolute inset-0" style={{ backgroundColor: currentColor }}></div>
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={isFilled}
                                                            onChange={e => onToggleFill(e.target.checked)}
                                                            className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                                                        />
                                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                                            <IconFill className="w-3.5 h-3.5" /> Relleno
                                                        </span>
                                                    </label>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveColorPicker({ type: 'fill' });
                                                        }}
                                                        className="w-7 h-7 rounded-md border border-gray-205 dark:border-gray-600 shadow-sm hover:scale-110 transition-transform relative overflow-hidden animate-none"
                                                        title="Color de Relleno"
                                                    >
                                                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNTAgMEg0VjBIMHoiIGZpbGw9IiNjY2MiLz48L3N2Zz4=')" }}></div>
                                                        <div className="absolute inset-0" style={{ backgroundColor: fillColor }}></div>
                                                    </button>
                                                </div>

                                                {!isStroked && !isFilled && (
                                                    <p className="text-[9px] text-red-500 italic text-center pt-1 font-bold">¡Seleccione al menos uno!</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sliders Area - ALWAYS VISIBLE */}
                                        <div className="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-2.5">
                                            <div>
                                                <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                                    <span>Grosor</span>
                                                    <span className="text-primary font-bold">{currentSize}px</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="100" step="1"
                                                    value={getSliderValue(currentSize)}
                                                    onChange={(e) => onSizeChange(getSizeValue(parseInt(e.target.value)))}
                                                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                                {/* Quick Size Presets */}
                                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                                    {[2, 5, 10, 20, 35].map(sz => (
                                                        <button
                                                            key={sz}
                                                            onClick={() => {
                                                                onSizeChange(sz);
                                                                onUpdatePreset(activePresetIdx, { size: sz });
                                                            }}
                                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${currentSize === sz ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                        >
                                                            {sz}px
                                                        </button>
                                                    ))}
                                                </div>
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
                                                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                    />
                                                    {/* Quick Opacity Presets */}
                                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                                        {[0.1, 0.25, 0.5, 0.75, 1.0].map(op => (
                                                            <button
                                                                key={op}
                                                                onClick={() => {
                                                                    onOpacityChange(op);
                                                                    onUpdatePreset(activePresetIdx, { opacity: op });
                                                                }}
                                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${Math.abs(opacity - op) < 0.01 ? 'bg-primary text-white border-primary' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                            >
                                                                {Math.round(op * 100)}%
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {drawStyle === 'ink' && (
                                                <div className="space-y-2 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                                                    {/* Stylus pressure toggle */}
                                                    <label className="flex items-center gap-2 cursor-pointer p-0.5 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                                                        <input
                                                            type="checkbox"
                                                            checked={currentStrokeOptions.useStylusPressure !== false}
                                                            onChange={e => {
                                                                const checked = e.target.checked;
                                                                onStrokeOptionsChange({ ...currentStrokeOptions, useStylusPressure: checked });
                                                                onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, useStylusPressure: checked } });
                                                            }}
                                                            className="peer h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                        />
                                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Presión Física (Stylus / S-Pen)</span>
                                                    </label>

                                                    {/* Velocity dynamics toggle */}
                                                    <label className="flex items-center gap-2 cursor-pointer p-0.5 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                                                        <input
                                                            type="checkbox"
                                                            checked={currentStrokeOptions.simulatePressure !== false}
                                                            onChange={e => {
                                                                const checked = e.target.checked;
                                                                onStrokeOptionsChange({ ...currentStrokeOptions, simulatePressure: checked });
                                                                onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, simulatePressure: checked } });
                                                            }}
                                                            className="peer h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                        />
                                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Dinámica de Velocidad (Simulada)</span>
                                                    </label>

                                                    {/* Thinning variation slider */}
                                                    {(currentStrokeOptions.simulatePressure !== false || currentStrokeOptions.useStylusPressure !== false) && (
                                                        <div className="space-y-1 pl-5.5 animate-in slide-in-from-top-1 fade-in">
                                                            <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                                                <span>Variación de Grosor (Thinning)</span>
                                                                <span className="text-primary font-bold">{Math.round((currentStrokeOptions.thinning ?? 0.5) * 100)}%</span>
                                                            </div>
                                                            <input
                                                                type="range" min="-1" max="1" step="0.05"
                                                                value={currentStrokeOptions.thinning ?? 0.5}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value);
                                                                    onStrokeOptionsChange({ ...currentStrokeOptions, thinning: val });
                                                                    onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, thinning: val } });
                                                                }}
                                                                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* ACCORDION: TIPO DE TRAZO (formerly Seleccionar Figura, ALWAYS VISIBLE) */}
                                        <div className="border-t border-gray-100 dark:border-gray-855 pt-3">
                                            <button
                                                onClick={() => setSectionFormasOpen(!sectionFormasOpen)}
                                                className="flex items-center justify-between w-full text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-2"
                                            >
                                                <span>Tipo de Trazo</span>
                                                {sectionFormasOpen ? <IconChevronUp className="w-3.5 h-3.5" /> : <IconChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                            {sectionFormasOpen && (
                                                <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                                                    <div className="grid grid-cols-4 gap-1.5">
                                                        {GEO_TOOLS.map((gt) => (
                                                            <button
                                                                key={gt.id}
                                                                onClick={() => {
                                                                    if (gt.id === 'pen') {
                                                                        setDrawStyle('ink');
                                                                        setTool('pen');
                                                                        onUpdatePreset(activePresetIdx, { drawStyle: 'ink' });
                                                                    } else {
                                                                        setDrawStyle('geometric');
                                                                        selectGeoTool(gt.id);
                                                                        onUpdatePreset(activePresetIdx, { drawStyle: 'geometric' });
                                                                    }
                                                                }}
                                                                className={`p-2 rounded-xl flex items-center justify-center transition-all hover:scale-105 ${tool === gt.id ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                                                title={gt.label}
                                                            >
                                                                <gt.icon className="w-4 h-4" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* ACCORDION: DINÁMICAS AVANZADAS */}
                                        <div className="border-t border-gray-100 dark:border-gray-855 pt-3 pb-1">
                                            <button
                                                onClick={() => setSectionDinamicasOpen(!sectionDinamicasOpen)}
                                                className="flex items-center justify-between w-full text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            >
                                                <span>Dinámicas Avanzadas</span>
                                                {sectionDinamicasOpen ? <IconChevronUp className="w-3.5 h-3.5" /> : <IconChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                            {sectionDinamicasOpen && (
                                                <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                                                    <div className="space-y-2">
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
                                                            <div className="space-y-1 p-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl animate-in slide-in-from-top-1 fade-in">
                                                                <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                                                    <span>Textura (Ruido)</span>
                                                                    <span>{(currentStrokeOptions.markerTextureScale ?? 0.1).toFixed(2)}</span>
                                                                </div>
                                                                <input
                                                                    type="range" min="0.01" max="0.5" step="0.01"
                                                                    value={currentStrokeOptions.markerTextureScale ?? 0.1}
                                                                    onChange={e => onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, markerTextureScale: parseFloat(e.target.value) } })}
                                                                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-gray-800">
                                                        <div>
                                                            <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                                                <span>Adelgazamiento / Dinámica</span>
                                                                <span className="text-primary font-bold">{(currentStrokeOptions.thinning ?? 0.5).toFixed(2)}</span>
                                                            </div>
                                                            <input
                                                                type="range" min="-1" max="1" step="0.05"
                                                                value={currentStrokeOptions.thinning ?? 0.5}
                                                                onChange={e => onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, thinning: parseFloat(e.target.value) } })}
                                                                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                            />
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                                                <span>Suavizado</span>
                                                                <span className="text-primary font-bold">{Math.round((currentStrokeOptions.smoothing ?? 0.5) * 100)}%</span>
                                                            </div>
                                                            <input
                                                                type="range" min="0" max="1" step="0.05"
                                                                value={currentStrokeOptions.smoothing ?? 0.5}
                                                                onChange={e => onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, smoothing: parseFloat(e.target.value) } })}
                                                                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                            />
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                                                <span>Estabilización</span>
                                                                <span className="text-primary font-bold">{Math.round((currentStrokeOptions.streamline ?? 0.5) * 100)}%</span>
                                                            </div>
                                                            <input
                                                                type="range" min="0" max="1" step="0.05"
                                                                value={currentStrokeOptions.streamline ?? 0.5}
                                                                onChange={e => onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, streamline: parseFloat(e.target.value) } })}
                                                                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                            />
                                                        </div>

                                                        {drawStyle === 'ink' && (
                                                            <div>
                                                                <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                                                    <span>Sensibilidad Presión</span>
                                                                    <span className="text-primary font-bold">{Math.round((currentStrokeOptions.pressureWeight ?? 0.5) * 100)}%</span>
                                                                </div>
                                                                <input
                                                                    type="range" min="0" max="1" step="0.05"
                                                                    value={currentStrokeOptions.pressureWeight ?? 0.5}
                                                                    onChange={e => onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, pressureWeight: parseFloat(e.target.value) } })}
                                                                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                                />
                                                            </div>
                                                        )}

                                                        {drawStyle === 'ink' && (
                                                            <div>
                                                                <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                                                    <span>Sensibilidad Velocidad</span>
                                                                    <span className="text-primary font-bold">{Math.round((currentStrokeOptions.velocityWeight ?? 0.5) * 100)}%</span>
                                                                </div>
                                                                <input
                                                                    type="range" min="0" max="1" step="0.05"
                                                                    value={currentStrokeOptions.velocityWeight ?? 0.5}
                                                                    onChange={e => onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, velocityWeight: parseFloat(e.target.value) } })}
                                                                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                                />
                                                            </div>
                                                        )}

                                                        <div>
                                                            <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                                                <span>Vibración Línea (Jitter)</span>
                                                                <span className="text-primary font-bold">{currentStrokeOptions.roughness || 0}</span>
                                                            </div>
                                                            <input
                                                                type="range" min="0" max="10" step="1"
                                                                value={currentStrokeOptions.roughness || 0}
                                                                onChange={e => onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, roughness: parseInt(e.target.value) } })}
                                                                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                            />
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                                                <span>Jitter Grosor</span>
                                                                <span className="text-primary font-bold">{(currentStrokeOptions.strokeWidthJitter || 0).toFixed(1)}</span>
                                                            </div>
                                                            <input
                                                                type="range" min="0" max="2" step="0.1"
                                                                value={currentStrokeOptions.strokeWidthJitter || 0}
                                                                onChange={e => onUpdatePreset(activePresetIdx, { options: { ...currentStrokeOptions, strokeWidthJitter: parseFloat(e.target.value) } })}
                                                                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* TEXT BOX */}
                <button
                    onClick={() => { setTool('text'); setShowBrushPanel(false); setShowEraserPanel(false); }}
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
                        onPointerDown={handleEraserPointerDown}
                        onPointerUp={handleEraserPointerUp}
                        onPointerLeave={handleEraserPointerLeave}
                        onClick={handleEraserClick}
                        onDoubleClick={handleEraserDoubleClick}
                        className={`p-2.5 rounded-xl transition-all hover:scale-105 ${tool === 'eraser' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'}`}
                        title="Borrador (E) (Doble click o click largo para abrir panel)"
                    >
                        <IconEraser className="w-5 h-5" />
                    </button>

                    {showEraserPanel && (
                        <div
                            className="glass-panel backdrop-blur-xl bg-white/70 dark:bg-black/75 absolute bottom-full mb-3 left-1/2 -translate-x-1/2 rounded-2xl shadow-2xl p-4 w-60 z-[130] flex flex-col gap-3.5 animate-in slide-in-from-bottom-2 duration-150 cursor-default"
                            style={{ maxHeight: '500px' }}
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Popover Header */}
                            <div className="flex justify-between items-center pb-1.5 border-b border-gray-150 dark:border-gray-800 flex-shrink-0">
                                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Ajustes de Borrador</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowEraserPanel(false); }}
                                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    title="Cerrar"
                                >
                                    <IconX className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Scrollable Contents Container */}
                            <div className="flex-1 overflow-y-auto max-h-[420px] pr-1.5 custom-scrollbar space-y-3.5 pt-0.5">
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
});
