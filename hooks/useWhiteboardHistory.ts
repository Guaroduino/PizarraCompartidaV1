import { useState } from 'react';
import { doc, updateDoc, deleteDoc, setDoc, writeBatch } from "firebase/firestore";
import { db } from '../services/firebase';
import type { WhiteboardAction } from '../types/whiteboardTypes';

export const useWhiteboardHistory = (setIsSyncing: (val: boolean) => void) => {
    const [history, setHistory] = useState<WhiteboardAction[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [redoStack, setRedoStack] = useState<WhiteboardAction[][]>([]);

    const recordActionGroup = (actions: WhiteboardAction[]) => {
        if (actions.length === 0) return;
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(actions);
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setRedoStack([]);
    };

    const recordAction = (action: WhiteboardAction) => {
        recordActionGroup([action]);
    };

    const undo = async () => {
        if (historyIndex < 0) return;
        const actions = history[historyIndex];
        
        setIsSyncing(true);
        try {
            const batch = writeBatch(db);
            for (const action of actions) {
                const coll = action.targetType === 'stroke' ? 'whiteboardStrokes' : action.targetType === 'image' ? 'whiteboardImages' : 'whiteboardTexts';
                if (action.type === 'create') batch.delete(doc(db, coll, action.targetId));
                else if (action.type === 'delete') batch.set(doc(db, coll, action.targetId), action.data);
                else if (action.type === 'update') {
                    const { id, ...cleanPrevData } = action.prevData;
                    batch.update(doc(db, coll, action.targetId), cleanPrevData);
                }
            }
            await batch.commit();
            
            setRedoStack(prev => [actions, ...prev]);
            setHistoryIndex(historyIndex - 1);
        } catch (e) { console.error(e); } 
        finally { setIsSyncing(false); }
    };

    const redo = async () => {
        if (redoStack.length === 0) return;
        const actions = redoStack[0];
        
        setIsSyncing(true);
        try {
            const batch = writeBatch(db);
            for (const action of actions) {
                const coll = action.targetType === 'stroke' ? 'whiteboardStrokes' : action.targetType === 'image' ? 'whiteboardImages' : 'whiteboardTexts';
                if (action.type === 'create') batch.set(doc(db, coll, action.targetId), action.data);
                else if (action.type === 'delete') batch.delete(doc(db, coll, action.targetId));
                else if (action.type === 'update') {
                    const { id, ...cleanNewData } = action.newData;
                    batch.update(doc(db, coll, action.targetId), cleanNewData);
                }
            }
            await batch.commit();
            
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
        recordAction, recordActionGroup, undo, redo, clearHistory
    };
};
