
import React from 'react';
import type { WhiteboardLayer } from '../../../types';
import { IconPlus, IconEye, IconEyeSlash, IconChevronUp, IconChevronDown, IconTrash } from '../../Icons';

interface LayerManagerProps {
    layers: WhiteboardLayer[];
    activeLayerId: string;
    onSetActiveLayer: (id: string) => void;
    onAddLayer: () => void;
    onDeleteLayer: (id: string) => void;
    onToggleVisibility: (layer: WhiteboardLayer) => void;
    onMoveLayer: (layer: WhiteboardLayer, direction: 'up' | 'down') => void;
    onUpdateLayer: (id: string, updates: Partial<WhiteboardLayer>) => void; // New prop
    onClose: () => void;
}

export const LayerManager: React.FC<LayerManagerProps> = ({ 
    layers, activeLayerId, onSetActiveLayer, onAddLayer, onDeleteLayer, onToggleVisibility, onMoveLayer, onUpdateLayer, onClose 
}) => {
    return (
        <div className="absolute top-24 right-4 w-72 bg-white/95 dark:bg-dark-card backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 z-50 animate-in slide-in-from-right-4 pointer-events-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-2"> 
                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400">Capas</h3> 
                <button onClick={onAddLayer} className="p-1 text-primary hover:bg-primary/10 rounded-lg"><IconPlus className="w-5 h-5" /></button> 
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                {[...layers].sort((a, b) => b.order - a.order).map((layer, idx, arr) => (
                    <div key={layer.id} className={`flex flex-col p-2 rounded-xl border-2 transition-all ${activeLayerId === layer.id ? 'border-primary bg-primary/5' : 'border-transparent bg-gray-100 dark:bg-gray-800'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <button onClick={() => onSetActiveLayer(layer.id)} className="flex-grow text-left truncate"><p className={`text-xs font-bold ${activeLayerId === layer.id ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>{layer.name}</p></button>
                            <div className="flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer); }} className="p-1.5 hover:bg-gray-200 rounded">{layer.visible ? <IconEye className="w-4 h-4 text-primary" /> : <IconEyeSlash className="w-4 h-4 text-gray-400" />}</button>
                                <div className="flex flex-col gap-0.5">
                                    <button onClick={(e) => { e.stopPropagation(); onMoveLayer(layer, 'up'); }} disabled={idx === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><IconChevronUp className="w-3 h-3" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); onMoveLayer(layer, 'down'); }} disabled={idx === arr.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><IconChevronDown className="w-3 h-3" /></button>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }} disabled={layers.length <= 1} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded disabled:opacity-30"><IconTrash className="w-4 h-4" /></button>
                            </div>
                        </div>
                        {/* Opacity Slider */}
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase w-8">Opac.</span>
                            <input 
                                type="range" 
                                min="0" max="1" step="0.1" 
                                value={layer.opacity ?? 1} 
                                onChange={(e) => onUpdateLayer(layer.id, { opacity: parseFloat(e.target.value) })}
                                className="w-full h-1 bg-gray-300 dark:bg-gray-600 rounded-lg accent-primary cursor-pointer"
                            />
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={onClose} className="w-full mt-4 py-2 bg-gray-200 dark:bg-gray-700 text-[10px] font-black uppercase rounded-lg">Cerrar</button>
        </div>
    );
};