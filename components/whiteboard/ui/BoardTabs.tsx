import React, { useRef } from 'react';
import type { WhiteboardBoard } from '../../../types';
import { IconPlus, IconPencil, IconDownload, IconBook, IconX, IconUpload } from '../../Icons';

interface BoardTabsProps {
    sortedBoards: WhiteboardBoard[];
    activeBoardId: string;
    isTeacher: boolean;
    courseTitle: string;
    courseCode?: string;
    onSelectBoard: (boardId: string) => void;
    onDragStartBoard: (e: React.DragEvent, boardId: string) => void;
    onDragOverBoard: (e: React.DragEvent) => void;
    onDropOnIndex: (e: React.DragEvent, index: number) => void;
    onAddBoardAtIndex: (index: number) => void;
    onRenameBoard: (boardId: string, currentName: string) => void;
    onExportBoard: (boardId: string) => void;
    onSaveBoardAsClass: () => void;
    onDeleteBoard: (boardId: string) => void;
    onCreateBoard: () => void;
    onImportBoard: (file: File) => void;
    onOpenClassLibrary: () => void;
}

export const BoardTabs: React.FC<BoardTabsProps> = React.memo(({
    sortedBoards,
    activeBoardId,
    isTeacher,
    courseTitle,
    courseCode,
    onSelectBoard,
    onDragStartBoard,
    onDragOverBoard,
    onDropOnIndex,
    onAddBoardAtIndex,
    onRenameBoard,
    onExportBoard,
    onSaveBoardAsClass,
    onDeleteBoard,
    onCreateBoard,
    onImportBoard,
    onOpenClassLibrary,
}) => {
    const importInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex-none h-12 bg-gray-200 dark:bg-gray-800 flex items-center px-2 border-b border-gray-300 dark:border-gray-700 rounded-t-2xl justify-between">
            <div className="flex items-center gap-1 overflow-x-auto flex-1 pr-4 no-scrollbar">
                {sortedBoards.map((board, idx) => (
                    <div
                        key={board.id}
                        draggable={isTeacher}
                        onDragStart={(e) => { if (isTeacher && board.id) onDragStartBoard(e, board.id); }}
                        onDragOver={(e) => { if (isTeacher) onDragOverBoard(e); }}
                        onDrop={(e) => { if (isTeacher) onDropOnIndex(e, idx); }}
                        onClick={() => onSelectBoard(board.id)}
                        className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer text-xs font-bold transition-all select-none min-w-[120px] max-w-[350px] h-full border-b-2 ${activeBoardId === board.id ? 'bg-white dark:bg-black text-primary border-primary' : 'bg-transparent text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-700 border-transparent'}`}
                    >
                        <span className="truncate flex-grow" title={board.name}>{board.name}</span>

                        {/* Acciones flotantes que aparecen al hacer hover (teacher only) */}
                        {isTeacher && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); onAddBoardAtIndex(idx); }} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400" title="Agregar antes"><IconPlus className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); onAddBoardAtIndex(idx + 1); }} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400" title="Agregar después"><IconPlus className="w-3 h-3" /></button>
                                
                                {activeBoardId === board.id && (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); onRenameBoard(board.id, board.name); }} className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-gray-400 hover:text-blue-500" title="Renombrar"><IconPencil className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); onExportBoard(board.id); }} className="p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 text-gray-400 hover:text-blue-500" title="Descargar"><IconDownload className="w-3 h-3" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); onSaveBoardAsClass(); }} className="p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 text-gray-400 hover:text-green-500" title="Guardar en Librería"><IconBook className="w-3 h-3" /></button>
                                        {sortedBoards.length > 1 && (
                                            <button onClick={(e) => { e.stopPropagation(); onDeleteBoard(board.id); }} className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-400 hover:text-red-500" title="Borrar"><IconX className="w-3 h-3" /></button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 bg-gray-200 dark:bg-gray-800 pl-2 shadow-[-10px_0_10px_-5px_rgba(0,0,0,0.1)] dark:shadow-none z-10">
                {isTeacher && (
                    <>
                        <button onClick={onCreateBoard} className="p-2 text-gray-500 hover:text-primary hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Nueva Clase"><IconPlus className="w-4 h-4" /></button>
                        <label className="p-2 text-gray-500 hover:text-green-500 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer" title="Cargar (.json)">
                            <IconUpload className="w-4 h-4" />
                            <input 
                                ref={importInputRef} 
                                type="file" 
                                accept=".json" 
                                className="hidden" 
                                onChange={(e) => { 
                                    if (e.target.files?.[0]) onImportBoard(e.target.files[0]); 
                                    if (importInputRef.current) importInputRef.current.value = ''; 
                                }} 
                            />
                        </label>
                        <button onClick={onOpenClassLibrary} className="p-2 text-gray-500 hover:text-blue-500 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Librería de Clases"><IconBook className="w-4 h-4" /></button>
                        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1"></div>
                    </>
                )}
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider leading-none mb-0.5">Salón</span>
                        <span className="font-bold text-gray-700 dark:text-gray-200 truncate max-w-[150px] text-sm leading-none" title={courseTitle}>
                            {courseTitle || '...'}
                        </span>
                    </div>
                    {courseCode && isTeacher && (
                        <div className="flex flex-col items-end border-l border-gray-300 dark:border-gray-600 pl-2">
                            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider leading-none mb-0.5">Código</span>
                            <span className="font-mono font-bold text-primary text-sm leading-none select-all cursor-pointer hover:scale-105 transition-transform" title="Copiar código" onClick={() => navigator.clipboard.writeText(courseCode)}>
                                {courseCode}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
