
import { useState } from 'react';
import { doc, updateDoc } from "firebase/firestore";
import { db } from '../services/firebase';
import type { WhiteboardAction } from '../types/whiteboardTypes';

export const useWhiteboardHistory = (setIsSyncing: (val: boolean) => void) => {
    const [history, setHistory] = useState<WhiteboardAction[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [redoStack, setRedoStack] = useState<WhiteboardAction[]>([]);

    const recordAction = (action: WhiteboardAction) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(action);
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setRedoStack([]);
    };

    const undo = async () => {
        if (historyIndex < 0) return;
        const action = history[historyIndex];
        const coll = action.targetType === 'stroke' ? 'whiteboardStrokes' : action.targetType === 'image' ? 'whiteboardImages' : 'whiteboardTexts';
        
        setIsSyncing(true);
        try {
            if (action.type === 'create') await updateDoc(doc(db, coll, action.targetId), { deleted: true });
            else if (action.type === 'delete') await updateDoc(doc(db, coll, action.targetId), { deleted: false });
            else if (action.type === 'update') await updateDoc(doc(db, coll, action.targetId), action.prevData);
            
            setRedoStack(prev => [action, ...prev]);
            setHistoryIndex(historyIndex - 1);
        } catch (e) { console.error(e); } 
        finally { setIsSyncing(false); }
    };

    const redo = async () => {
        if (redoStack.length === 0) return;
        const action = redoStack[0];
        const coll = action.targetType === 'stroke' ? 'whiteboardStrokes' : action.targetType === 'image' ? 'whiteboardImages' : 'whiteboardTexts';
        
        setIsSyncing(true);
        try {
            if (action.type === 'create') await updateDoc(doc(db, coll, action.targetId), { deleted: false });
            else if (action.type === 'delete') await updateDoc(doc(db, coll, action.targetId), { deleted: true });
            else if (action.type === 'update') await updateDoc(doc(db, coll, action.targetId), action.newData);
            
            setRedoStack(redoStack.slice(1));
            setHistoryIndex(historyIndex + 1);
        } catch (e) { console.error(e); } 
        finally { setIsSyncing(false); }
    };

    const clearHistory = () => {
        setHistory([]);
        setHistoryIndex(-1);
        setRedoStack([]);
    };

    return {
        history, historyIndex, redoStack,
        recordAction, undo, redo, clearHistory
    };
};
