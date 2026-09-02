
// File: src/components/whiteboard/ui/StaticStroke.tsx
import React, { useMemo } from 'react';
import type { WhiteboardStroke, Point } from '../../../types';
import type { ExtendedStrokeOptions } from '../../../types/whiteboardTypes';
import { getStroke } from 'perfect-freehand';
import { getSvgPathFromStroke, getSimplePolygonPath, getStrokePath } from '../../../utils/whiteboardUtils';

// Función de comparación profunda para evitar re-renders si la data visual no cambia
const arePropsEqual = (prevProps: { stroke: WhiteboardStroke & { cachedPath?: string } }, nextProps: { stroke: WhiteboardStroke & { cachedPath?: string } }) => {
    const p = prevProps.stroke;
    const n = nextProps.stroke;

    // Cast to ExtendedStrokeOptions to access custom properties
    const pOptions = p.options as ExtendedStrokeOptions | undefined;
    const nOptions = n.options as ExtendedStrokeOptions | undefined;

    return (
        p.id === n.id &&
        p.cachedPath === n.cachedPath &&
        p.points.length === n.points.length &&
        (p.points.length === 0 || (
            p.points[0]?.x === n.points[0]?.x &&
            p.points[0]?.y === n.points[0]?.y &&
            p.points[p.points.length - 1]?.x === n.points[n.points.length - 1]?.x &&
            p.points[p.points.length - 1]?.y === n.points[n.points.length - 1]?.y
        )) &&
        p.color === n.color &&
        p.size === n.size &&
        p.opacity === n.opacity &&
        p.deleted === n.deleted &&
        // Comparamos opciones críticas visuales
        pOptions?.smoothing === nOptions?.smoothing &&
        pOptions?.thinning === nOptions?.thinning &&
        pOptions?.streamline === nOptions?.streamline &&
        pOptions?.filled === nOptions?.filled &&
        pOptions?.fillColor === nOptions?.fillColor && // Check fill color
        pOptions?.stroked === nOptions?.stroked && // Check stroke status
        pOptions?.sharpCorners === nOptions?.sharpCorners &&
        pOptions?.roughness === nOptions?.roughness && // Check roughness
        pOptions?.strokeWidthJitter === nOptions?.strokeWidthJitter && // Check width jitter
        pOptions?.fillRoughness === nOptions?.fillRoughness && // Check fill roughness
        pOptions?.simulatePressure === nOptions?.simulatePressure &&
        pOptions?.useStylusPressure === nOptions?.useStylusPressure &&
        pOptions?.useVelocityDynamics === nOptions?.useVelocityDynamics &&
        pOptions?.isNaturalMarker === nOptions?.isNaturalMarker &&
        pOptions?.markerTextureScale === nOptions?.markerTextureScale // Check fill roughness
    );
};

// Generador de números pseudo-aleatorios determinista basado en el ID
const pseudoRandom = (seedStr: string) => {
    let hash = 0;
    if (seedStr.length === 0) return 0;
    for (let i = 0; i < seedStr.length; i++) {
        const char = seedStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(Math.sin(hash) * 10000) % 1;
};

// Caché en memoria para evitar recalcular SVG paths de trazos recibidos por red
const globalPathCache = new Map<string, string>();

export const StaticStroke = React.memo(({ stroke }: { stroke: WhiteboardStroke & { cachedPath?: string } }) => {
    const options = stroke.options as ExtendedStrokeOptions | undefined;
    const isFilled = options?.filled ?? false;
    const isStroked = options?.stroked ?? true; // Default to stroked if undefined
    const isSharp = options?.sharpCorners;
    const fillColor = options?.fillColor || stroke.color;

    const fillRoughness = options?.fillRoughness || 0;

    // 1. Calculate Fill Path (Polygon closed loop)
    const fillPathData = useMemo(() => {
        if (!isFilled) return '';

        let fillPoints = stroke.points;

        // If Fill Roughness is active, displace the fill points separately from the stroke
        if (fillRoughness > 0) {
            // Seed base for consistent randomness per stroke
            const baseSeed = pseudoRandom(stroke.id);

            fillPoints = stroke.points.map((p, i) => {
                const seedX = baseSeed + i * 0.1;
                const seedY = baseSeed + i * 0.2;
                const offsetX = (Math.sin(seedX * 100) * fillRoughness); // Deterministic noise
                const offsetY = (Math.cos(seedY * 100) * fillRoughness);
                return { x: p.x + offsetX, y: p.y + offsetY, pressure: p.pressure };
            });
        }

        return getSimplePolygonPath(fillPoints);
    }, [stroke.points, isFilled, fillRoughness, stroke.id]);

    // 2. Calculate Stroke Path (con caché en memoria O(1))
    const strokePathData = useMemo(() => {
        if (!isStroked) return '';
        if (stroke.cachedPath && !options?.strokeWidthJitter) return stroke.cachedPath;
        if (stroke.id && globalPathCache.has(stroke.id) && !options?.strokeWidthJitter) {
            return globalPathCache.get(stroke.id)!;
        }

        let path = '';
        // Geometric Outline (Constant Thickness)
        if (isSharp) {
            path = getStrokePath(stroke.points);
        } else {
            // Ink Stroke (Variable Thickness) - Perfect Freehand
            let finalSimulatePressure = options?.simulatePressure ?? true;
            if (options?.useStylusPressure !== false) {
                const uniquePressures = new Set(stroke.points.map(p => p.pressure).filter(p => p !== undefined && p !== 0.5 && p !== 1.0));
                if (uniquePressures.size > 1) {
                    finalSimulatePressure = false;
                }
            }

            const strokeOptions = {
                size: stroke.size,
                ...stroke.options,
                simulatePressure: finalSimulatePressure
            };
            const outlinePoints = getStroke(stroke.points, strokeOptions);
            path = getSvgPathFromStroke(outlinePoints);
        }

        if (stroke.id && path) {
            if (globalPathCache.size > 3000) globalPathCache.clear();
            globalPathCache.set(stroke.id, path);
        }
        return path;
    }, [stroke.id, stroke.points, stroke.size, stroke.options, stroke.cachedPath, isSharp, isStroked]);

    if (!isFilled && !isStroked) return null;

    // Marcador Natural check - support legacy 'marker' type and new 'isNaturalMarker' option
    const isMarker = stroke.type === 'marker' || (stroke.options as ExtendedStrokeOptions)?.isNaturalMarker;
    const currentMarkerScale = (stroke.options as ExtendedStrokeOptions)?.markerTextureScale ?? 0.1;

    // Apply global offset to fill for "loose" feel if roughness is high
    const fillTransform = fillRoughness > 0
        ? `translate(${pseudoRandom(stroke.id + 'x') * fillRoughness - fillRoughness / 2}, ${pseudoRandom(stroke.id + 'y') * fillRoughness - fillRoughness / 2})`
        : undefined;

    return (
        <g opacity={stroke.opacity ?? 1} style={isMarker ? { mixBlendMode: 'multiply', filter: `url(#marker-texture-${currentMarkerScale}), url(#marker-texture)` } : undefined}>
            {/* Fill Layer */}
            {isFilled && (
                <path
                    d={fillPathData}
                    fill={fillColor}
                    stroke="none"
                    transform={fillTransform}
                />
            )}

            {/* Stroke Layer */}
            {isStroked && (
                isSharp ? (
                    <path
                        d={strokePathData}
                        fill="none"
                        stroke={stroke.color}
                        strokeWidth={stroke.size}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ) : (
                    // Freehand stroke is actually a filled polygon representing the ink
                    <path
                        d={strokePathData}
                        fill={stroke.color}
                        stroke="none"
                    />
                )
            )}
        </g>
    );
}, arePropsEqual);
