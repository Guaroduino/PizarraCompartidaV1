
// File: src/components/whiteboard/ui/WhiteboardToolbar.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    IconPencil, IconTrash, IconLasso, IconSparkles, IconPaperclip,
    IconSettings, IconLayers, IconSwitchLocation, IconX, IconScribble, IconSliders,
    IconSquare, IconRectangle, IconParallelogram, IconFill, IconBorder, IconDropper
} from '../../Icons';
import type { ToolPreset, ToolType, DrawStyle, ExtendedStrokeOptions, ShapeStyle } from '../../../types/whiteboardTypes';
import { ColorPicker, ColorPickerButton } from '../../ColorPicker';

// Simple Icons for shapes (Inline SVGs)
const IconLine = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="5" y1="19" x2="19" y2="5" /></svg>;
const IconPolyline = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="5 19 10 9 15 15 19 5" /></svg>;
const IconCircle = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="9" /></svg>;
const IconArc = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 19c0-8 7-14 14-14" /></svg>;

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
    toolbarPosition: 'default' | 'bottom-right';
    setToolbarPosition: (pos: 'default' | 'bottom-right') => void;
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
}

// Editor de presets flotante
const PresetEditor: React.FC<{
    preset: ToolPreset;
    onUpdate: (updates: Partial<ToolPreset>) => void;
    onClose: () => void;
    popoverDirection: 'up' | 'down';
}> = ({ preset, onUpdate, onClose, popoverDirection }) => {
    const posClasses = popoverDirection === 'down'
        ? 'top-full mt-3 animate-in slide-in-from-top-2'
        : 'bottom-full mb-3 animate-in slide-in-from-bottom-2';

    return (
        <div
            className={`absolute ${posClasses} left-1/2 -translate-x-1/2 w-80 bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-4 border border-gray-200 dark:border-gray-700 z-[110] cursor-default flex flex-col max-h-[70vh]`}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-dark-card z-10 flex-shrink-0">
                <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Ajustes de Herramienta</span>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><IconX className="w-4 h-4" /></button>
            </div>

            <div className="space-y-5 overflow-y-auto pr-1">
                {/* Color Section */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Color Principal</label>
                        <ColorPickerButton
                            color={preset.color}
                            onChange={(c) => onUpdate({ color: c })}
                            className="w-6 h-6 rounded-full"
                            position="top"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap justify-between">
                        {['#000000', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'].map(c => (
                            <button
                                key={c}
                                onClick={() => onUpdate({ color: c })}
                                className={`w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 ${preset.color === c ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {/* Main Sliders */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Grosor</span>
                            <span className="text-xs font-bold text-primary">{preset.size}px</span>
                        </div>
                        <input
                            type="range" min="0" max="100" step="1"
                            value={getSliderValue(preset.size)}
                            onChange={e => onUpdate({ size: getSizeValue(parseInt(e.target.value)) })}
                            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Opacidad</span>
                            <span className="text-xs font-bold text-primary">{Math.round(preset.opacity * 100)}%</span>
                        </div>
                        <input
                            type="range" min="0.1" max="1" step="0.05"
                            value={preset.opacity}
                            onChange={e => onUpdate({ opacity: parseFloat(e.target.value) })}
                            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                </div>

                {/* Advanced Stroke Options & FX */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-4">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Efectos & Dinámica</p>

                    {/* Natural Marker Filter Toggle */}
                    <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded-lg transition-colors">
                            <input
                                type="checkbox"
                                checked={preset.options.isNaturalMarker || false}
                                onChange={e => onUpdate({ options: { ...preset.options, isNaturalMarker: e.target.checked } })}
                                className="peer h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">Efecto Rotulador</span>
                        </label>
                    </div>

                    {/* Marker Texture Scale (Visible Only if Natural Marker is ON) */}
                    {preset.options.isNaturalMarker && (
                        <div className="space-y-1 animate-in slide-in-from-top-2 fade-in">
                            <div className="flex justify-between">
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Textura (Ruido)</span>
                                <span className="text-xs font-bold text-primary">{(preset.options.markerTextureScale ?? 0.1).toFixed(2)}</span>
                            </div>
                            <input
                                type="range" min="0.01" max="0.5" step="0.01"
                                value={preset.options.markerTextureScale ?? 0.1}
                                onChange={e => onUpdate({ options: { ...preset.options, markerTextureScale: parseFloat(e.target.value) } })}
                                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    )}

                    {/* Simulate Pressure */}
                    <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded-lg transition-colors">
                            <input
                                type="checkbox"
                                checked={preset.options.simulatePressure ?? true}
                                onChange={e => onUpdate({ options: { ...preset.options, simulatePressure: e.target.checked } })}
                                className="peer h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">Simular Presión (Mouse)</span>
                        </label>
                    </div>

                    {/* Roughness (Jitter de posición) */}
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Vibración Línea</span>
                            <span className="text-xs font-bold text-primary">{preset.options.roughness || 0}</span>
                        </div>
                        <input
                            type="range" min="0" max="10" step="1"
                            value={preset.options.roughness || 0}
                            onChange={e => onUpdate({ options: { ...preset.options, roughness: parseInt(e.target.value) } })}
                            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>

                    {/* Width Jitter (Variación de Grosor) */}
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Jitter Grosor</span>
                            <span className="text-xs font-bold text-primary">{(preset.options.strokeWidthJitter || 0).toFixed(1)}</span>
                        </div>
                        <input
                            type="range" min="0" max="2" step="0.1"
                            value={preset.options.strokeWidthJitter || 0}
                            onChange={e => onUpdate({ options: { ...preset.options, strokeWidthJitter: parseFloat(e.target.value) } })}
                            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = (props) => {
    const {
        tool, setTool, activePresetIdx, presets, onSelectPreset, onUpdatePreset,
        stylusOnly, setStylusOnly, showLayers, setShowLayers,
        toolbarPosition, setToolbarPosition, onImageUpload,
        currentColor, onSetColor,
        fillColor, onSetFillColor, isFilled, onToggleFill, isStroked, onToggleStroke,
        currentSize, onSizeChange, currentStrokeOptions, onStrokeOptionsChange, opacity, onOpacityChange
    } = props;

    const [editingPresetIdx, setEditingPresetIdx] = useState<number | null>(null);
    const [quickColors, setQuickColors] = useState<string[]>(() => {
        const saved = localStorage.getItem('wb_quick_colors');
        return saved ? JSON.parse(saved) : ['#000000', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6'];
    });

    const [showQuickSettings, setShowQuickSettings] = useState(false);
    const [editingQuickColorIdx, setEditingQuickColorIdx] = useState<number | null>(null);
    const [lastGeoTool, setLastGeoTool] = useState<ToolType>('pen');
    const [showGeoMenu, setShowGeoMenu] = useState(false);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    const isShapeTool = ['line', 'polyline', 'circle', 'arc', 'square', 'rectangle', 'parallelogram'].includes(tool);

    useEffect(() => {
        localStorage.setItem('wb_quick_colors', JSON.stringify(quickColors));
    }, [quickColors]);

    useEffect(() => {
        if (isShapeTool || tool === 'pen') {
            setLastGeoTool(tool);
        }
    }, [tool, isShapeTool]);

    const handlePresetClick = (idx: number) => {
        if (activePresetIdx === idx && (tool === 'pen' || tool === 'eraser')) {
            setEditingPresetIdx(editingPresetIdx === idx ? null : idx);
        } else {
            onSelectPreset(idx);
            setEditingPresetIdx(null);
        }
    };

    const handleQuickColorUpdate = (idx: number, newColor: string) => {
        const newColors = [...quickColors];
        newColors[idx] = newColor;
        setQuickColors(newColors);
        onSetColor(newColor);
    };

    const handleQuickColorInteraction = (idx: number, color: string) => {
        if (currentColor === color && tool === 'pen') {
            setEditingQuickColorIdx(editingQuickColorIdx === idx ? null : idx);
        } else {
            onSetColor(color);
            if (!isShapeTool) setTool('pen');
        }
    };

    const selectGeoTool = (selectedId: string) => {
        setTool(selectedId as ToolType);
        setLastGeoTool(selectedId as ToolType);
        setShowGeoMenu(false);
    };

    useEffect(() => {
        const handleClickOutside = () => {
            setShowGeoMenu(false);
            setEditingPresetIdx(null);
            setShowQuickSettings(false);
            setEditingQuickColorIdx(null);
        };
        if (showGeoMenu || editingPresetIdx !== null || showQuickSettings || editingQuickColorIdx !== null) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showGeoMenu, editingPresetIdx, showQuickSettings, editingQuickColorIdx]);

    const ActiveGeoIcon = GEO_TOOLS.find(t => t.id === lastGeoTool)?.icon || IconScribble;

    return (
        <div className="flex bg-white/90 dark:bg-black/80 backdrop-blur-xl rounded-2xl p-1.5 shadow-2xl border border-white/20 items-center pointer-events-auto" onClick={(e) => e.stopPropagation()}>

            {/* 1. SELECTION GROUP */}
            <div className="flex gap-1">
                <button onClick={() => setTool('move')} className={`p-2 rounded-lg transition-all ${tool === 'move' ? 'bg-white dark:bg-gray-600 text-primary shadow-sm' : 'text-gray-500 hover:text-primary'}`} title="Mover (V)">
                    <IconSparkles className="w-5 h-5" />
                </button>
                <button onClick={() => setTool('lasso')} className={`p-2 rounded-lg transition-all ${tool === 'lasso' ? 'bg-white dark:bg-gray-600 text-primary shadow-sm' : 'text-gray-500 hover:text-primary'}`} title="Lazo de Selección (L)">
                    <IconLasso className="w-5 h-5" />
                </button>
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2" />

            {/* 2. CREATION GROUP */}
            <div className="flex items-center gap-2">
                {/* 2.1 Presets */}
                <div className="flex items-center gap-2 relative animate-in slide-in-from-left-2 fade-in duration-300">
                    {presets.map((p, i) => (
                        <div key={i} className="relative">
                            <button
                                onClick={() => handlePresetClick(i)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all relative ${activePresetIdx === i && tool === 'pen' ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                                style={{ backgroundColor: p.color }}
                                title={`${p.label || `Herramienta ${i + 1}`}`}
                            >
                                <div className="rounded-full bg-white/40 backdrop-blur-sm shadow-sm" style={{ width: Math.min(20, Math.max(6, p.size)), height: Math.min(20, Math.max(6, p.size)) }} />
                                {activePresetIdx === i && tool === 'pen' && (
                                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm border border-gray-200">
                                        <IconSettings className="w-2.5 h-2.5 text-gray-500" />
                                    </div>
                                )}
                            </button>
                            {editingPresetIdx === i && <PresetEditor preset={p} onUpdate={(updates) => onUpdatePreset(i, updates)} onClose={() => setEditingPresetIdx(null)} popoverDirection={toolbarPosition === 'default' ? 'down' : 'up'} />}
                        </div>
                    ))}
                </div>

                {/* 2.2 Quick Settings (Sliders & Toggles) */}
                <div className="relative">
                    <button onClick={() => setShowQuickSettings(!showQuickSettings)} className={`p-2 rounded-lg transition-colors ${showQuickSettings ? 'bg-primary text-white' : 'text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700'}`} title="Ajustes Rápidos">
                        <IconSliders className="w-5 h-5" />
                    </button>

                    {showQuickSettings && onSizeChange && onStrokeOptionsChange && currentSize !== undefined && currentStrokeOptions && (
                        <div className={`absolute ${toolbarPosition === 'default' ? 'top-full mt-3' : 'bottom-full mb-3'} left-1/2 -translate-x-1/2 bg-white dark:bg-dark-card rounded-xl shadow-xl p-3 border border-gray-200 dark:border-gray-700 z-[120] w-64 animate-in zoom-in-95`} onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                            <div className="space-y-4">
                                {/* Preview Área */}
                                <div className="w-full h-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden relative">
                                    <svg className="w-full h-full pointer-events-none" viewBox="0 0 100 40" preserveAspectRatio="xMidYMid slice">
                                        <defs>
                                            <filter id="preview-marker-texture" x="-20%" y="-20%" width="140%" height="140%">
                                                <feTurbulence type="fractalNoise" baseFrequency={currentStrokeOptions.markerTextureScale ?? 0.1} numOctaves="3" result="noise" />
                                                <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" in="noise" result="alphaNoise" />
                                                <feComponentTransfer in="alphaNoise" result="adjustedNoise">
                                                    <feFuncA type="linear" slope="1.5" intercept="-0.1" />
                                                </feComponentTransfer>
                                                <feComposite operator="in" in="SourceGraphic" in2="adjustedNoise" />
                                            </filter>
                                        </defs>
                                        <g
                                            opacity={onOpacityChange && tool === 'pen' && currentStrokeOptions?.isNaturalMarker ? opacity : 1}
                                            style={tool === 'pen' && currentStrokeOptions?.isNaturalMarker ? { filter: 'url(#preview-marker-texture)', mixBlendMode: 'multiply' } : {}}
                                        >
                                            <path
                                                d="M 10 20 Q 30 10 50 20 T 90 20"
                                                fill="none"
                                                stroke={currentColor}
                                                strokeWidth={Math.max(2, Math.min(20, currentSize))}
                                                strokeLinecap="round"
                                            />
                                        </g>
                                    </svg>
                                </div>
                                {/* Size */}
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Grosor</span>
                                        <span className="text-xs font-bold text-primary">{currentSize}px</span>
                                    </div>
                                    <input type="range" min="0" max="100" step="1" value={getSliderValue(currentSize)} onChange={(e) => onSizeChange(getSizeValue(parseInt(e.target.value)))} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary" />
                                </div>

                                {/* Marker Specific Settings via Toggle */}
                                {tool === 'pen' && (
                                    <>
                                        <div className="pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded-lg transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={currentStrokeOptions.isNaturalMarker || false}
                                                    onChange={e => onStrokeOptionsChange({ ...currentStrokeOptions, isNaturalMarker: e.target.checked })}
                                                    className="peer h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                />
                                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">Efecto Rotulador</span>
                                            </label>
                                        </div>

                                        {currentStrokeOptions.isNaturalMarker && (
                                            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2 animate-in slide-in-from-top-2 fade-in">
                                                {/* Opacity */}
                                                {onOpacityChange && opacity !== undefined && (
                                                    <div>
                                                        <div className="flex justify-between mb-1">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Opacidad</span>
                                                            <span className="text-xs font-bold text-primary">{Math.round(opacity * 100)}%</span>
                                                        </div>
                                                        <input type="range" min="0" max="1" step="0.05" value={opacity} onChange={(e) => onOpacityChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary" />
                                                    </div>
                                                )}
                                                {/* Texture Scale */}
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Textura (Ruido)</span>
                                                        <span className="text-xs font-bold text-primary">{(currentStrokeOptions.markerTextureScale ?? 0.1).toFixed(2)}</span>
                                                    </div>
                                                    <input type="range" min="0.01" max="0.5" step="0.01" value={currentStrokeOptions.markerTextureScale ?? 0.1} onChange={(e) => onStrokeOptionsChange({ ...currentStrokeOptions, markerTextureScale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary" />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Advanced Settings Toggle */}
                                <div className="pt-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowAdvancedSettings(!showAdvancedSettings); }}
                                        className="w-full py-1.5 text-[10px] font-bold text-gray-500 hover:text-primary transition-colors uppercase tracking-wider bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                    >
                                        {showAdvancedSettings ? 'Ocultar Avanzado' : 'Opciones Avanzadas...'}
                                    </button>
                                </div>

                                {showAdvancedSettings && (
                                    <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2 animate-in slide-in-from-top-2 fade-in">
                                        {/* Roughness (Stroke Jitter Position) */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">Vibración Línea</span>
                                                <span className="text-xs font-bold text-primary">{currentStrokeOptions.roughness || 0}</span>
                                            </div>
                                            <input type="range" min="0" max="10" step="1" value={currentStrokeOptions.roughness || 0} onChange={(e) => onStrokeOptionsChange({ ...currentStrokeOptions, roughness: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary" />
                                        </div>

                                        {/* Width Jitter (Variable Thickness) */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">Jitter Grosor</span>
                                                <span className="text-xs font-bold text-primary">{(currentStrokeOptions.strokeWidthJitter || 0).toFixed(1)}</span>
                                            </div>
                                            <input type="range" min="0" max="2" step="0.1" value={currentStrokeOptions.strokeWidthJitter || 0} onChange={(e) => onStrokeOptionsChange({ ...currentStrokeOptions, strokeWidthJitter: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary" />
                                        </div>

                                        {/* Fill Roughness (Fill Offset/Jitter) */}
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">Desfase Relleno</span>
                                                <span className="text-xs font-bold text-primary">{currentStrokeOptions.fillRoughness || 0}</span>
                                            </div>
                                            <input type="range" min="0" max="20" step="1" value={currentStrokeOptions.fillRoughness || 0} onChange={(e) => onStrokeOptionsChange({ ...currentStrokeOptions, fillRoughness: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary" />
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-gray-100 dark:border-gray-700"></div>

                                {/* Shape Style Toggles */}
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Estilo de Forma</span>

                                    {/* Stroke Row */}
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={isStroked} onChange={e => onToggleStroke(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                            <span className="text-xs font-medium dark:text-gray-300 flex items-center gap-1"><IconBorder className="w-3 h-3" /> Contorno</span>
                                        </label>
                                        <ColorPickerButton color={currentColor} onChange={onSetColor} className="w-5 h-5 rounded-full border border-gray-300" position="top" />
                                    </div>

                                    {/* Fill Row */}
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={isFilled} onChange={e => onToggleFill(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                                            <span className="text-xs font-medium dark:text-gray-300 flex items-center gap-1"><IconFill className="w-3 h-3" /> Relleno</span>
                                        </label>
                                        <ColorPickerButton color={fillColor} onChange={onSetFillColor} className="w-5 h-5 rounded-md border border-gray-300" position="top" />
                                    </div>
                                    {!isStroked && !isFilled && <p className="text-[9px] text-red-500 italic text-center pt-1">¡Selecciona al menos uno!</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2.3 Geometric Shapes */}
                <div className="relative flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowGeoMenu(!showGeoMenu); }}
                        className={`p-2 rounded-lg transition-all relative group ${isShapeTool ? 'bg-white dark:bg-gray-600 text-primary shadow-sm' : 'text-gray-500 hover:text-primary'}`}
                        title="Formas"
                    >
                        <ActiveGeoIcon className="w-5 h-5" />
                        <div className="absolute bottom-1 right-1 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[3px] border-t-current opacity-60"></div>
                    </button>

                    {showGeoMenu && (
                        <div className={`absolute ${toolbarPosition === 'default' ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-1.5 flex flex-col gap-1 z-[120] min-w-[40px] animate-in zoom-in-95`}>
                            {GEO_TOOLS.slice(1).map((gt) => (
                                <button key={gt.id} onClick={() => selectGeoTool(gt.id)} className={`p-2 rounded-lg transition-colors flex items-center justify-center ${tool === gt.id ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`} title={gt.label}>
                                    <gt.icon className="w-5 h-5" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button onClick={() => setTool('eraser')} className={`p-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-red-100 dark:bg-red-900/30 text-red-500 shadow-inner' : 'text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'}`} title="Borrador (E)">
                    <IconTrash className="w-5 h-5" />
                </button>
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2" />

            {/* 3. ATTRIBUTES GROUP (Quick Colors for STROKE) */}
            <div className="flex items-center gap-1.5 px-1">
                {quickColors.map((c, i) => (
                    <div key={i} className="relative group">
                        <button
                            onClick={() => handleQuickColorInteraction(i, c)}
                            onContextMenu={(e) => { e.preventDefault(); setEditingQuickColorIdx(i); }}
                            className={`w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm transition-transform hover:scale-110 ${currentColor === c && (tool === 'pen' || isShapeTool) ? 'ring-2 ring-primary ring-offset-1 scale-110' : ''}`}
                            style={{ backgroundColor: c }}
                            title="Color de Contorno"
                        />
                        {editingQuickColorIdx === i && (
                            <div className={`absolute ${toolbarPosition === 'default' ? 'top-full mt-3' : 'bottom-full mb-3'} left-1/2 -translate-x-1/2 z-[200]`}>
                                <ColorPicker color={c} onChange={(newVal) => handleQuickColorUpdate(i, newVal)} onClose={() => setEditingQuickColorIdx(null)} label={`Color ${i + 1}`} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2" />

            {/* 4. REST OF BUTTONS */}
            <div className="flex gap-1">
                <button onClick={() => setTool('text')} className={`p-2 rounded-lg transition-all ${tool === 'text' ? 'bg-white dark:bg-gray-600 text-primary shadow-sm' : 'text-gray-500 hover:text-primary'}`} title="Cuadro de Texto (T)">
                    <span className="w-5 h-5 flex items-center justify-center font-black text-lg font-serif">T</span>
                </button>
                <label className="p-2 text-gray-500 hover:text-primary cursor-pointer rounded-lg transition-all hover:bg-white dark:hover:bg-gray-600" title="Insertar Imagen">
                    <IconPaperclip className="w-5 h-5" />
                    <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
                </label>
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2" />

            <div className="flex gap-1">
                <button onClick={() => setStylusOnly(!stylusOnly)} className={`p-2 rounded-lg transition-all ${stylusOnly ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600'}`} title={stylusOnly ? "Modo Stylus Activo" : "Modo Táctil"}>
                    <IconPencil className="w-4 h-4" />
                </button>
                <button onClick={() => setShowLayers(!showLayers)} className={`p-2 rounded-lg transition-all ${showLayers ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600'}`} title="Capas">
                    <IconLayers className="w-5 h-5" />
                </button>
                <button onClick={() => setToolbarPosition(toolbarPosition === 'default' ? 'bottom-right' : 'default')} className={`p-2 rounded-lg text-gray-400 hover:text-gray-600`} title="Mover Barra">
                    <IconSwitchLocation className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
