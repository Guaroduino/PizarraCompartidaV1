
// File: src/components/whiteboard/ui/TextEditorModal.tsx
import React, { useState } from 'react';
import type { ExtendedWhiteboardText } from '../../../types/whiteboardTypes';
import { IconX, IconPencil } from '../../Icons';
import RichTextEditor from '../../RichTextEditor';

interface TextEditorModalProps {
    text: ExtendedWhiteboardText;
    onSave: (newContent: string) => void;
    onClose: () => void;
}

export const TextEditorModal: React.FC<TextEditorModalProps> = ({ text, onSave, onClose }) => {
    const [content, setContent] = useState(text.content);

    return (
        <div className="absolute inset-0 bg-black/50 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onPointerDown={e => e.stopPropagation()}>
            <div className="bg-white dark:bg-dark-card w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden max-h-[80vh] animate-in zoom-in-95 duration-200">
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                        <IconPencil className="w-5 h-5 text-primary"/> Editar Contenido
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><IconX className="w-5 h-5"/></button>
                </header>
                <div className="p-4 flex-1 overflow-y-auto">
                    <RichTextEditor 
                        value={content} 
                        onChange={setContent} 
                        placeholder="Escribe tu texto, código o notas aquí..." 
                    />
                </div>
                <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg">Cancelar</button>
                    <button onClick={() => { onSave(content); onClose(); }} className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-lg">Guardar Cambios</button>
                </footer>
            </div>
        </div>
    );
};
