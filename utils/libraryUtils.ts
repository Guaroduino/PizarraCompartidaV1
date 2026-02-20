
import type { WhiteboardStroke, WhiteboardImage, WhiteboardText, Point } from '../types';
import { getStroke } from 'perfect-freehand';

// Helper local para generar path data (duplicado ligero para evitar dependencias circulares complejas)
function getSvgPathFromStroke(stroke: number[][]) {
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

/**
 * Normalizes a collection of whiteboard items to position (0,0).
 * Returns the normalized data and the original bounding box center offset.
 */
export const normalizeItems = (
    strokes: WhiteboardStroke[],
    images: WhiteboardImage[],
    texts: WhiteboardText[]
) => {
    // 1. Calculate Global Bounding Box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    strokes.forEach(s => s.points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }));

    images.forEach(i => {
        minX = Math.min(minX, i.x);
        minY = Math.min(minY, i.y);
        maxX = Math.max(maxX, i.x + i.width);
        maxY = Math.max(maxY, i.y + i.height);
    });

    texts.forEach(t => {
        minX = Math.min(minX, t.x);
        minY = Math.min(minY, t.y);
        maxX = Math.max(maxX, t.x + t.width);
        maxY = Math.max(maxY, t.y + t.height);
    });

    if (minX === Infinity) return null; // Empty selection

    // 2. Normalize Data (Shift by minX, minY)
    const normStrokes = strokes.map(s => ({
        ...s,
        points: s.points.map(p => ({ ...p, x: p.x - minX, y: p.y - minY }))
    }));

    const normImages = images.map(i => ({
        ...i, // Spread all properties (URL, etc)
        x: i.x - minX,
        y: i.y - minY
    }));

    const normTexts = texts.map(t => ({
        ...t,
        x: t.x - minX,
        y: t.y - minY
    }));

    return {
        data: { strokes: normStrokes, images: normImages, texts: normTexts },
        width: maxX - minX,
        height: maxY - minY
    };
};

/**
 * Creates SVG snapshot string for thumbnail generation encoded as Data URI
 */
export const generateThumbnailSvg = (data: any, width: number, height: number): string => {
    const padding = 10;
    const viewBox = `${-padding} ${-padding} ${width + padding * 2} ${height + padding * 2}`;
    
    const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">
            <style>
                text { font-family: sans-serif; font-weight: bold; }
            </style>
            <rect x="${-padding}" y="${-padding}" width="${width + padding*2}" height="${height + padding*2}" fill="white"/>
            
            ${data.images.map((i: WhiteboardImage) => 
                // Placeholder for images since we can't easily embed external URLs in a data-uri SVG without CORS issues
                `<g transform="translate(${i.x},${i.y}) rotate(${i.rotation},${i.width/2},${i.height/2})">
                    <rect width="${i.width}" height="${i.height}" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2" stroke-dasharray="4"/>
                    <path d="M${i.width*0.3} ${i.height*0.3} L${i.width*0.5} ${i.height*0.5} L${i.width*0.7} ${i.height*0.3}" stroke="#9ca3af" fill="none"/>
                    <circle cx="${i.width*0.8}" cy="${i.height*0.2}" r="${i.width*0.05}" fill="#9ca3af"/>
                 </g>`
            ).join('')}

            ${data.texts.map((t: WhiteboardText) => 
                `<g transform="translate(${t.x},${t.y}) rotate(${t.rotation},${t.width/2},${t.height/2})">
                    <rect width="${t.width}" height="${t.height}" fill="${t.backgroundColor === 'transparent' ? 'none' : t.backgroundColor}" stroke="${t.borderColor === 'transparent' ? 'none' : t.borderColor}"/>
                    <text x="5" y="${t.height/2 + 5}" font-size="12" fill="${t.color || 'black'}">Aa...</text>
                 </g>`
            ).join('')}

            ${data.strokes.map((s: WhiteboardStroke) => {
                 const strokePath = getStroke(s.points, { size: s.size, ...s.options });
                 const pathData = getSvgPathFromStroke(strokePath);
                 return `<path d="${pathData}" fill="${s.color}" fill-opacity="${s.opacity || 1}"/>`; 
            }).join('')}
        </svg>
    `;

    // Encode to Data URI
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`;
};
