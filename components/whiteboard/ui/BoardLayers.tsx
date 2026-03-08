
// File: src/components/whiteboard/ui/BoardLayers.tsx
import React, { useMemo } from 'react';
import { StaticStroke } from './StaticStroke';
import { IconClipboardCopy } from '../../Icons';
import Editor from '@monaco-editor/react';
import type { WhiteboardLayer, WhiteboardStroke, WhiteboardImage, WhiteboardText } from '../../../types';
import type { ExtendedWhiteboardText, TransformState, BoundingBox } from '../../../types/whiteboardTypes';

interface BoardLayersProps {
    layers: WhiteboardLayer[];
    localImages: WhiteboardImage[];
    localTexts: ExtendedWhiteboardText[];
    activeStrokes: WhiteboardStroke[];
    selectedStrokeIds: string[];
    selectedId: string | null;
    isTeacher: boolean;
    tool: string;
    cameraScale: number;
    tempStrokeTransform: TransformState;
    strokeSelectionBounds: BoundingBox | null;
    // Callbacks
    setEditingTextId: (id: string | null) => void;
    setTool: (tool: any) => void;
    editingTextId: string | null;
}

export const BoardLayers = React.memo((props: BoardLayersProps) => {
    const {
        layers, localImages, localTexts, activeStrokes, selectedStrokeIds,
        selectedId, isTeacher, tool, cameraScale, tempStrokeTransform,
        strokeSelectionBounds, setEditingTextId, setTool, editingTextId
    } = props;

    // Helper para limpiar el texto escapado (entidades HTML) cuando se muestra en Monaco
    const decodeHtmlIfNeeded = (html: string) => {
        if (!html) return "";
        if (html.includes('&lt;') || html.includes('&gt;') || html.includes('&amp;')) {
            const tempDiv = document.createElement("div");
            // Convierte los saltos de línea HTML en físicos
            let processedHtml = html.replace(/<div>/gi, '\n').replace(/<\/div>/gi, '').replace(/<br>/gi, '\n');
            tempDiv.innerHTML = processedHtml;
            return tempDiv.innerText || tempDiv.textContent || html;
        }
        return html;
    };

    // Sorting layers
    const sortedLayers = useMemo(() =>
        (layers.length > 0 ? [...layers].sort((a, b) => a.order - b.order) : [{ id: 'loading', visible: true, order: 0, opacity: 1 }]),
        [layers]);

    // PRE-CALCULATE LAYER CONTENT
    const layerData = useMemo(() => {
        return sortedLayers.map(layer => {
            if (!layer.visible) return null;

            const staticStrokes = activeStrokes.filter(s => !selectedStrokeIds.includes(s.id) && (s.layerId === layer.id || (!s.layerId && layer.order === 0)));
            const transformingStrokes = activeStrokes.filter(s => selectedStrokeIds.includes(s.id) && (s.layerId === layer.id || (!s.layerId && layer.order === 0)));

            const images = localImages.filter(i => i.layerId === layer.id || (!i.layerId && layer.order === 0));
            const texts = localTexts.filter(t => t.layerId === layer.id || (!t.layerId && layer.order === 0));

            return {
                layer,
                staticStrokes,
                transformingStrokes,
                images,
                texts
            };
        });
    }, [sortedLayers, activeStrokes, selectedStrokeIds, localImages, localTexts]);

    // Construct transform string - Standardized logic
    const transformString = useMemo(() => {
        if (!strokeSelectionBounds) return '';
        const { cx, cy } = strokeSelectionBounds;
        const { x: tx, y: ty, scale, rotation } = tempStrokeTransform;

        return `translate(${tx + cx}, ${ty + cy}) rotate(${rotation}) scale(${scale}) translate(${-cx}, ${-cy})`;
    }, [strokeSelectionBounds, tempStrokeTransform]);

    return (
        <>
            {layerData.map((data, idx) => {
                if (!data) return null;
                const { layer, staticStrokes, transformingStrokes, images, texts } = data;

                return (
                    <g key={layer.id || idx} opacity={layer.opacity ?? 1}>
                        {/* Images */}
                        {images.map(img => {
                            const displayOpacity = img.opacity ?? 1;
                            const teacherVisual = img.teacherOnly && isTeacher;
                            return (
                                <g key={img.id} transform={`translate(${img.x},${img.y}) rotate(${img.rotation},${img.width / 2},${img.height / 2})`} opacity={teacherVisual ? displayOpacity * 0.6 : displayOpacity}>
                                    {teacherVisual && <rect width={img.width} height={img.height} fill="none" stroke="#ef4444" strokeWidth={4 / cameraScale} strokeDasharray="8 8" opacity="0.8" />}
                                    <image href={img.url} width={img.width} height={img.height} clipPath={`url(#clip-${img.id})`} />
                                    {selectedId === img.id && isTeacher && <><rect width={img.width} height={img.height} fill="none" stroke="var(--color-primary)" strokeWidth={4 / cameraScale} strokeDasharray="8 8" opacity="0.5" /><circle cx={img.width} cy={img.height} r={12 / cameraScale} fill="white" stroke="var(--color-primary)" strokeWidth={2 / cameraScale} cursor="nwse-resize" data-handle="resize" /><circle cx={img.width / 2} cy={-25 / cameraScale} r={10 / cameraScale} fill="var(--color-primary)" cursor="alias" data-handle="rotate" /></>}
                                </g>
                            );
                        })}

                        {/* Texts */}
                        {texts.map(txt => {
                            if (editingTextId === txt.id) return null;

                            const displayOpacity = txt.opacity ?? 1;
                            const teacherVisual = txt.teacherOnly && isTeacher;
                            const fontFamilyStyle = txt.fontFamily === 'serif' ? 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
                                : txt.fontFamily === 'mono' ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                                    : txt.fontFamily === 'hand' ? '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif'
                                        : txt.fontFamily === 'display' ? 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif'
                                            : txt.fontFamily === 'code' ? 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace'
                                                : txt.fontFamily === 'roboto' ? '"Roboto", sans-serif'
                                                    : txt.fontFamily === 'oswald' ? '"Oswald", sans-serif'
                                                        : txt.fontFamily === 'playfair' ? '"Playfair Display", serif'
                                                            : txt.fontFamily === 'montserrat' ? '"Montserrat", sans-serif'
                                                                : txt.fontFamily === 'pacifico' ? '"Pacifico", cursive'
                                                                    : txt.fontFamily === 'dancing' ? '"Dancing Script", cursive'
                                                                        : txt.fontFamily === 'lobster' ? '"Lobster", cursive'
                                                                            : 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

                            return (
                                <g
                                    key={txt.id}
                                    transform={`translate(${txt.x},${txt.y}) rotate(${txt.rotation},${txt.width / 2},${txt.height / 2})`}
                                    opacity={teacherVisual ? displayOpacity * 0.6 : displayOpacity}
                                    onDoubleClick={(e) => {
                                        if (isTeacher) {
                                            e.stopPropagation();
                                            setEditingTextId(txt.id);
                                            setTool('move');
                                        }
                                    }}
                                    onPointerDown={(e) => {
                                        if (isTeacher && tool === 'text') e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                        if (isTeacher && tool === 'text') {
                                            e.stopPropagation();
                                            setEditingTextId(txt.id);
                                            setTool('move');
                                        }
                                    }}
                                >
                                    {teacherVisual && <rect width={txt.width} height={txt.height} fill="none" stroke="#ef4444" strokeWidth={4 / cameraScale} strokeDasharray="8 8" opacity="0.8" />}

                                    <foreignObject
                                        width={txt.width}
                                        height={txt.height}
                                        style={{ overflow: 'visible', pointerEvents: 'auto' }}
                                    >
                                        <div className="w-full h-full relative group">
                                            {txt.textMode === 'code' ? (
                                                <div 
                                                    className="w-full h-full p-2 rounded-lg shadow-xl overflow-hidden pointer-events-auto"
                                                    style={{ 
                                                        backgroundColor: txt.codeTheme === 'vs' ? '#ffffff' : txt.codeTheme === 'hc-black' ? '#000000' : '#1e1e1e' 
                                                    }}
                                                >
                                                    <Editor
                                                        height="100%"
                                                        width="100%"
                                                        theme={txt.codeTheme || 'vs-dark'}
                                                        value={decodeHtmlIfNeeded(txt.content)}
                                                        language={txt.language || 'javascript'}
                                                        options={{
                                                            readOnly: true,
                                                            domReadOnly: true,
                                                            minimap: { enabled: false },
                                                            fontSize: (txt.fontSize || 14) * Math.max(0.5, Math.min(cameraScale, 2)),
                                                            wordWrap: "on",
                                                            scrollBeyondLastLine: false,
                                                            padding: { top: 12 },
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    className="w-full h-full rounded-lg p-3 border select-text custom-scrollbar"
                                                    style={{
                                                        color: txt.color || 'inherit',
                                                        fontSize: `${txt.fontSize || 16}px`,
                                                        textAlign: txt.textAlign || 'left',
                                                        fontFamily: fontFamilyStyle,
                                                        fontWeight: txt.fontWeight || 'normal',
                                                        fontStyle: txt.fontStyle || 'normal',
                                                        textDecoration: txt.textDecoration || 'none',
                                                        backgroundColor: txt.backgroundColor || 'transparent',
                                                        borderColor: txt.borderColor || 'transparent',
                                                        borderStyle: txt.borderStyle || 'solid',
                                                        borderWidth: (txt.borderColor && txt.borderColor !== 'transparent') ? '2px' : '0px',
                                                        lineHeight: '1.2',
                                                        wordBreak: txt.textMode === 'single' ? 'normal' : 'break-word',
                                                        whiteSpace: txt.textMode === 'single' ? 'nowrap' : 'pre-wrap',
                                                        overflowWrap: txt.textMode === 'single' ? 'normal' : 'break-word',
                                                        overflowY: 'auto',
                                                        overflowX: 'hidden',
                                                        cursor: isTeacher && tool === 'move' ? 'move' : (isTeacher && tool === 'text' ? 'text' : 'default'),
                                                            userSelect: (txt.allowCopy === false) ? 'none' : 'text',
                                                            WebkitUserSelect: (txt.allowCopy === false) ? 'none' : 'text',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: txt.verticalAlign === 'middle' ? 'center' : txt.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start'
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: txt.content }}
                                                />
                                            )}
                                            {txt.allowCopy !== false && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        let textToCopy = txt.content;
                                                        if (txt.textMode !== 'code') {
                                                            const tempDiv = document.createElement("div");
                                                            tempDiv.innerHTML = txt.content;
                                                            textToCopy = tempDiv.innerText || tempDiv.textContent || "";
                                                        }
                                                        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(textToCopy);
                                                        else {
                                                            const ta = document.createElement('textarea');
                                                            ta.value = textToCopy;
                                                            document.body.appendChild(ta);
                                                            ta.select();
                                                            document.execCommand('copy');
                                                            document.body.removeChild(ta);
                                                        }

                                                        const btn = e.currentTarget as HTMLElement;
                                                        const originalColor = btn.style.color;
                                                        btn.style.color = '#10b981'; // temporal green
                                                        setTimeout(() => { btn.style.color = originalColor; }, 1000);
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-md shadow-sm border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary transition-all opacity-40 hover:opacity-100 z-10"
                                                    title="Copiar texto"
                                                >
                                                    <IconClipboardCopy className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </foreignObject>

                                    {selectedId === txt.id && isTeacher && (
                                        <>
                                            <rect width={txt.width} height={txt.height} fill="none" stroke="var(--color-primary)" strokeWidth={4 / cameraScale} strokeDasharray="8 8" pointerEvents="none" />
                                            <circle cx={txt.width} cy={txt.height} r={12 / cameraScale} fill="white" stroke="var(--color-primary)" strokeWidth={2 / cameraScale} cursor="nwse-resize" data-handle="resize" />
                                            <circle cx={txt.width / 2} cy={-25 / cameraScale} r={10 / cameraScale} fill="var(--color-primary)" cursor="alias" data-handle="rotate" />
                                        </>
                                    )}
                                </g>
                            );
                        })}

                        {/* Static Strokes */}
                        {staticStrokes.map(s => <StaticStroke key={s.id} stroke={s} />)}

                        {/* Transformed Strokes */}
                        {transformingStrokes.length > 0 && (
                            <g transform={transformString}>
                                {transformingStrokes.map(s => <StaticStroke key={s.id} stroke={s} />)}
                            </g>
                        )}
                    </g>
                );
            })}
        </>
    );
});
