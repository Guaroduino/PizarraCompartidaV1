
import React from 'react';
import type { WhiteboardSnapshot } from '../../../types/whiteboardTypes';
import type { GridConfig } from '../../../types';
import { IconX, IconPaperclip, IconTrash, IconDeviceFloppy, IconDownload, IconGrid } from '../../Icons';
import { BG_COLORS } from '../../../utils/whiteboardUtils';
import { ColorPickerButton } from '../../ColorPicker';

interface WhiteboardSettingsProps {
    bgColor: string;
    bgImageUrl: string | null;
    snapshots: WhiteboardSnapshot[];
    boardDimensions?: { width: number, height: number };
    grid?: GridConfig;
    onClose: () => void;
    onUpdateSettings: (updates: any) => void;
    onUploadBackground: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveBackground: () => void;
    onSaveSnapshot: () => void;
    onLoadSnapshot: (snapshot: WhiteboardSnapshot) => void;
    onDeleteSnapshot: (id: string) => void;
    onClearBoard: () => void;
}

export const WhiteboardSettings: React.FC<WhiteboardSettingsProps> = (props) => {
    return (
        <div className="absolute top-24 right-4 w-80 bg-white/95 dark:bg-dark-card backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 z-50 animate-in slide-in-from-right-4 pointer-events-auto max-h-[80vh] overflow-y-auto">
            <SettingsContent {...props} />
        </div>
    );
};

const SettingsContent: React.FC<WhiteboardSettingsProps> = ({ 
    bgColor, bgImageUrl, snapshots, boardDimensions, grid, 
    onClose, onUpdateSettings, onUploadBackground, onRemoveBackground, 
    onSaveSnapshot, onLoadSnapshot, onDeleteSnapshot, onClearBoard 
}) => {

    const safeGrid = grid || {
        enabled: false,
        teacherOnly: true,
        minor: { spacing: 20, color: '#e5e7eb', opacity: 0.5 },
        medium: { spacing: 100, color: '#9ca3af', opacity: 0.5 },
        major: { spacing: 500, color: '#374151', opacity: 0.5 }
    };

    const updateGrid = (updates: Partial<GridConfig>) => {
        onUpdateSettings({ grid: { ...safeGrid, ...updates } });
    };

    const updateLineConfig = (type: 'minor' | 'medium' | 'major', updates: Partial<any>) => {
        updateGrid({ [type]: { ...safeGrid[type], ...updates } });
    };

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400">Configuración</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><IconX className="w-4 h-4"/></button>
            </div>
            
            <div className="space-y-6">
                {/* Dimensions Section */}
                {boardDimensions && (
                    <div>
                        <p className="text-xs font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">Tamaño de Pizarra (px)</p>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-500">Ancho</label>
                                <input 
                                    type="number" 
                                    value={boardDimensions.width} 
                                    onChange={(e) => onUpdateSettings({ width: Number(e.target.value) })}
                                    className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800 border-none text-xs font-bold"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-500">Alto</label>
                                <input 
                                    type="number" 
                                    value={boardDimensions.height} 
                                    onChange={(e) => onUpdateSettings({ height: Number(e.target.value) })}
                                    className="w-full p-2 rounded bg-gray-100 dark:bg-gray-800 border-none text-xs font-bold"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4"></div>

                {/* Grid Section */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-2">
                            <IconGrid className="w-3 h-3"/> Rejilla (Grid)
                        </p>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={safeGrid.enabled} onChange={(e) => updateGrid({ enabled: e.target.checked })} className="sr-only peer"/>
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary dark:peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    {safeGrid.enabled && (
                        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg animate-in fade-in slide-in-from-top-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input type="checkbox" checked={safeGrid.teacherOnly} onChange={(e) => updateGrid({ teacherOnly: e.target.checked })} className="rounded text-primary focus:ring-primary"/>
                                Visible solo para profesor
                            </label>

                            {/* Line Configs */}
                            {['minor', 'medium', 'major'].map((type) => (
                                <div key={type} className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold w-12 text-gray-500">{type === 'minor' ? 'Menor' : type === 'medium' ? 'Media' : 'Mayor'}</span>
                                    <input 
                                        type="number" 
                                        value={safeGrid[type as keyof GridConfig] ? (safeGrid[type as keyof GridConfig] as any).spacing : 0} 
                                        onChange={(e) => updateLineConfig(type as any, { spacing: Number(e.target.value) })}
                                        className="w-14 p-1 text-xs text-center rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                                        title="Espaciado (px)"
                                    />
                                    <div className="flex-grow"></div>
                                    <ColorPickerButton 
                                        color={safeGrid[type as keyof GridConfig] ? (safeGrid[type as keyof GridConfig] as any).color : '#000000'} 
                                        onChange={(c) => updateLineConfig(type as any, { color: c })}
                                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                                        position="top"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4"></div>

                {/* Background Section */}
                <div>
                    <p className="text-xs font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">Fondo de Pizarra</p>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                        {BG_COLORS.map(c => (
                            <button 
                                key={c.name}
                                onClick={() => onUpdateSettings({ bgColor: c.value })}
                                className={`h-8 rounded-lg border-2 transition-all ${bgColor === c.value ? 'border-primary shadow-md scale-105' : 'border-gray-200 dark:border-gray-600'}`}
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                            />
                        ))}
                    </div>
                    <label className="flex items-center gap-2 w-full p-2 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold transition-colors mb-2">
                        <IconPaperclip className="w-4 h-4 text-primary"/>
                        <span className="truncate">{bgImageUrl ? 'Cambiar Imagen de Fondo' : 'Subir Imagen de Fondo'}</span>
                        <input type="file" accept="image/*" onChange={onUploadBackground} className="hidden" />
                    </label>
                    {bgImageUrl && (
                        <button onClick={onRemoveBackground} className="w-full p-2 text-red-500 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                            <IconTrash className="w-3 h-3"/> Quitar Imagen
                        </button>
                    )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4"></div>

                {/* Snapshots Section */}
                <div>
                    <p className="text-xs font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">Guardar/Cargar Estado</p>
                    <button onClick={onSaveSnapshot} className="w-full py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold flex items-center justify-center gap-2 mb-3">
                        <IconDeviceFloppy className="w-4 h-4"/> Guardar Estado Actual
                    </button>
                    
                    {snapshots.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {snapshots.map(snap => (
                                <div key={snap.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-transparent hover:border-gray-300 dark:hover:border-gray-600 group">
                                    <div className="flex flex-col truncate">
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{snap.name}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(snap.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onLoadSnapshot(snap)} className="p-1.5 text-primary hover:bg-primary/10 rounded" title="Cargar"><IconDownload className="w-3 h-3"/></button>
                                        <button onClick={() => onDeleteSnapshot(snap.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded" title="Eliminar"><IconTrash className="w-3 h-3"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-4 italic text-xs">No hay estados guardados</p>
                    )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <button onClick={onClearBoard} className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold uppercase shadow-md flex items-center justify-center gap-2">
                        <IconTrash className="w-4 h-4"/> Vaciar Pizarra
                    </button>
                </div>
            </div>
        </>
    );
};
