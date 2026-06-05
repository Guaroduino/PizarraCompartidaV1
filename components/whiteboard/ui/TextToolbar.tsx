// File: src/components/whiteboard/ui/TextToolbar.tsx
import React, { useState } from 'react';
import type { ExtendedWhiteboardText } from '../../../types/whiteboardTypes';
import type { WhiteboardLayer } from '../../../types';
import { 
    IconAlignLeft, IconAlignCenter, IconAlignRight, 
    IconAlignTop, IconAlignMiddle, IconAlignBottom,
    IconLayers, IconClipboardCopy, IconTrash, 
    IconMinus, IconPlus
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
            className={`glass-panel flex flex-col items-start p-2.5 rounded-2xl shadow-2xl z-[120] ${isOverlay ? 'mb-2' : 'absolute -top-36 left-0'}`}
            onPointerDown={e => {
                e.stopPropagation(); 
                // Permitir foco en inputs dentro de la toolbar, prevenir blur en el editor de texto
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') {
                    e.preventDefault();
                }
            }}
        >
            
            {/* Row 0: Text Mode Selector */}
            <div className="flex items-center gap-2 mb-2 w-full justify-between bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button 
                  onClick={() => onUpdate({ textMode: 'single' })}
                  className={`flex-1 flex justify-center py-1 text-xs font-bold rounded ${text.textMode === 'single' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Línea
                </button>
                <button 
                  onClick={() => onUpdate({ textMode: 'multi' })}
                  className={`flex-1 flex justify-center py-1 text-xs font-bold rounded ${(!text.textMode || text.textMode === 'multi') ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Párrafo
                </button>
                <button 
                  onClick={() => onUpdate({ textMode: 'code' })}
                  className={`flex-1 flex justify-center py-1 text-xs font-bold rounded ${text.textMode === 'code' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Código
                </button>
            </div>

            {/* Row 1: Formatting & Font / Language */}
            <div className="flex items-center gap-2 mb-2 w-full justify-between">
                {text.textMode === 'code' ? (
                    <div className="flex gap-2 w-full">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex w-full">
                            <select
                                value={text.language || 'javascript'}
                                onChange={(e) => onUpdate({ language: e.target.value })}
                                className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer w-full max-w-[80px]"
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="typescript">TypeScript</option>
                                <option value="python">Python</option>
                                <option value="html">HTML</option>
                                <option value="css">CSS</option>
                                <option value="json">JSON</option>
                                <option value="java">Java</option>
                                <option value="csharp">C#</option>
                                <option value="cpp">C++ / Arduino</option>
                                <option value="php">PHP</option>
                                <option value="ruby">Ruby</option>
                                <option value="sql">SQL</option>
                                <option value="markdown">Markdown</option>
                            </select>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex">
                            <select
                                value={text.codeTheme || 'vs-dark'}
                                onChange={(e) => onUpdate({ codeTheme: e.target.value as any })}
                                className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer w-16"
                            >
                                <option value="vs-dark">Oscuro</option>
                                <option value="vs">Claro</option>
                                <option value="hc-black">Contr</option>
                            </select>
                        </div>
                    </div>
                ) : (
                    <>
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
                    </>
                )}

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

                {/* Style Buttons (B / I / U) - solo en modos normales */}
                {text.textMode !== 'code' && (
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
                        <button onClick={() => handleExecCommand('bold')} className={`w-6 h-6 flex items-center justify-center font-bold hover:bg-white dark:hover:bg-gray-700 rounded text-xs ${text.fontWeight === 'bold' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>B</button>
                        <button onClick={() => handleExecCommand('italic')} className={`w-6 h-6 flex items-center justify-center italic hover:bg-white dark:hover:bg-gray-700 rounded text-xs font-serif ${text.fontStyle === 'italic' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>I</button>
                        <button onClick={() => handleExecCommand('underline')} className={`w-6 h-6 flex items-center justify-center underline hover:bg-white dark:hover:bg-gray-700 rounded text-xs ${text.textDecoration === 'underline' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>U</button>
                    </div>
                )}
            </div>

            <div className="h-px w-full bg-gray-200 dark:bg-gray-700 mb-2"></div>

            {/* Colors & Borders Panel */}
            <div className="flex flex-wrap items-center gap-4 bg-gray-100/50 dark:bg-gray-855/50 p-2 rounded-xl w-full border border-gray-200/50 dark:border-gray-700/50 mb-2">
                {/* Text Color */}
                {text.textMode !== 'code' && (
                    <div className="flex items-center gap-1.5" title="Color de Texto">
                        <span className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500">Texto</span>
                        <ColorPickerButton 
                            color={text.color || '#000000'}
                            onChange={(c) => onUpdate({ color: c })}
                            className="w-6 h-6 rounded-full border border-gray-300 shadow-sm"
                            position="bottom"
                        />
                    </div>
                )}

                {text.textMode !== 'code' && <div className="h-4 w-px bg-gray-250 dark:bg-gray-700"></div>}

                {/* Background Color Toggle & Picker */}
                <div className="flex items-center gap-1.5">
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input 
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 dark:bg-gray-800 cursor-pointer"
                            checked={!!text.backgroundColor && text.backgroundColor !== 'transparent'}
                            onChange={(e) => {
                                const active = e.target.checked;
                                onUpdate({ backgroundColor: active ? '#ffffff' : 'transparent' });
                            }}
                        />
                        <span className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500">Fondo</span>
                    </label>
                    {text.backgroundColor && text.backgroundColor !== 'transparent' ? (
                        <ColorPickerButton 
                            color={text.backgroundColor}
                            onChange={(c) => onUpdate({ backgroundColor: c })}
                            className="w-6 h-6 rounded-md border border-gray-300 shadow-sm transition-transform hover:scale-105"
                            position="bottom"
                        />
                    ) : (
                        <div className="w-6 h-6 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-transparent flex items-center justify-center opacity-40" title="Sin Fondo">
                            <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase">Off</span>
                        </div>
                    )}
                </div>

                <div className="h-4 w-px bg-gray-250 dark:bg-gray-700"></div>

                {/* Border Toggle, Picker & Style Selector */}
                <div className="flex items-center gap-1.5">
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input 
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 dark:bg-gray-800 cursor-pointer"
                            checked={!!text.borderColor && text.borderColor !== 'transparent'}
                            onChange={(e) => {
                                const active = e.target.checked;
                                onUpdate({ borderColor: active ? '#000000' : 'transparent' });
                            }}
                        />
                        <span className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-500">Borde</span>
                    </label>
                    {text.borderColor && text.borderColor !== 'transparent' ? (
                        <>
                            <ColorPickerButton 
                                color={text.borderColor}
                                onChange={(c) => onUpdate({ borderColor: c })}
                                className="w-6 h-6 rounded-md border border-gray-300 shadow-sm transition-transform hover:scale-105"
                                position="bottom"
                            />
                            <select
                                value={text.borderStyle || 'solid'}
                                onChange={(e) => onUpdate({ borderStyle: e.target.value as any })}
                                className="bg-white dark:bg-gray-850 text-[9px] font-black uppercase text-gray-600 dark:text-gray-300 border border-gray-250 dark:border-gray-750 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                                title="Estilo del Borde"
                            >
                                <option value="solid">Continuo</option>
                                <option value="dashed">Guiones</option>
                                <option value="dotted">Puntos</option>
                            </select>
                        </>
                    ) : (
                        <div className="w-6 h-6 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-transparent flex items-center justify-center opacity-40" title="Sin Borde">
                            <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase">Off</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="h-px w-full bg-gray-200 dark:bg-gray-700 mb-2"></div>

            {/* Row 3: Alignment & Management Actions */}
            <div className="flex items-center gap-3 w-full justify-between">
                {text.textMode !== 'code' ? (
                    <div className="flex gap-2">
                        {/* Horizontal Alignment */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                            <button onClick={() => onUpdate({ textAlign: 'left' })} className={`p-1 rounded ${text.textAlign === 'left' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400'}`} title="Alinear izquierda">
                                <IconAlignLeft className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={() => onUpdate({ textAlign: 'center' })} className={`p-1 rounded ${text.textAlign === 'center' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400'}`} title="Centrar horizontal">
                                <IconAlignCenter className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={() => onUpdate({ textAlign: 'right' })} className={`p-1 rounded ${text.textAlign === 'right' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400'}`} title="Alinear derecha">
                                <IconAlignRight className="w-3.5 h-3.5"/>
                            </button>
                        </div>
                        {/* Vertical Alignment */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                            <button onClick={() => onUpdate({ verticalAlign: 'top' })} className={`p-1 rounded ${(!text.verticalAlign || text.verticalAlign === 'top') ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400'}`} title="Alinear arriba">
                                <IconAlignTop className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={() => onUpdate({ verticalAlign: 'middle' })} className={`p-1 rounded ${text.verticalAlign === 'middle' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400'}`} title="Centrar vertical">
                                <IconAlignMiddle className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={() => onUpdate({ verticalAlign: 'bottom' })} className={`p-1 rounded ${text.verticalAlign === 'bottom' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400'}`} title="Alinear abajo">
                                <IconAlignBottom className="w-3.5 h-3.5"/>
                            </button>
                        </div>
                    </div>
                ) : <div />}

                {/* Management Actions */}
                <div className="flex items-center gap-1">
                    <div className="relative">
                        <button 
                            onClick={() => setShowLayerSelector(!showLayerSelector)} 
                            className="p-1.5 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-primary transition-colors" 
                            title="Mover a Capa"
                        >
                            <IconLayers className="w-4 h-4"/>
                        </button>
                        {showLayerSelector && (
                            <div className="glass-panel absolute bottom-full left-0 mb-2 rounded-xl shadow-xl w-40 z-50 p-1 overflow-hidden">
                                {layers.map(l => (
                                    <button 
                                        key={l.id} 
                                        onClick={() => { onMoveToLayer(l.id); setShowLayerSelector(false); }}
                                        className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-855 rounded-lg truncate block text-gray-700 dark:text-gray-300 transition-colors"
                                    >
                                        {l.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={() => onUpdate({ allowCopy: !(text.allowCopy ?? true) })}
                        className={`p-1.5 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-lg transition-colors ${text.allowCopy === false ? 'text-gray-400' : 'text-green-500'}`}
                        title={text.allowCopy === false ? 'Copiar deshabilitado' : 'Permitir copiar'}
                    >
                        <IconClipboardCopy className="w-4 h-4"/>
                    </button>

                    <button onClick={onCopy} className="p-1.5 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-lg text-blue-500 transition-colors" title="Copiar"><IconClipboardCopy className="w-4 h-4"/></button>
                    <button onClick={onDelete} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 transition-colors" title="Eliminar"><IconTrash className="w-4 h-4"/></button>
                </div>
            </div>
        </div>
    );
};
