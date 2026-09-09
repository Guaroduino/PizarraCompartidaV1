import React, { useMemo } from 'react';
import type { Point } from '../../../types';
import type { ToolType, DrawStyle, ExtendedStrokeOptions } from '../../../types/whiteboardTypes';
import { getStroke } from 'perfect-freehand';
import { getSvgPathFromStroke, getSimplePolygonPath, getStrokePath } from '../../../utils/whiteboardUtils';

interface ActiveStrokeLayerProps {
    currentStroke: Point[] | null;
    isTeacher: boolean;
    lassoPoints: Point[] | null;
    tool: ToolType;
    eraserMode: 'freehand' | 'rect' | 'circle';
    cameraScale: number;
    isFilled: boolean;
    isStroked: boolean;
    isSharpTool: boolean;
    fillColor: string;
    color: string;
    size: number;
    opacity: number;
    strokeOpts: ExtendedStrokeOptions;
    drawStyle: DrawStyle;
}

export const ActiveStrokeLayer: React.FC<ActiveStrokeLayerProps> = React.memo(({
    currentStroke,
    isTeacher,
    lassoPoints,
    tool,
    eraserMode,
    cameraScale,
    isFilled,
    isStroked,
    isSharpTool,
    fillColor,
    color,
    size,
    opacity,
    strokeOpts,
    drawStyle,
}) => {
    if (!currentStroke || !isTeacher || lassoPoints) return null;

    if (tool === 'eraser') {
        if (eraserMode === 'rect' && currentStroke.length > 1) {
            const start = currentStroke[0];
            const end = currentStroke[currentStroke.length - 1];
            const minX = Math.min(start.x, end.x);
            const minY = Math.min(start.y, end.y);
            const width = Math.abs(start.x - end.x);
            const height = Math.abs(start.y - end.y);
            return (
                <rect
                    x={minX}
                    y={minY}
                    width={width}
                    height={height}
                    fill="rgba(239, 68, 68, 0.15)"
                    stroke="rgba(239, 68, 68, 0.8)"
                    strokeWidth={2 / cameraScale}
                    strokeDasharray="4 4"
                />
            );
        }
        if (eraserMode === 'circle' && currentStroke.length > 1) {
            const start = currentStroke[0];
            const end = currentStroke[currentStroke.length - 1];
            const radius = Math.hypot(end.x - start.x, end.y - start.y);
            return (
                <circle
                    cx={start.x}
                    cy={start.y}
                    r={radius}
                    fill="rgba(239, 68, 68, 0.15)"
                    stroke="rgba(239, 68, 68, 0.8)"
                    strokeWidth={2 / cameraScale}
                    strokeDasharray="4 4"
                />
            );
        }
    }

    const effectiveFilled = isFilled;
    const effectiveStroked = isStroked || (tool !== 'eraser' && !effectiveFilled);
    const shouldUseLinearPath = isSharpTool;
    const isMarker = tool === 'pen' && strokeOpts.isNaturalMarker;
    const currentMarkerScale = Number(Number(strokeOpts.markerTextureScale ?? 0.1).toFixed(2));

    let liveSimulatePressure = drawStyle === 'ink';
    if (strokeOpts.useStylusPressure !== false) {
        let firstPressure: number | null = null;
        for (let i = 0; i < currentStroke.length; i++) {
            const pr = currentStroke[i].pressure;
            if (pr !== undefined && pr !== 0.5 && pr !== 1.0) {
                if (firstPressure === null) {
                    firstPressure = pr;
                } else if (Math.abs(pr - firstPressure) > 0.01) {
                    liveSimulatePressure = false;
                    break;
                }
            }
        }
    }

    return (
        <g opacity={opacity} style={isMarker ? { mixBlendMode: 'multiply', filter: `url(#marker-texture-${currentMarkerScale})` } : undefined}>
            {effectiveFilled && (
                <path
                    d={getSimplePolygonPath(currentStroke)}
                    fill={fillColor}
                    stroke="none"
                />
            )}

            {effectiveStroked && (
                shouldUseLinearPath ? (
                    <path
                        d={getStrokePath(currentStroke)}
                        fill="none"
                        stroke={color}
                        strokeWidth={size}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ) : (
                    <path
                        d={getSvgPathFromStroke(getStroke(currentStroke, { size, ...strokeOpts, simulatePressure: liveSimulatePressure }))}
                        fill={tool === 'eraser' ? 'rgba(239, 68, 68, 0.4)' : color}
                        fillOpacity={tool === 'eraser' ? 0.4 : 1}
                        className={tool === 'eraser' ? 'animate-pulse' : ''}
                    />
                )
            )}
        </g>
    );
});
