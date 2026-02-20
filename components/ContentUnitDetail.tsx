import React from 'react';
import type { ContentUnit, Subtitle } from '../types';
import { IconArrowLeft, IconBook, IconPaperclip } from './Icons';
import { useAppContext } from '../contexts/AppContext';

const SubtitleCard: React.FC<{ subtitle: Subtitle }> = ({ subtitle }) => {
    const { openImageViewer } = useAppContext();
    return (
    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group flex flex-col">
        {subtitle.imageUrl ? (
            <button onClick={() => openImageViewer(subtitle.imageUrl)} className="w-full h-40 overflow-hidden" aria-label={`Ver imagen de ${subtitle.title}`}>
                <img src={subtitle.imageUrl} alt={subtitle.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            </button>
        ) : (
            <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <IconBook className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
        )}
        <div className="p-4 flex-grow flex flex-col">
            <h4 className="text-lg font-semibold text-primary">{subtitle.title}</h4>
            <div
                className="rich-text-content text-gray-600 dark:text-dark-text mt-1 text-sm flex-grow"
                dangerouslySetInnerHTML={{ __html: subtitle.description }}
            />
            {subtitle.attachments && subtitle.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Archivos Adjuntos</h5>
                    <div className="space-y-1">
                        {subtitle.attachments.map((file) => (
                            <a 
                                key={file.url}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                                <IconPaperclip className="w-4 h-4" />
                                <span className="truncate">{file.name}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
)};


interface ContentUnitDetailProps {
    unit: ContentUnit;
    onBack: () => void;
}

const ContentUnitDetail: React.FC<ContentUnitDetailProps> = ({ unit, onBack }) => {
    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <button 
                    onClick={onBack} 
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light"
                >
                    <IconArrowLeft className="w-5 h-5" />
                    Volver a todas las unidades
                </button>
            </div>

            <header className="mb-8 p-6 bg-white dark:bg-dark-card rounded-xl shadow-md">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{unit.title}</h1>
            </header>
            
            <div className="space-y-10">
                {unit.topics.map(topic => (
                    <div key={topic.id}>
                        <h3 className="text-2xl font-semibold mb-4 flex items-center gap-3 text-gray-800 dark:text-gray-200"> 
                            <IconBook className="w-7 h-7 text-secondary"/> 
                            {topic.title}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {topic.subtitles.map(subtitle => (
                                <SubtitleCard key={subtitle.id} subtitle={subtitle} />
                            ))}
                            {topic.subtitles.length === 0 && (
                                <p className="text-gray-500 dark:text-dark-text text-sm md:col-span-2 lg:col-span-3">
                                    No hay subtítulos en este tema.
                                </p>
                            )}
                        </div>
                    </div>
                ))}
                {unit.topics.length === 0 && (
                    <div className="text-center py-10 bg-white dark:bg-dark-card rounded-lg">
                        <p className="text-gray-500 dark:text-dark-text">
                            Esta unidad aún no tiene temas.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentUnitDetail;