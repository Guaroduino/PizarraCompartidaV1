
// File: src/components/whiteboard/ui/TextToolbar.tsx
import React, { useState } from 'react';
import type { ExtendedWhiteboardText } from '../../../types/whiteboardTypes';
import type { WhiteboardLayer } from '../../../types';
import { 
    IconAlignLeft, IconAlignCenter, IconAlignRight, 
    IconAlignTop, IconAlignMiddle, IconAlignBottom,
    IconRemoveBackgroundColor, IconLayers, IconClipboardCopy, IconTrash, 
    IconBorder, IconMinus, IconPlus
} from '../../Icons';
import { ColorPickerButton } from '../../ColorPicker';

interface TextToolbarProps {
    text: ExtendedWhiteboardText;
    layers: WhiteboardLayer[];
    onUpdate: (updates: Partial<ExtendedWhiteboardText>) => void;
    onCopy: () => void;
    onCut: () => void;
    onDelete: () => void;
    onMoveToLayer: (layerId: string) => void;
    isOverlay?: boolean; // Nuevo prop para saber si estamos en el editor flotante
}

export const TextToolbar: React.FC<TextToolbarProps> = ({ 
    text, layers, onUpdate, 
    onCopy, onCut, onDelete, onMoveToLayer, isOverlay = false 
}) => {
    const [showLayerSelector, setShowLayerSelector] = useState(false);

    const toggleBorderStyle = () => {
        const styles: ('solid' | 'dashed' | 'dotted')[] = ['solid', 'dashed', 'dotted'];
        const currentIdx = styles.indexOf(text.borderStyle || 'solid');
        const nextStyle = styles[(currentIdx + 1) % styles.length];
        onUpdate({ borderStyle: nextStyle });
    };

    const handleExecCommand = (command: string) => {
        document.execCommand(command, false);
        // También actualizamos el estado para persistencia básica
        if (command === 'bold') onUpdate({ fontWeight: text.fontWeight === 'bold' ? 'normal' : 'bold' });
        if (command === 'italic') onUpdate({ fontStyle: text.fontStyle === 'italic' ? 'normal' : 'italic' });
        if (command === 'underline') onUpdate({ textDecoration: text.textDecoration === 'underline' ? 'none' : 'underline' });
    };

    const fontOptions: { value: string, label: string }[] = [
        { value: 'sans', label: 'Sans' },
        { value: 'serif', label: 'Serif' },
        { value: 'mono', label: 'Mono' },
        { value: 'hand', label: 'Mano' },
        { value: 'display', label: 'Display' },
        { value: 'code', label: 'Código' }, 
        { value: 'roboto', label: 'Roboto' },
        { value: 'oswald', label: 'Oswald' },
        { value: 'playfair', label: 'Playfair' },
        { value: 'montserrat', label: 'Montserrat' },
        { value: 'pacifico', label: 'Pacifico' },
        { value: 'dancing', label: 'Dancing' },
        { value: 'lobster', label: 'Lobster' },
    ];

    return (
        <div 
            className={`flex flex-col items-start bg-white dark:bg-dark-card p-2 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-[120] ${isOverlay ? 'mb-2' : 'absolute -top-28 left-0'}`}
            onPointerDown={e => {
                e.stopPropagation(); 
                // Permitir foco en inputs dentro de la toolbar, prevenir blur en el editor de texto
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') {
                    e.preventDefault();
                }
            }}
        >
            
            {/* Row 1: Formatting & Font */}
            <div className="flex items-center gap-2 mb-2 w-full justify-between">
                {/* Font Family */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex">
                    <select 
                        value={text.fontFamily || 'sans'} 
                        onChange={(e) => onUpdate({ fontFamily: e.target.value as any })}
                        className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer w-24"
                    >
                        {fontOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>

                {/* Size Controls */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button onClick={() => onUpdate({ fontSize: Math.max(8, (text.fontSize || 16) - 2) })} className="p-1 hover:text-primary"><IconMinus className="w-3 h-3"/></button>
                    <input 
                        type="number" 
                        value={text.fontSize || 16} 
                        onChange={e => onUpdate({ fontSize: parseInt(e.target.value) })} 
                        className="w-10 text-xs font-bold bg-transparent text-center focus:outline-none"
                        title="Tamaño"
                    />
                    <button onClick={() => onUpdate({ fontSize: Math.min(200, (text.fontSize || 16) + 2) })} className="p-1 hover:text-primary"><IconPlus className="w-3 h-3"/></button>
                </div>

                {/* Style Buttons (B / I / U) */}
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
                    <button onClick={() => handleExecCommand('bold')} className={`w-6 h-6 flex items-center justify-center font-bold hover:bg-white dark:hover:bg-gray-700 rounded text-xs ${text.fontWeight === 'bold' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>B</button>
                    <button onClick={() => handleExecCommand('italic')} className={`w-6 h-6 flex items-center justify-center italic hover:bg-white dark:hover:bg-gray-700 rounded text-xs font-serif ${text.fontStyle === 'italic' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>I</button>
                    <button onClick={() => handleExecCommand('underline')} className={`w-6 h-6 flex items-center justify-center underline hover:bg-white dark:hover:bg-gray-700 rounded text-xs ${text.textDecoration === 'underline' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>U</button>
                </div>
            </div>

            <div className="h-px w-full bg-gray-200 dark:bg-gray-700 mb-2"></div>

            {/* Row 2: Colors, Alignment & Actions */}
            <div className="flex items-center gap-3">
                
                {/* Colors */}
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                        <ColorPickerButton 
                            color={text.color || '#000000'}
                            onChange={(c) => onUpdate({ color: c })}
                            className="w-6 h-6 rounded-full border border-gray-300"
                            position="top"
                        />
                    </div>
                    <div className="flex flex-col items-center relative">
                        <ColorPickerButton 
                            color={text.backgroundColor && text.backgroundColor !== 'transparent' ? text.backgroundColor : '#ffffff'}
                            onChange={(c) => onUpdate({ backgroundColor: c })}
                            className="w-6 h-6 rounded-md border border-gray-300"
                            position="top"
                            opacity={text.backgroundColor === 'transparent' ? 0 : 1}
                        />
                        {text.backgroundColor === 'transparent' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-red-500 font-bold text-xs">\</div>}
                    </div>
                    <div className="flex flex-col items-center relative">
                        <ColorPickerButton 
                            color={text.borderColor && text.borderColor !== 'transparent' ? text.borderColor : '#000000'}
                            onChange={(c) => onUpdate({ borderColor: c })}
                            className="w-6 h-6 rounded-md border-2 border-gray-400"
                            position="top"
                            opacity={text.borderColor === 'transparent' ? 0 : 1}
                        />
                         {text.borderColor === 'transparent' && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-red-500 font-bold text-xs">\</div>}
                    </div>
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

                {/* Border Style */}
                <div className="flex gap-1">
                    <button 
                        onClick={toggleBorderStyle}
                        className="w-6 h-6 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center justify-center"
                        title="Estilo de Borde"
                    >
                        <IconBorder className="w-4 h-4 text-gray-500"/>
                    </button>
                    <button 
                        onClick={() => onUpdate({ borderColor: 'transparent' })} 
                        className="w-6 h-6 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center justify-center text-red-500" 
                        title="Sin Borde"
                    >
                        <IconRemoveBackgroundColor className="w-4 h-4" />
                    </button>
                </div>

                {/* Alignment Group (Horizontal + Vertical) */}
                <div className="flex flex-col gap-1">
                    {/* Horizontal Alignment */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                        <button onClick={() => onUpdate({ textAlign: 'left' })} className={`p-1 rounded ${text.textAlign === 'left' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400'}`}>
                            <IconAlignLeft className="w-3 h-3"/>
                        </button>
                        <button onClick={() => onUpdate({ textAlign: 'center' })} className={`p-1 rounded ${text.textAlign === 'center' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400'}`}>
                            <IconAlignCenter className="w-3 h-3"/>
                        </button>
                        <button onClick={() => onUpdate({ textAlign: 'right' })} className={`p-1 rounded ${text.textAlign === 'right' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400'}`}>
                            <IconAlignRight className="w-3 h-3"/>
                        </button>
                    </div>
                    {/* Vertical Alignment */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                        <button onClick={() => onUpdate({ verticalAlign: 'top' })} className={`p-1 rounded ${(!text.verticalAlign || text.verticalAlign === 'top') ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400'}`} title="Arriba">
                            <IconAlignTop className="w-3 h-3"/>
                        </button>
                        <button onClick={() => onUpdate({ verticalAlign: 'middle' })} className={`p-1 rounded ${text.verticalAlign === 'middle' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400'}`} title="Centro">
                            <IconAlignMiddle className="w-3 h-3"/>
                        </button>
                        <button onClick={() => onUpdate({ verticalAlign: 'bottom' })} className={`p-1 rounded ${text.verticalAlign === 'bottom' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400'}`} title="Abajo">
                            <IconAlignBottom className="w-3 h-3"/>
                        </button>
                    </div>
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

                {/* Management Actions */}
                <div className="flex items-center gap-1">
                    <div className="relative">
                        <button 
                            onClick={() => setShowLayerSelector(!showLayerSelector)} 
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-primary" 
                            title="Mover a Capa"
                        >
                            <IconLayers className="w-4 h-4"/>
                        </button>
                        {showLayerSelector && (
                            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-dark-card border dark:border-gray-700 rounded-xl shadow-xl w-40 z-50 p-1 overflow-hidden">
                                {layers.map(l => (
                                    <button 
                                        key={l.id} 
                                        onClick={() => { onMoveToLayer(l.id); setShowLayerSelector(false); }}
                                        className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 rounded truncate block text-gray-700 dark:text-gray-300"
                                    >
                                        {l.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Toggle: permitir copia (visible para profesores que usan el editor) */}
                    <button
                        onClick={() => onUpdate({ allowCopy: !(text.allowCopy ?? true) })}
                        className={`p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ${text.allowCopy === false ? 'text-gray-400' : 'text-green-500'}`}
                        title={text.allowCopy === false ? 'Copiar deshabilitado' : 'Permitir copiar'}
                    >
                        <IconClipboardCopy className="w-4 h-4"/>
                    </button>

                    <button onClick={onCopy} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-blue-500" title="Copiar"><IconClipboardCopy className="w-4 h-4"/></button>
                    <button onClick={onDelete} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500" title="Eliminar"><IconTrash className="w-4 h-4"/></button>
                    
                    {/* Clear Format Helpers */}
                    <button onClick={() => onUpdate({ backgroundColor: 'transparent' })} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400" title="Sin Fondo"><IconRemoveBackgroundColor className="w-4 h-4"/></button>
                </div>
            </div>
        </div>
    );
};
