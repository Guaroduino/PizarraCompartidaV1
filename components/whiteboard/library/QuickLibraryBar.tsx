
import React, { useRef, useState } from 'react';
import type { LibraryItem } from '../../../types';
import { IconImage, IconGroup, IconPlus, IconX, IconLibrary, IconUpload } from '../../Icons';

interface QuickLibraryBarProps {
    items: LibraryItem[];
    onDragStart: (e: React.DragEvent, item: LibraryItem) => void;
    onDrop: (item: LibraryItem, x: number, y: number) => void;
    onAddToCenter: (item: LibraryItem) => void; 
    onAddToTopLeft?: (item: LibraryItem) => void;
    onRemoveItem: (id: string) => void; 
    onOpenLibrary: () => void;
    onImportImage: (file: File) => void; // New prop
}

export const QuickLibraryBar: React.FC<QuickLibraryBarProps> = ({ 
    items, onDragStart, onDrop, onAddToCenter, onAddToTopLeft, onRemoveItem, onOpenLibrary, onImportImage 
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [touchItem, setTouchItem] = useState<LibraryItem | null>(null);
    const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Simulated Drag-and-Drop for Touch Devices
    const handleTouchStart = (e: React.TouchEvent, item: LibraryItem) => {
        const touch = e.touches[0];
        setTouchItem(item);
        setTouchPos({ x: touch.clientX, y: touch.clientY });
        setIsDragging(false);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchItem) return;
        const touch = e.touches[0];
        setTouchPos({ x: touch.clientX, y: touch.clientY });

        if (scrollRef.current) {
            const rect = scrollRef.current.getBoundingClientRect();
            if (touch.clientY < rect.top || touch.clientY > rect.bottom) {
                setIsDragging(true);
                e.preventDefault(); 
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchItem && isDragging) {
            onDrop(touchItem, touchPos.x, touchPos.y);
        }
        setTouchItem(null);
        setIsDragging(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImportImage(file);
            // Reset input so the same file can be selected again if needed
            e.target.value = '';
        }
    };

    return (
        <div className="flex w-full h-full bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 items-center px-2 min-w-0">
            {/* Left Controls: Import */}
            <div className="flex-shrink-0 pr-2 border-r border-gray-300 dark:border-gray-700 mr-2">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 w-10 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shadow-sm"
                    title="Importar Imagen a Librería"
                >
                    <IconUpload className="w-5 h-5" />
                </button>
                <input 
                    type="file" 
                    accept=".png, .jpg, .jpeg, .svg" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                />
            </div>

            {/* Center: Scrollable Items */}
            <div 
                className="flex-1 h-full overflow-x-auto overflow-y-hidden flex items-center gap-4 px-2 no-scrollbar min-w-0"
                ref={scrollRef}
            >
                {items.length === 0 && (
                    <span className="text-xs text-gray-400 italic whitespace-nowrap">Librería Rápida (vacía)</span>
                )}
                
                {items.map(item => (
                    <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, item)}
                        onTouchStart={(e) => handleTouchStart(e, item)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className="h-12 w-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm flex items-center justify-center cursor-grab group relative touch-none flex-shrink-0"
                        title={item.name}
                    >
                        {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-contain p-1 pointer-events-none"/>
                        ) : (
                            <div className="text-gray-400">
                                {item.type === 'group' ? <IconGroup className="w-6 h-6"/> : <IconImage className="w-6 h-6"/>}
                            </div>
                        )}
                        {/* Badge to indicate this library item is a slide/page */}
                        {item.type === 'page' && (
                            <div className="absolute -bottom-2 -left-2 bg-primary text-white text-[10px] px-1 py-0.5 rounded-md shadow z-20" title="Diapositiva">SL</div>
                        )}
                        
                        {/* Overlay Buttons */}
                        <button 
                            onClick={(e) => { e.stopPropagation();
                                // If caller provided a top-left handler and this is a page, use it
                                if (item.type === 'page' && typeof onAddToTopLeft === 'function') {
                                    onAddToTopLeft(item);
                                } else {
                                    onAddToCenter(item);
                                }
                            }}
                            className="absolute -top-2 -left-2 w-5 h-5 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity z-10"
                            title="Añadir al centro"
                        >
                            <IconPlus className="w-3 h-3" />
                        </button>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity z-10"
                            title="Eliminar de librería"
                        >
                            <IconX className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Right Controls: Open Library */}
            <div className="flex-shrink-0 pl-2 border-l border-gray-300 dark:border-gray-700 ml-2">
                <button 
                    onClick={onOpenLibrary}
                    className="h-10 w-10 bg-gray-200 dark:bg-gray-800 hover:bg-primary hover:text-white rounded-lg flex items-center justify-center transition-colors text-gray-500"
                    title="Abrir Librería Completa"
                >
                    <IconLibrary className="w-5 h-5" />
                </button>
            </div>

            {/* Ghost Element for Touch Dragging */}
            {isDragging && touchItem && (
                <div 
                    className="fixed z-[9999] pointer-events-none w-16 h-16 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-2xl border-2 border-primary flex items-center justify-center backdrop-blur-sm"
                    style={{ 
                        left: touchPos.x, 
                        top: touchPos.y,
                        transform: 'translate(-50%, -50%)' 
                    }}
                >
                     {touchItem.thumbnailUrl ? (
                        <img src={touchItem.thumbnailUrl} alt="" className="w-full h-full object-contain p-2"/>
                    ) : (
                        <div className="text-primary">
                            {touchItem.type === 'group' ? <IconGroup className="w-8 h-8"/> : <IconImage className="w-8 h-8"/>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
