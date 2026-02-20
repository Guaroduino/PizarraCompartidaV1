
import React, { useRef, useEffect, useState } from 'react';
import { IconAlignLeft, IconAlignCenter, IconAlignRight, IconTextColor, IconBackgroundColor, IconRemoveFormat, IconRemoveBackgroundColor, IconThemeColor, IconCode } from './Icons';

const RichTextToolbarButton: React.FC<{ 
    onMouseDown?: (e: React.MouseEvent) => void; 
    onClick?: (e: React.MouseEvent) => void;
    children: React.ReactNode; 
    title: string;
    disabled?: boolean;
    active?: boolean;
}> = ({ onMouseDown, onClick, children, title, disabled, active }) => (
    <button
        type="button"
        title={title}
        onMouseDown={onMouseDown}
        onClick={onClick}
        disabled={disabled}
        className={`px-2 py-1 text-sm font-medium rounded transition-colors ${
            active 
                ? 'bg-gray-300 text-gray-900 dark:bg-gray-500 dark:text-white' 
                : 'text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {children}
    </button>
);

const RichTextEditor: React.FC<{ value: string; onChange: (html: string) => void; placeholder: string; }> = ({ value, onChange, placeholder }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isSourceMode, setIsSourceMode] = useState(false);

    useEffect(() => {
        if (!isSourceMode && editorRef.current) {
            // Simple check to avoid cursor jumps on some updates, but allowing external value updates.
            // We only update innerHTML if the element is NOT focused, OR if the content is significantly different
            // (forcing an update when switching modes relies on the key prop remounting the component).
            if (document.activeElement !== editorRef.current) {
                 if (editorRef.current.innerHTML !== value) {
                    editorRef.current.innerHTML = value;
                 }
            }
        }
    }, [value, isSourceMode]);

    const execCommand = (command: string, valueArg: string | null = null) => {
        document.execCommand(command, false, valueArg);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML); 
            editorRef.current.focus();
        }
    };
    
    const handleCommand = (command: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        execCommand(command);
    };

    const handleFormatBlock = (tag: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        execCommand('formatBlock', tag);
    };

    // FIX: Changed event type from ChangeEvent to FormEvent for compatibility with onInput and used currentTarget for type safety.
    const handleColorChange = (command: 'foreColor' | 'backColor') => (e: React.FormEvent<HTMLInputElement>) => {
        execCommand(command, e.currentTarget.value);
    };

    return (
        <div className="border border-gray-300 dark:border-gray-600 rounded-md focus-within:ring-2 focus-within:ring-primary overflow-hidden">
            <div className="flex items-center gap-1 p-1 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-t-md flex-wrap">
                <RichTextToolbarButton onMouseDown={handleCommand('bold')} title="Negrita" disabled={isSourceMode}><b>B</b></RichTextToolbarButton>
                <RichTextToolbarButton onMouseDown={handleCommand('italic')} title="Cursiva" disabled={isSourceMode}><i>I</i></RichTextToolbarButton>
                <RichTextToolbarButton onMouseDown={handleCommand('underline')} title="Subrayado" disabled={isSourceMode}><u>U</u></RichTextToolbarButton>
                <RichTextToolbarButton onMouseDown={handleCommand('strikeThrough')} title="Tachado" disabled={isSourceMode}><s>S</s></RichTextToolbarButton>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                <RichTextToolbarButton onMouseDown={handleFormatBlock('h1')} title="Encabezado 1" disabled={isSourceMode}>H1</RichTextToolbarButton>
                <RichTextToolbarButton onMouseDown={handleFormatBlock('h2')} title="Encabezado 2" disabled={isSourceMode}>H2</RichTextToolbarButton>
                <RichTextToolbarButton onMouseDown={handleFormatBlock('h3')} title="Encabezado 3" disabled={isSourceMode}>H3</RichTextToolbarButton>
                <RichTextToolbarButton onMouseDown={handleFormatBlock('blockquote')} title="Cita" disabled={isSourceMode}>”</RichTextToolbarButton>
                <RichTextToolbarButton onMouseDown={handleCommand('insertUnorderedList')} title="Lista con viñetas" disabled={isSourceMode}>●</RichTextToolbarButton>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                <RichTextToolbarButton onMouseDown={handleCommand('justifyLeft')} title="Alinear a la Izquierda" disabled={isSourceMode}><IconAlignLeft className="w-4 h-4" /></RichTextToolbarButton>
                <RichTextToolbarButton onMouseDown={handleCommand('justifyCenter')} title="Alinear al Centro" disabled={isSourceMode}><IconAlignCenter className="w-4 h-4" /></RichTextToolbarButton>
                <RichTextToolbarButton onMouseDown={handleCommand('justifyRight')} title="Alinear a la Derecha" disabled={isSourceMode}><IconAlignRight className="w-4 h-4" /></RichTextToolbarButton>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                <RichTextToolbarButton onMouseDown={handleCommand('subscript')} title="Color de Tema" disabled={isSourceMode}>
                    <IconThemeColor className="w-5 h-5" />
                </RichTextToolbarButton>
                <div title="Color de Texto" className={`relative p-0 w-7 h-7 flex items-center justify-center text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 ${isSourceMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <IconTextColor className="w-5 h-5 pointer-events-none" />
                    <input
                        type="color"
                        onInput={handleColorChange('foreColor')}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        tabIndex={-1}
                        disabled={isSourceMode}
                    />
                </div>
                <div title="Color de Fondo" className={`relative p-0 w-7 h-7 flex items-center justify-center text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 ${isSourceMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <IconBackgroundColor className="w-5 h-5 pointer-events-none" />
                    <input
                        type="color"
                        onInput={handleColorChange('backColor')}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        tabIndex={-1}
                        disabled={isSourceMode}
                    />
                </div>
                <RichTextToolbarButton onMouseDown={(e) => { e.preventDefault(); execCommand('backColor', 'transparent'); }} title="Quitar Color de Fondo" disabled={isSourceMode}>
                    <IconRemoveBackgroundColor className="w-5 h-5" />
                </RichTextToolbarButton>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                <RichTextToolbarButton onMouseDown={handleCommand('removeFormat')} title="Borrar Formato" disabled={isSourceMode}>
                    <IconRemoveFormat className="w-5 h-5" />
                </RichTextToolbarButton>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                <RichTextToolbarButton onClick={() => setIsSourceMode(!isSourceMode)} active={isSourceMode} title={isSourceMode ? "Ver Vista Previa" : "Ver Código HTML"}>
                    <IconCode className="w-5 h-5"/>
                </RichTextToolbarButton>
            </div>
            {isSourceMode ? (
                <textarea 
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full p-3 min-h-[120px] input-style !border-0 !shadow-none !ring-0 !focus:ring-0 font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 resize-y"
                    placeholder="Escribe código HTML aquí..."
                />
            ) : (
                <div
                    key="visual-editor" // Force remount when switching modes
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={e => onChange(e.currentTarget.innerHTML)}
                    className="w-full p-3 min-h-[120px] input-style !border-0 !shadow-none !ring-0 !focus:ring-0 rich-text-content"
                    data-placeholder={placeholder}
                    style={{ minHeight: '120px' }}
                />
            )}
        </div>
    );
};

export default RichTextEditor;
