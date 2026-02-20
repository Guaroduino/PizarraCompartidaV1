
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IconX } from './Icons';

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    onClose?: () => void;
    label?: string;
    opacity?: number; // 0-1
    onOpacityChange?: (opacity: number) => void;
}

// --- HSV / HEX Helpers ---

const hexToHsv = (hex: string) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    }
    r /= 255; g /= 255; b /= 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToHex = (h: number, s: number, v: number) => {
    let r, g, b;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = (v / 100) * (1 - s / 100);
    const q = (v / 100) * (1 - f * s / 100);
    const t = (v / 100) * (1 - (1 - f) * s / 100);
    const val = v / 100;

    switch (i % 6) {
        case 0: r = val; g = t; b = p; break;
        case 1: r = q; g = val; b = p; break;
        case 2: r = p; g = val; b = t; break;
        case 3: r = p; g = q; b = val; break;
        case 4: r = t; g = p; b = val; break;
        case 5: r = val; g = p; b = q; break;
        default: r = 0; g = 0; b = 0;
    }

    const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return "#" + toHex(r) + toHex(g) + toHex(b);
};

const PRESET_COLORS = [
    '#000000', '#ffffff', '#9ca3af', '#4b5563', // Grayscale
    '#ef4444', '#f87171', '#fca5a5', // Red
    '#f59e0b', '#fbbf24', '#fcd34d', // Amber
    '#10b981', '#34d399', '#6ee7b7', // Emerald
    '#3b82f6', '#60a5fa', '#93c5fd', // Blue
    '#8b5cf6', '#a78bfa', '#c4b5fd', // Violet
    '#ec4899', '#f472b6', '#f9a8d4'  // Pink
];

// --- Sub-Components ---

const SaturationValueArea: React.FC<{
    h: number; s: number; v: number;
    onChange: (s: number, v: number) => void;
}> = ({ h, s, v, onChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMove = useCallback((clientX: number, clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

        // HSV Mapping: X = Saturation, Y = 1 - Value (Bright at top, Dark at bottom)
        const newS = x * 100;
        const newV = (1 - y) * 100;
        onChange(newS, newV);
    }, [onChange]);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault(); // Prevent scrolling on mobile
        e.stopPropagation();
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
        handleMove(e.clientX, e.clientY);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            handleMove(e.clientX, e.clientY);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    };

    // Calculate background color purely based on Hue for the base layer
    const baseColor = hsvToHex(h, 100, 100);

    return (
        <div
            ref={containerRef}
            className="w-full h-32 rounded-lg relative overflow-hidden cursor-crosshair shadow-inner touch-none"
            style={{ backgroundColor: baseColor }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }}></div>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000, transparent)' }}></div>
            <div
                className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -ml-2 -mt-2 pointer-events-none"
                style={{
                    left: `${s}%`,
                    top: `${100 - v}%`,
                    backgroundColor: hsvToHex(h, s, v)
                }}
            ></div>
        </div>
    );
};

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onClose, label, opacity, onOpacityChange }) => {
    // Internal state in HSV
    const [hsv, setHsv] = useState({ h: 0, s: 0, v: 0 });
    const [inputHex, setInputHex] = useState(color);

    // Guardar valores iniciales para cancelar
    const initialColor = useRef(color);
    const initialOpacity = useRef(opacity);

    useEffect(() => {
        setHsv(hexToHsv(color));
        setInputHex(color);
    }, [color]);

    const handleSatValChange = (s: number, v: number) => {
        const newHsv = { ...hsv, s, v };
        setHsv(newHsv);
        onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
    };

    const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newH = parseFloat(e.target.value);
        const newHsv = { ...hsv, h: newH };
        setHsv(newHsv);
        onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
    };

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputHex(val);
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            onChange(val);
        }
    };

    const handleCancel = () => {
        onChange(initialColor.current);
        if (onOpacityChange && initialOpacity.current !== undefined) {
            onOpacityChange(initialOpacity.current);
        }
        if (onClose) onClose();
    };

    const handleConfirm = () => {
        if (onClose) onClose();
    };

    return (
        <div
            className="w-64 bg-white dark:bg-dark-card p-3 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 flex flex-col gap-3 relative z-[200]"
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onMouseUp={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
        >
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">{label || 'Color'}</span>
                {onClose && (
                    <button onClick={handleCancel} title="Cancelar cambios">
                        <IconX className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                )}
            </div>

            {/* Saturation/Brightness Area */}
            <SaturationValueArea h={hsv.h} s={hsv.s} v={hsv.v} onChange={handleSatValChange} />

            {/* Controls Row */}
            <div className="flex gap-2 items-center">
                {/* Preview Circle */}
                <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm relative overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNTAgMEg0VjBIMHoiIGZpbGw9IiNjY2MiLz48L3N2Zz4=')" }}></div>
                    <div className="absolute inset-0" style={{ backgroundColor: color, opacity: opacity ?? 1 }}></div>
                </div>

                <div className="flex-grow flex flex-col gap-2">
                    {/* Hue Slider */}
                    <input
                        type="range"
                        min="0" max="360"
                        value={hsv.h}
                        onChange={handleHueChange}
                        className="w-full h-3 rounded-full appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)`
                        }}
                    />

                    {/* Opacity Slider (Optional) */}
                    {opacity !== undefined && onOpacityChange && (
                        <div className="relative h-3 w-full rounded-full overflow-hidden">
                            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNTAgMEg0VjBIMHoiIGZpbGw9IiNjY2MiLz48L3N2Zz4=')" }}></div>
                            <div className="absolute inset-0" style={{ background: `linear-gradient(to right, transparent, ${color})` }}></div>
                            <input
                                type="range"
                                min="0" max="1" step="0.01"
                                value={opacity}
                                onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Hex Input */}
            <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">#</span>
                <input
                    type="text"
                    value={inputHex.replace('#', '')}
                    onChange={handleHexChange}
                    className="w-full pl-5 pr-2 py-1.5 text-xs font-mono border rounded-md bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-600 uppercase focus:ring-1 focus:ring-primary outline-none"
                    maxLength={6}
                />
            </div>

            {/* Preset Grid */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-7 gap-1.5">
                    {PRESET_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => onChange(c)}
                            className={`w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-800' : ''}`}
                            style={{ backgroundColor: c }}
                            title={c}
                        />
                    ))}
                </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-2 mt-1 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                    onClick={handleCancel}
                    className="flex-1 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleConfirm}
                    className="flex-1 py-1.5 text-xs font-bold text-white bg-primary rounded hover:bg-primary-dark transition-colors"
                >
                    Aplicar
                </button>
            </div>
        </div>
    );
};

// Helper Component: Button that opens the ColorPicker
export const ColorPickerButton: React.FC<{
    color: string;
    onChange: (color: string) => void;
    className?: string;
    opacity?: number;
    onOpacityChange?: (opacity: number) => void;
    position?: 'top' | 'bottom';
}> = ({ color, onChange, className, opacity, onOpacityChange, position = 'bottom' }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div className="relative inline-block">
                <button
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    className={`relative overflow-hidden border-2 border-gray-200 dark:border-gray-600 shadow-sm transition-transform active:scale-95 ${className || 'w-8 h-8 rounded-full'}`}
                >
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNTAgMEg0VjBIMHoiIGZpbGw9IiNjY2MiLz48L3N2Zz4=')" }}></div>
                    <div className="absolute inset-0" style={{ backgroundColor: color, opacity: opacity ?? 1 }}></div>
                </button>

                {isOpen && (
                    <div className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 z-[200]`}>
                        <ColorPicker
                            color={color}
                            onChange={onChange}
                            onClose={() => setIsOpen(false)}
                            opacity={opacity}
                            onOpacityChange={onOpacityChange}
                        />
                    </div>
                )}
            </div>

            {/* BACKDROP: Bloquea interacción externa pero NO cierra al hacer clic (evita cierres accidentales con Stylus) */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[199] bg-transparent cursor-default"
                // Se eliminaron onClick y onPointerDown para que el usuario deba usar "Aplicar" o "Cancelar"
                />
            )}
        </>
    );
};
