
// File: src/utils/whiteboardUtils.ts
import { getStroke } from 'perfect-freehand';
import type { Point, WhiteboardStroke } from '../types';
import type { ToolPreset, ExtendedStrokeOptions } from '../types/whiteboardTypes';

// Constants
export const BG_COLORS = [
    { name: 'Blanco', value: '#ffffff' },
    { name: 'Oscuro', value: '#121212' },
    { name: 'Técnico', value: '#1e293b' },
    { name: 'Papel', value: '#fdf6e3' },
    { name: 'Cuadrícula', value: '#f0f0f0' }
];

export const QUICK_COLORS = ['#000000', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

export const DEFAULT_PRESETS: ToolPreset[] = [
    { 
        id: 'p1',
        label: 'Bolígrafo',
        color: '#000000', 
        size: 3, 
        opacity: 1, 
        options: { thinning: 0.5, smoothing: 0.5, streamline: 0.5, simulatePressure: true, pressureWeight: 0.5, velocityWeight: 0.5, velocityThreshold: 20, pointThrottle: 2, filled: false, stroked: true, roughness: 0, strokeWidthJitter: 0, fillRoughness: 0 } 
    },
    { 
        id: 'p2',
        label: 'Rotulador',
        color: '#3b82f6', 
        size: 6, 
        opacity: 1, 
        options: { thinning: 0.1, smoothing: 0.5, streamline: 0.6, simulatePressure: false, pressureWeight: 0.2, velocityWeight: 0.1, velocityThreshold: 20, pointThrottle: 3, filled: false, stroked: true, roughness: 0, strokeWidthJitter: 0, fillRoughness: 0 } 
    },
    { 
        id: 'p3',
        label: 'Resaltador',
        color: '#f59e0b', 
        size: 16, 
        opacity: 0.4, 
        options: { thinning: -0.6, smoothing: 0.7, streamline: 0.4, simulatePressure: false, pressureWeight: 0.1, velocityWeight: 0, velocityThreshold: 20, pointThrottle: 5, filled: false, stroked: true, roughness: 0, strokeWidthJitter: 0, fillRoughness: 0 } 
    },
    { 
        id: 'p4',
        label: 'Lápiz',
        color: '#ef4444', 
        size: 2, 
        opacity: 0.9, 
        options: { thinning: 0.7, smoothing: 0.3, streamline: 0.4, simulatePressure: true, pressureWeight: 0.8, velocityWeight: 0.5, velocityThreshold: 8, pointThrottle: 1, filled: false, stroked: true, roughness: 2, strokeWidthJitter: 0.5, fillRoughness: 0 } 
    },
];

// Helper: Point in Polygon
export const isPointInPolygon = (point: Point, vs: Point[]) => {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y;
        let xj = vs[j].x, yj = vs[j].y;
        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

// Helper: Bounding Box
export const getBoundingBox = (strokes: WhiteboardStroke[]) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    if (strokes.length === 0) return null;
    strokes.forEach(s => s.points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
};

export const resizeImage = (file: File | Blob, maxDimension: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
                const ratio = Math.min(maxDimension / width, maxDimension / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // High quality scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Canvas conversion failed"));
                }, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
            } else {
                reject(new Error("Could not get canvas context"));
            }
            URL.revokeObjectURL(img.src);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(img.src);
            reject(err);
        }
    });
};

export function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );
  d.push("Z");
  return d.join(" ");
}

// Generate simple polygon path data for filling shapes (closes the loop)
export function getSimplePolygonPath(points: Point[]) {
    if (points.length < 2) return "";
    return `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
}

// Generate simple path for stroke-based geometric shapes (Open path)
export function getStrokePath(points: Point[]) {
    if (points.length < 2) return "";
    return `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
}

// NUEVO: Generar path usando líneas rectas para mantener esquinas afiladas (outline method)
export function getLinearPathFromStroke(stroke: number[][]) {
    if (!stroke.length) return "";
    const d = [`M`, stroke[0][0], stroke[0][1]];
    for (let i = 1; i < stroke.length; i++) {
        d.push(`L`, stroke[i][0], stroke[i][1]);
    }
    d.push("Z");
    return d.join(" ");
}

// --- Geometry Helpers for Freehand Simulation ---

const jitter = (val: number, amount: number) => {
    if (!amount) return val;
    return val + (Math.random() - 0.5) * amount * 2; // +/- amount
};

const pressureJitter = (base: number, amount: number) => {
    if (!amount) return base;
    // Varía la presión base +/- el monto
    return Math.max(0.1, Math.min(1.5, base + (Math.random() - 0.5) * amount));
};

export const getLinePoints = (p1: Point, p2: Point, options?: ExtendedStrokeOptions, steps = 20): Point[] => {
    const points: Point[] = [];
    const roughness = options?.roughness || 0;
    const widthJitter = options?.strokeWidthJitter || 0;
    
    // Start point
    points.push({ x: p1.x, y: p1.y, pressure: 0.5 });

    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        points.push({
            x: jitter(p1.x + (p2.x - p1.x) * t, roughness),
            y: jitter(p1.y + (p2.y - p1.y) * t, roughness),
            pressure: pressureJitter(0.5, widthJitter)
        });
    }
    
    // End point
    points.push({ x: p2.x, y: p2.y, pressure: 0.5 });
    return points;
};

export const getCirclePoints = (center: Point, radius: Point, options?: ExtendedStrokeOptions, steps = 60): Point[] => {
    const r = Math.hypot(radius.x - center.x, radius.y - center.y);
    const points: Point[] = [];
    const roughness = options?.roughness || 0;
    const widthJitter = options?.strokeWidthJitter || 0;

    for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * 2 * Math.PI;
        const currentR = jitter(r, roughness);
        points.push({
            x: jitter(center.x + currentR * Math.cos(theta), roughness * 0.2), 
            y: jitter(center.y + currentR * Math.sin(theta), roughness * 0.2),
            pressure: pressureJitter(0.5, widthJitter)
        });
    }
    return points;
};

export const getArcPoints = (start: Point, end: Point, control: Point, options?: ExtendedStrokeOptions, steps = 40): Point[] => {
    const points: Point[] = [];
    const roughness = options?.roughness || 0;
    const widthJitter = options?.strokeWidthJitter || 0;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const invT = 1 - t;
        const x = invT * invT * start.x + 2 * invT * t * control.x + t * t * end.x;
        const y = invT * invT * start.y + 2 * invT * t * control.y + t * t * end.y;
        points.push({ 
            x: jitter(x, roughness), 
            y: jitter(y, roughness), 
            pressure: pressureJitter(0.5, widthJitter) 
        });
    }
    return points;
};

export const getRectanglePoints = (start: Point, end: Point, options?: ExtendedStrokeOptions): Point[] => {
    // Reuse line generator
    const generateSide = (p1: Point, p2: Point) => getLinePoints(p1, p2, options, 10).slice(0, -1);

    const p1 = { x: start.x, y: start.y, pressure: 0.5 };
    const p2 = { x: end.x, y: start.y, pressure: 0.5 };
    const p3 = { x: end.x, y: end.y, pressure: 0.5 };
    const p4 = { x: start.x, y: end.y, pressure: 0.5 };

    return [
        ...generateSide(p1, p2),
        ...generateSide(p2, p3),
        ...generateSide(p3, p4),
        ...generateSide(p4, p1),
        { x: start.x, y: start.y, pressure: 0.5 } 
    ];
};

export const getSquarePoints = (start: Point, end: Point, options?: ExtendedStrokeOptions): Point[] => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    const signX = Math.sign(dx) || 1;
    const signY = Math.sign(dy) || 1;
    
    const finalX = start.x + size * signX;
    const finalY = start.y + size * signY;

    return getRectanglePoints(start, { x: finalX, y: finalY, pressure: 0.5 }, options);
};

export const getParallelogramPoints = (start: Point, end: Point, options?: ExtendedStrokeOptions): Point[] => {
    const width = end.x - start.x;
    const skew = width * 0.2; 
    
    const generateSide = (p1: Point, p2: Point) => getLinePoints(p1, p2, options, 10).slice(0, -1);

    const p1 = { x: start.x + skew, y: start.y, pressure: 0.5 };
    const p2 = { x: end.x, y: start.y, pressure: 0.5 };
    const p3 = { x: end.x - skew, y: end.y, pressure: 0.5 };
    const p4 = { x: start.x, y: end.y, pressure: 0.5 };

    return [
        ...generateSide(p1, p2),
        ...generateSide(p2, p3),
        ...generateSide(p3, p4),
        ...generateSide(p4, p1),
        { x: p1.x, y: p1.y, pressure: 0.5 }
    ];
};
