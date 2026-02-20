import React from 'react';

interface AccessibilityPanelProps {
  zoomLevel: number;
  onZoomChange: (newLevel: number) => void;
  isHighContrast: boolean;
  onToggleHighContrast: () => void;
}

const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ zoomLevel, onZoomChange, isHighContrast, onToggleHighContrast }) => {
  return (
    <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Opciones de Accesibilidad</h3>
      
      {/* Zoom Controls */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Tamaño del Texto</label>
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
          <button 
            onClick={() => onZoomChange(zoomLevel - 10)} 
            className="px-3 py-1 font-bold text-lg bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
            aria-label="Disminuir tamaño del texto"
          >
            -
          </button>
          <span className="font-mono text-center w-16">{zoomLevel}%</span>
          <button 
            onClick={() => onZoomChange(zoomLevel + 10)} 
            className="px-3 py-1 font-bold text-lg bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
            aria-label="Aumentar tamaño del texto"
          >
            +
          </button>
        </div>
        <button onClick={() => onZoomChange(100)} className="w-full text-center text-xs text-gray-500 hover:text-primary dark:hover:text-primary-light">
          Restablecer
        </button>
      </div>

      <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

      {/* High Contrast Toggle */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Tema</label>
        <label htmlFor="high-contrast-toggle" className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium">Modo de Alto Contraste</span>
          <div className="relative">
            <input 
              type="checkbox" 
              id="high-contrast-toggle" 
              className="sr-only" 
              checked={isHighContrast}
              onChange={onToggleHighContrast}
            />
            <div className={`block w-10 h-6 rounded-full transition ${isHighContrast ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isHighContrast ? 'translate-x-4' : ''}`}></div>
          </div>
        </label>
      </div>
    </div>
  );
};

export default AccessibilityPanel;
