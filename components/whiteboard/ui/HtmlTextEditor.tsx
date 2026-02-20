
import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ExtendedWhiteboardText } from '../../../types/whiteboardTypes';
import { TextToolbar } from './TextToolbar';
import { WhiteboardLayer } from '../../../types';
import { IconCheck, IconX, IconArrowsExpand, IconSwitchLocation } from '../../Icons';

interface HtmlTextEditorProps {
    text: ExtendedWhiteboardText;
    camera: { x: number; y: number; scale: number };
    onUpdate: (updates: Partial<ExtendedWhiteboardText>) => void;
    onClose: () => void;
    layers: WhiteboardLayer[];
    onCopy: () => void;
    onCut: () => void;
    onDelete: () => void;
    onMoveToLayer: (layerId: string) => void;
}

export const HtmlTextEditor: React.FC<HtmlTextEditorProps> = ({
    text, camera, onUpdate, onClose, layers, onCopy, onCut, onDelete, onMoveToLayer
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Estado local para dimensiones mientras se redimensiona
    const [dimensions, setDimensions] = useState({ width: text.width, height: text.height });

    // Estado local para la posición visual mientras se arrastra (evita re-renders globales)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Referencia mutable para el contenido, evita problemas de clausura en eventos
    const contentRef = useRef(text.content);

    // Sincronizar contenido inicial
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== text.content) {
            editorRef.current.innerHTML = text.content;
        }
        contentRef.current = text.content;
    }, []); // Run once on mount

    // Enfocar al montar
    useLayoutEffect(() => {
        if (editorRef.current) {
            editorRef.current.focus();
            // Seleccionar todo el texto
            const range = document.createRange();
            range.selectNodeContents(editorRef.current);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    }, []);

    const handleSave = () => {
        if (editorRef.current) {
            const newContent = editorRef.current.innerHTML;
            onUpdate({
                content: newContent,
                width: dimensions.width,
                height: dimensions.height
            });
        }
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        contentRef.current = e.currentTarget.innerHTML;
    };

    // --- Lógica de Redimensionamiento (con Pointer Capture para Stylus) ---
    const handleResizeStart = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = dimensions.width;
        const startHeight = dimensions.height;

        const onPointerMove = (moveEvent: PointerEvent) => {
            const dx = (moveEvent.clientX - startX) / camera.scale;
            const dy = (moveEvent.clientY - startY) / camera.scale;

            setDimensions({
                width: Math.max(50, startWidth + dx),
                height: Math.max(30, startHeight + dy)
            });
        };

        const onPointerUp = (upEvent: PointerEvent) => {
            target.releasePointerCapture(upEvent.pointerId);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // --- Lógica de Arrastre (Drag Handle) ---
    // Actualización: Usamos estado local y guardamos solo al final
    const handleDragStart = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const target = e.currentTarget;
        target.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startY = e.clientY;

        const onPointerMove = (moveEvent: PointerEvent) => {
            // Doble chequeo: Si no hay botones presionados (y no es toque), salir.
            if (moveEvent.pointerType !== 'touch' && moveEvent.buttons === 0) return;

            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            // Actualizamos solo visualmente
            setDragOffset({ x: dx, y: dy });
        };

        const onPointerUp = (upEvent: PointerEvent) => {
            target.releasePointerCapture(upEvent.pointerId);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);

            // Calcular posición final en coordenadas del mundo
            const finalDx = upEvent.clientX - startX;
            const finalDy = upEvent.clientY - startY;

            if (finalDx !== 0 || finalDy !== 0) {
                onUpdate({
                    x: text.x + (finalDx / camera.scale),
                    y: text.y + (finalDy / camera.scale)
                });
            }

            // Resetear offset local
            setDragOffset({ x: 0, y: 0 });
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    // Calcular posición en pantalla sumando el offset temporal del arrastre
    const screenX = (text.x * camera.scale) + camera.x + dragOffset.x;
    const screenY = (text.y * camera.scale) + camera.y + dragOffset.y;
    const screenWidth = dimensions.width * camera.scale;
    const screenHeight = dimensions.height * camera.scale;

    // Estilos de fuente
    const fontFamilyStyle = text.fontFamily === 'serif' ? 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
        : text.fontFamily === 'mono' ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
            : text.fontFamily === 'hand' ? '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif'
                : text.fontFamily === 'display' ? 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif'
                    : text.fontFamily === 'code' ? 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace'
                        : text.fontFamily === 'roboto' ? '"Roboto", sans-serif'
                            : text.fontFamily === 'oswald' ? '"Oswald", sans-serif'
                                : text.fontFamily === 'playfair' ? '"Playfair Display", serif'
                                    : text.fontFamily === 'montserrat' ? '"Montserrat", sans-serif'
                                        : text.fontFamily === 'pacifico' ? '"Pacifico", cursive'
                                            : text.fontFamily === 'dancing' ? '"Dancing Script", cursive'
                                                : text.fontFamily === 'lobster' ? '"Lobster", cursive'
                                                    : 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    return (
        <div
            ref={containerRef}
            className="absolute z-50 origin-top-left"
            style={{
                left: screenX,
                top: screenY,
                width: screenWidth,
                height: screenHeight,
                transform: `rotate(${text.rotation}deg)`,
                // Optimizaciones para movimiento fluido
                willChange: dragOffset.x !== 0 || dragOffset.y !== 0 ? 'left, top' : 'auto',
            }}
            onPointerDown={(e) => e.stopPropagation()} // Evitar arrastrar el canvas detrás
        >
            {/* Barra de Herramientas y Botones de Acción (Fija en la parte inferior) */}
            {createPortal(
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-auto">

                    {/* Botones de Guardar/Cancelar */}
                    <div className="flex gap-2 bg-white/90 dark:bg-dark-card/90 backdrop-blur-md p-2 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-fit mx-auto animate-in slide-in-from-bottom-5">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white font-bold text-sm rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                            title="Guardar cambios"
                        >
                            <IconCheck className="w-4 h-4" /> Guardar
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white font-bold text-sm rounded-lg hover:bg-gray-600 transition-colors shadow-sm"
                            title="Cancelar cambios"
                        >
                            <IconX className="w-4 h-4" /> Cancelar
                        </button>
                    </div>

                    <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-2">
                        <TextToolbar
                            text={text}
                            layers={layers}
                            onUpdate={(updates) => {
                                // Actualizar props inmediatamente para feedback visual
                                onUpdate(updates);
                            }}
                            onCopy={onCopy}
                            onCut={onCut}
                            onDelete={() => { onDelete(); onClose(); }}
                            onMoveToLayer={onMoveToLayer}
                            isOverlay={true}
                        />
                    </div>
                </div>,
                document.body
            )}

            {/* Área de Edición */}
            <div className="relative w-full h-full group">
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    className="w-full h-full outline-none p-3 rounded-t-lg shadow-xl bg-white/95 backdrop-blur-sm border-2 border-primary border-b-0 overflow-hidden"
                    style={{
                        color: text.color || 'inherit',
                        fontSize: `${(text.fontSize || 16) * camera.scale}px`,
                        textAlign: text.textAlign || 'left',
                        fontFamily: fontFamilyStyle,
                        fontWeight: text.fontWeight || 'normal',
                        fontStyle: text.fontStyle || 'normal',
                        textDecoration: text.textDecoration || 'none',
                        backgroundColor: text.backgroundColor || 'transparent',
                        borderColor: text.borderColor || 'transparent',
                        borderStyle: text.borderStyle || 'solid',
                        borderWidth: (text.borderColor && text.borderColor !== 'transparent') ? `${2 * camera.scale}px` : '0px',
                        lineHeight: '1.2',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        resize: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: text.verticalAlign === 'middle' ? 'center' : text.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start'
                    }}
                />

                {/* --- HANDLE DE ARRASTRE --- */}
                <div
                    onPointerDown={handleDragStart}
                    className="w-full h-6 bg-primary cursor-move flex items-center justify-center rounded-b-lg shadow-lg hover:bg-primary-dark transition-colors touch-none"
                    title="Arrastrar para mover"
                >
                    <IconSwitchLocation className="w-4 h-4 text-white pointer-events-none" />
                </div>

                {/* Tirador de Redimensionamiento (Resize Handle) */}
                <div
                    onPointerDown={handleResizeStart}
                    className="absolute -bottom-3 -right-3 w-8 h-8 bg-white border-2 border-primary rounded-full cursor-nwse-resize flex items-center justify-center shadow-md z-50 hover:scale-110 transition-transform touch-none"
                >
                    <IconArrowsExpand className="w-4 h-4 text-primary transform rotate-90 pointer-events-none" />
                </div>
            </div>
        </div>
    );
};
