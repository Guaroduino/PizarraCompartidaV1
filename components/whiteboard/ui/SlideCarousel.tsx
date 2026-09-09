import React from 'react';
import type { WhiteboardPage } from '../../../types';
import { IconChevronUp, IconPlus, IconLibrary, IconDownload, IconX } from '../../Icons';

interface SlideCarouselProps {
    pages: WhiteboardPage[];
    activePageId: string;
    isTeacher: boolean;
    pagesListRef: React.RefObject<HTMLDivElement>;
    onSelectPage: (id: string) => void;
    onAddPage: () => void;
    onAddPageAtIndex: (index: number) => void;
    onDeletePage: (id: string) => void;
    onSavePageToLibrary: (id: string) => void;
    onDownloadPageAsJpeg: (id: string) => void;
    onDragStartPage: (e: React.DragEvent, pageId: string) => void;
    onDragOverPage: (e: React.DragEvent) => void;
    onDropOnPageIndex: (e: React.DragEvent, index: number) => void;
    onDragEndPage: () => void;
}

export const SlideCarousel: React.FC<SlideCarouselProps> = React.memo(({
    pages,
    activePageId,
    isTeacher,
    pagesListRef,
    onSelectPage,
    onAddPage,
    onAddPageAtIndex,
    onDeletePage,
    onSavePageToLibrary,
    onDownloadPageAsJpeg,
    onDragStartPage,
    onDragOverPage,
    onDropOnPageIndex,
    onDragEndPage,
}) => {
    return (
        <div className="flex items-center gap-2 px-2 overflow-hidden w-full h-full min-w-0">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest hidden sm:block flex-shrink-0">Pizarras</span>
            <button
                onClick={() => {
                    const idx = pages.findIndex(p => p.id === activePageId);
                    if (idx > 0) onSelectPage(pages[idx - 1].id);
                }}
                disabled={pages.length === 0 || pages[0].id === activePageId}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent flex-shrink-0"
                title="Pizarra Anterior"
            >
                <IconChevronUp className="w-5 h-5 -rotate-90" />
            </button>
            <div className="flex-1 overflow-x-auto flex gap-2 py-2 scrollbar-hide items-center min-w-0" ref={pagesListRef}>
                {pages.map((page, idx) => (
                    <div
                        key={page.id}
                        data-page-id={page.id}
                        onClick={() => onSelectPage(page.id)}
                        draggable={isTeacher}
                        onDragStart={(e) => { if (isTeacher) onDragStartPage(e, page.id); }}
                        onDragOver={(e) => { if (isTeacher) onDragOverPage(e); }}
                        onDrop={(e) => { if (isTeacher) onDropOnPageIndex(e, idx); }}
                        onDragEnd={onDragEndPage}
                        className={`group relative flex-shrink-0 w-20 h-10 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-center bg-white dark:bg-black ${activePageId === page.id ? 'border-primary ring-2 ring-primary/30' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                    >
                        <span className={`text-xs font-bold ${activePageId === page.id ? 'text-primary' : 'text-gray-500'}`}>{idx + 1}</span>

                        {/* Add-before / Add-after buttons for teachers */}
                        {isTeacher && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); onAddPageAtIndex(idx); }} title="Agregar antes" className="absolute -left-3 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 border rounded-full p-0.5 shadow text-gray-500 hover:text-primary hover:scale-110"><IconPlus className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); onAddPageAtIndex(idx + 1); }} title="Agregar después" className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 border rounded-full p-0.5 shadow text-gray-500 hover:text-primary hover:scale-110"><IconPlus className="w-3 h-3" /></button>
                            </>
                        )}

                        {/* Save to library (top-left) - only show when page is active */}
                        {isTeacher && activePageId === page.id && (
                            <button onClick={(e) => { e.stopPropagation(); onSavePageToLibrary(page.id); }} title="Guardar diapositiva en librería" className="absolute -top-2 -left-2 bg-white dark:bg-gray-800 border rounded-full p-0.5 shadow text-purple-600 hover:text-purple-800 z-10 transition-transform hover:scale-110"><IconLibrary className="w-3 h-3" /></button>
                        )}

                        {/* Download as JPG (bottom-right) - only show when page is active */}
                        {isTeacher && activePageId === page.id && (
                            <button onClick={(e) => { e.stopPropagation(); onDownloadPageAsJpeg(page.id); }} title="Descargar como JPG" className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 border rounded-full p-0.5 shadow text-gray-600 hover:text-primary z-10 transition-transform hover:scale-110"><IconDownload className="w-3 h-3" /></button>
                        )}

                        {isTeacher && activePageId === page.id && pages.length > 1 && (
                            <button onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 z-10 transition-transform hover:scale-110"><IconX className="w-3 h-3" /></button>
                        )}
                    </div>
                ))}
            </div>
            <button
                onClick={() => {
                    const idx = pages.findIndex(p => p.id === activePageId);
                    if (idx < pages.length - 1) onSelectPage(pages[idx + 1].id);
                }}
                disabled={pages.length === 0 || pages[pages.length - 1].id === activePageId}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent flex-shrink-0"
                title="Pizarra Siguiente"
            >
                <IconChevronUp className="w-5 h-5 rotate-90" />
            </button>
            {isTeacher && (
                <button onClick={onAddPage} className="flex-shrink-0 w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary transition-colors" title="Nueva Pizarra">
                    <IconPlus className="w-5 h-5" />
                </button>
            )}
        </div>
    );
});
