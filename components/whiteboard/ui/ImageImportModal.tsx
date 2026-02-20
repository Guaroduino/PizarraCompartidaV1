
// File: src/components/whiteboard/ui/ImageImportModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { IconX, IconCrop, IconDropper, IconCheck, IconLasso } from '../../Icons';

interface ImageImportModalProps {
    file: File | Blob;
    onClose: () => void;
    onConfirm: (processedBlob: Blob, teacherOnly: boolean) => void;
    initialTeacherOnly?: boolean; // Nuevo prop opcional
}

export const ImageImportModal: React.FC<ImageImportModalProps> = ({ file, onClose, onConfirm, initialTeacherOnly = false }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [teacherOnly, setTeacherOnly] = useState(initialTeacherOnly); // Inicializar con el valor pasado
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Herramientas
    const [cropTool, setCropTool] = useState<'rect' | 'lasso'>('rect');

    // Estado Rectángulo
    const [crop, setCrop] = useState({ x1: 0, y1: 0, x2: 100, y2: 100 }); 
    const [isDraggingHandle, setIsDraggingHandle] = useState<'tl' | 'br' | null>(null);

    // Estado Lazo
    const [lassoPath, setLassoPath] = useState<{x: number, y: number}[]>([]);
    const [isDrawingLasso, setIsDrawingLasso] = useState(false);

    const [isPickingColor, setIsPickingColor] = useState(false);
    const [transparentColor, setTransparentColor] = useState<{r: number, g: number, b: number} | null>(null);
    const [tolerance, setTolerance] = useState(30);
    const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; 
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
            setImageObj(img);
        };
        img.onerror = () => {
            alert("Error al cargar la imagen. Intente con otro archivo.");
            onClose();
        };
        img.src = url;
        
        return () => {
             URL.revokeObjectURL(url);
        };
    }, [file, onClose]);

    useEffect(() => {
        if (imageObj) {
            renderCanvas();
        }
    }, [imageObj, tolerance, transparentColor, crop, lassoPath, cropTool]);

    const renderCanvas = () => {
        const canvas = canvasRef.current;
        const img = imageObj;
        if (!canvas || !img) return;
        
        if (canvas.width !== img.width || canvas.height !== img.height) {
            canvas.width = img.width;
            canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            // Aplicar vista previa de transparencia
            if (transparentColor) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    if (Math.abs(r - transparentColor.r) < tolerance &&
                        Math.abs(g - transparentColor.g) < tolerance &&
                        Math.abs(b - transparentColor.b) < tolerance) {
                        data[i + 3] = 0; 
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            }

            // Dibujar superposiciones de recorte
            if (cropTool === 'lasso' && lassoPath.length > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(lassoPath[0].x, lassoPath[0].y);
                for (let i = 1; i < lassoPath.length; i++) {
                    ctx.lineTo(lassoPath[i].x, lassoPath[i].y);
                }
                // Cerrar bucle visualmente si estamos dibujando
                if (lassoPath.length > 2) {
                    ctx.lineTo(lassoPath[0].x, lassoPath[0].y);
                }
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#3b82f6'; // Primary color
                ctx.stroke();
                ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
                ctx.fill();
                ctx.restore();
            }
        }
    };

    // Helper para obtener coordenadas relativas a la imagen (pixel real)
    const getImgCoordinates = (e: React.MouseEvent | React.PointerEvent) => {
        if (!canvasRef.current || !imageObj) return null;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        const scaleX = imageObj.width / rect.width;
        const scaleY = imageObj.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);
        return { x, y };
    }

    const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || !imageObj) return;
        
        // 1. Color Picker
        if (isPickingColor) {
            const coords = getImgCoordinates(e);
            if (!coords) return;
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageObj.width;
            tempCanvas.height = imageObj.height;
            const tempCtx = tempCanvas.getContext('2d');
            if(!tempCtx) return;
            tempCtx.drawImage(imageObj, 0, 0);
            const pixel = tempCtx.getImageData(coords.x, coords.y, 1, 1).data;

            setTransparentColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
            setIsPickingColor(false);
            return;
        }

        // 2. Lasso Tool
        if (cropTool === 'lasso') {
            e.currentTarget.setPointerCapture(e.pointerId);
            const coords = getImgCoordinates(e);
            if (coords) {
                setLassoPath([coords]);
                setIsDrawingLasso(true);
            }
        }
    };

    const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (cropTool === 'lasso' && isDrawingLasso) {
            // FIX: Ensure we are actually applying pressure/clicking
            if (e.pointerType === 'mouse' && e.buttons !== 1) {
                setIsDrawingLasso(false);
                return;
            }
            if (e.pointerType === 'pen' && e.pressure === 0) {
                setIsDrawingLasso(false);
                return;
            }

            const coords = getImgCoordinates(e);
            if (coords) {
                setLassoPath(prev => [...prev, coords]);
            }
        }
    };

    const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (cropTool === 'lasso' && isDrawingLasso) {
            setIsDrawingLasso(false);
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    // Rectangular Handles
    const handleHandleDown = (e: React.PointerEvent, corner: 'tl' | 'br') => {
        if (isPickingColor || cropTool !== 'rect') return; 
        e.preventDefault(); e.stopPropagation();
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        setIsDraggingHandle(corner);
    };

    const handleContainerPointerMove = (e: React.PointerEvent) => {
        if (cropTool === 'rect' && isDraggingHandle && canvasRef.current && !isPickingColor) {
            // FIX: Strict check for active dragging to prevent "hover" moves with stylus
            if (e.pointerType === 'mouse' && e.buttons !== 1) {
                setIsDraggingHandle(null);
                return;
            }
            if (e.pointerType === 'pen' && e.pressure === 0) {
                setIsDraggingHandle(null);
                return;
            }

            const rect = canvasRef.current.getBoundingClientRect();
            // Calcular porcentaje relativo al contenedor visual
            const px = ((e.clientX - rect.left) / rect.width) * 100;
            const py = ((e.clientY - rect.top) / rect.height) * 100;

            if (isDraggingHandle === 'tl') {
                setCrop(prev => ({ ...prev, x1: Math.max(0, Math.min(px, prev.x2 - 5)), y1: Math.max(0, Math.min(py, prev.y2 - 5)) }));
            } else {
                setCrop(prev => ({ ...prev, x2: Math.min(100, Math.max(px, prev.x1 + 5)), y2: Math.min(100, Math.max(py, prev.y1 + 5)) }));
            }
        }
    };

    const handleConfirm = () => {
        const img = imageObj;
        if (!img) return;
        setIsProcessing(true);

        // Capture current state values into local variables to use inside the blob callback
        const currentTeacherOnly = teacherOnly;

        // Variables finales de recorte
        let startX = 0, startY = 0, width = img.width, height = img.height;
        let isLasso = cropTool === 'lasso' && lassoPath.length > 2;

        if (isLasso) {
            // Calcular Bounding Box del lazo
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            lassoPath.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x;
                if (p.y > maxY) maxY = p.y;
            });
            startX = Math.max(0, minX);
            startY = Math.max(0, minY);
            width = Math.min(img.width - startX, maxX - minX);
            height = Math.min(img.height - startY, maxY - minY);
        } else if (cropTool === 'rect') {
            startX = (crop.x1 / 100) * img.width;
            startY = (crop.y1 / 100) * img.height;
            width = ((crop.x2 - crop.x1) / 100) * img.width;
            height = ((crop.y2 - crop.y1) / 100) * img.height;
        }

        // Logic de escalado para evitar imágenes gigantes
        const MAX_ASSET_SIZE = 1024;
        let targetW = width;
        let targetH = height;

        if (targetW > MAX_ASSET_SIZE || targetH > MAX_ASSET_SIZE) {
            const ratio = Math.min(MAX_ASSET_SIZE / targetW, MAX_ASSET_SIZE / targetH);
            targetW = Math.round(targetW * ratio);
            targetH = Math.round(targetH * ratio);
        }

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetW;
        finalCanvas.height = targetH;
        const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: true });
        
        if (finalCtx) {
            finalCtx.imageSmoothingEnabled = true;
            finalCtx.imageSmoothingQuality = 'high';

            if (isLasso) {
                // Aplicar máscara de recorte
                finalCtx.save();
                finalCtx.beginPath();
                // Mover el path relativo al nuevo canvas (0,0)
                finalCtx.moveTo(
                    (lassoPath[0].x - startX) * (targetW / width), 
                    (lassoPath[0].y - startY) * (targetH / height)
                );
                for (let i = 1; i < lassoPath.length; i++) {
                    finalCtx.lineTo(
                        (lassoPath[i].x - startX) * (targetW / width), 
                        (lassoPath[i].y - startY) * (targetH / height)
                    );
                }
                finalCtx.closePath();
                finalCtx.clip();
            }

            // Dibujar imagen recortada y escalada
            finalCtx.drawImage(img, startX, startY, width, height, 0, 0, targetW, targetH);
            
            if (isLasso) finalCtx.restore();

            // Aplicar transparencia
            if (transparentColor) {
                const imageData = finalCtx.getImageData(0, 0, targetW, targetH);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    if (Math.abs(r - transparentColor.r) < tolerance &&
                        Math.abs(g - transparentColor.g) < tolerance &&
                        Math.abs(b - transparentColor.b) < tolerance) {
                        data[i + 3] = 0; 
                    }
                }
                finalCtx.putImageData(imageData, 0, 0);
            }

            finalCanvas.toBlob((blob) => {
                if (blob) onConfirm(blob, currentTeacherOnly); // Use the captured variable
                setIsProcessing(false);
            }, 'image/png');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-2 sm:p-6 touch-none overflow-hidden backdrop-blur-md">
            <div className="bg-white dark:bg-dark-card rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white/20">
                <header className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-primary">Editor de Imagen</h2>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">Recorte y Transparencia</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><IconX className="w-6 h-6"/></button>
                </header>
                
                <div 
                    className="flex-1 min-h-0 bg-gray-200 dark:bg-black flex items-center justify-center p-6 relative overflow-y-auto" 
                    onPointerMove={handleContainerPointerMove}
                    onPointerUp={() => setIsDraggingHandle(null)} // Safety release
                    style={{ touchAction: 'none' }} // Crucial for touch behavior
                >
                    <div className="relative shadow-2xl border-4 border-white/10 rounded-xl overflow-visible max-h-full max-w-full flex items-center justify-center">
                        <canvas 
                            ref={canvasRef} 
                            onPointerDown={handleCanvasPointerDown}
                            onPointerMove={handleCanvasPointerMove}
                            onPointerUp={handleCanvasPointerUp}
                            className={`max-w-full max-h-[50vh] object-contain block bg-gray-100 dark:bg-gray-900 rounded-lg ${isPickingColor || cropTool === 'lasso' ? 'cursor-crosshair' : ''} ${isPickingColor ? 'ring-4 ring-primary animate-pulse' : ''}`} 
                            style={{ touchAction: 'none' }}
                        />
                        {!imageObj && <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-bold animate-pulse">Cargando imagen...</div>}
                        
                        {/* Overlay Rectángulo */}
                        {imageObj && !isPickingColor && cropTool === 'rect' && (
                            <>
                                <div className="absolute border-2 border-primary bg-primary/20 pointer-events-none ring-1 ring-white/50" style={{ left: `${crop.x1}%`, top: `${crop.y1}%`, width: `${crop.x2 - crop.x1}%`, height: `${crop.y2 - crop.y1}%` }} />
                                <div onPointerDown={(e) => handleHandleDown(e, 'tl')} className="absolute w-12 h-12 -ml-6 -mt-6 bg-primary rounded-full border-4 border-white shadow-2xl cursor-nwse-resize flex items-center justify-center z-[210] active:scale-125 transition-transform" style={{ left: `${crop.x1}%`, top: `${crop.y1}%`, touchAction: 'none' }}> 
                                    <IconCrop className="w-5 h-5 text-white"/> 
                                </div>
                                <div onPointerDown={(e) => handleHandleDown(e, 'br')} className="absolute w-12 h-12 -ml-6 -mt-6 bg-primary rounded-full border-4 border-white shadow-2xl cursor-nwse-resize flex items-center justify-center z-[210] active:scale-125 transition-transform" style={{ left: `${crop.x2}%`, top: `${crop.y2}%`, touchAction: 'none' }}> 
                                    <IconCrop className="w-5 h-5 text-white"/> 
                                </div>
                            </>
                        )}

                        {isPickingColor && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold pointer-events-none">
                                Toca un color en la imagen
                            </div>
                        )}
                    </div>
                </div>

                <footer className="p-4 border-t flex flex-col gap-4 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            {/* Herramientas de Recorte */}
                            <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg gap-1">
                                <button 
                                    onClick={() => { setCropTool('rect'); setIsPickingColor(false); }}
                                    className={`px-3 py-2 rounded-md flex items-center gap-2 text-xs font-bold ${cropTool === 'rect' && !isPickingColor ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                    title="Recorte Rectangular"
                                >
                                    <IconCrop className="w-4 h-4" /> Rect
                                </button>
                                <button 
                                    onClick={() => { setCropTool('lasso'); setIsPickingColor(false); setLassoPath([]); }}
                                    className={`px-3 py-2 rounded-md flex items-center gap-2 text-xs font-bold ${cropTool === 'lasso' && !isPickingColor ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                    title="Recorte Lazo (Dibujar forma)"
                                >
                                    <IconLasso className="w-4 h-4" /> Lazo
                                </button>
                            </div>

                            {/* Color Transparente */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setIsPickingColor(!isPickingColor)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${isPickingColor ? 'bg-primary text-white scale-105 shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 hover:bg-gray-300'}`}
                                >
                                    <IconDropper className="w-5 h-5"/>
                                    {isPickingColor ? 'Seleccionando...' : 'Transparencia'}
                                </button>
                                {transparentColor && (
                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div className="w-4 h-4 rounded-full border shadow-inner" style={{ backgroundColor: `rgb(${transparentColor.r}, ${transparentColor.g}, ${transparentColor.b})` }} />
                                        <input 
                                            type="range" min="1" max="100" value={tolerance} 
                                            onChange={e => setTolerance(Number(e.target.value))} 
                                            className="w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary" 
                                            title={`Tolerancia: ${tolerance}`}
                                        />
                                        <button onClick={() => {setTransparentColor(null); renderCanvas();}} className="text-[10px] font-black text-red-500 uppercase ml-2">X</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 items-center">
                            <label className="flex items-center gap-2 cursor-pointer group mr-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" 
                                    checked={teacherOnly} 
                                    onChange={e => setTeacherOnly(e.target.checked)}
                                />
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-white select-none">Solo Docente</span> 
                            </label>
                            <button onClick={onClose} className="px-6 py-2 text-[10px] sm:text-xs font-black uppercase bg-gray-200 dark:bg-gray-700 rounded-xl hover:bg-gray-300">Cancelar</button>
                            <button onClick={handleConfirm} disabled={isProcessing} className="px-8 py-2 text-[10px] sm:text-xs font-black uppercase bg-primary text-white rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2"> 
                                {isProcessing ? 'Procesando...' : <><IconCheck className="w-5 h-5"/> Guardar</>} 
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};
