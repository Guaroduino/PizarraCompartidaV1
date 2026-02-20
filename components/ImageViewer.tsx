import React from 'react';
import { IconArrowLeft, IconX } from './Icons';

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-viewer-title"
    >
      <div className="absolute top-4 left-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
          aria-label="Volver a la página anterior"
        >
          <IconArrowLeft className="w-6 h-6" />
          Atrás
        </button>
      </div>
       <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
        aria-label="Cerrar visor de imagen"
      >
        <IconX className="w-7 h-7" />
      </button>

      <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
          <h2 id="image-viewer-title" className="sr-only">Visor de Imagen</h2>
          <img 
            src={imageUrl} 
            alt="Vista a tamaño completo" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
          />
      </div>
    </div>
  );
};

export default ImageViewer;