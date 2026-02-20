import React, { createContext, useContext } from 'react';

interface AppContextType {
  openImageViewer: (url: string) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext debe ser usado dentro de un AppProvider');
  }
  return context;
};
