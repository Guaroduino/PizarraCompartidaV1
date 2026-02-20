
// File: src/types/whiteboardTypes.ts
import type { StrokeOptions, WhiteboardImage, WhiteboardText, WhiteboardStroke } from '../types';

export interface ExtendedStrokeOptions extends StrokeOptions {
    pressureWeight?: number;
    velocityWeight?: number;
    velocityThreshold?: number;
    pointThrottle?: number;

    // Opciones de Estilo
    filled?: boolean; // Si el relleno está activo
    fillColor?: string; // Color del relleno
    stroked?: boolean; // Si el contorno está activo
    strokeColor?: string; // Color del contorno
    sharpCorners?: boolean;

    // Efectos de Mano Alzada
    roughness?: number; // Irregularidad del contorno (posición X/Y)
    strokeWidthJitter?: number; // Irregularidad del grosor (presión simulada)
    fillRoughness?: number; // Irregularidad/Desplazamiento independiente del relleno

    // Marcador Natural
    isNaturalMarker?: boolean; // Convierte el lápiz en un marcador translúcido con textura
    markerTextureScale?: number; // Controla el baseFrequency de feTurbulence
}

export interface ToolPreset {
    id?: string;
    label?: string;
    color: string; // Color principal (usado para Stroke)
    size: number;
    opacity: number;
    options: ExtendedStrokeOptions;
}

export interface WhiteboardAction {
    type: 'create' | 'delete' | 'update';
    targetType: 'stroke' | 'image' | 'text';
    targetId: string;
    prevData?: any;
    newData?: any;
}

export interface WhiteboardSnapshot {
    id: string;
    name: string;
    teacherId: string;
    timestamp: number;
    content: {
        strokes: any[];
        images: any[];
        texts: any[];
    };
}

export interface ExtendedWhiteboardText extends WhiteboardText {
    // All properties have been moved to WhiteboardText in types.ts
}

export type ToolType = 'pen' | 'eraser' | 'move' | 'hand' | 'text' | 'lasso' | 'line' | 'polyline' | 'circle' | 'arc' | 'rectangle' | 'square' | 'parallelogram';

export type DrawStyle = 'freehand' | 'ink' | 'geometric';
export type ShapeStyle = 'stroke' | 'fill' | 'both'; // Updated logic handles this via booleans

export interface TransformState {
    x: number;
    y: number;
    scale: number;
    rotation: number;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    cx: number;
    cy: number;
}
