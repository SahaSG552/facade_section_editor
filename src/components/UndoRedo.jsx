import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  undo as undoAction,
  redo as redoAction,
  canUndo,
  canRedo,
  saveState,
} from "../store/slices/historySlice";

const UndoRedo = () => {
  const dispatch = useDispatch();
  const historyState = useSelector((state) => state.history);
  const canUndoFlag = useSelector(canUndo);
  const canRedoFlag = useSelector(canRedo);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            if (!e.shiftKey) {
              e.preventDefault();
              if (canUndoFlag) {
                dispatch(undoAction());
              }
            }
            break;
          case 'y':
            e.preventDefault();
            if (canRedoFlag) {
              dispatch(redoAction());
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, canUndoFlag, canRedoFlag]);

  // Auto-save state on changes (this would be enhanced with proper change detection)
  useEffect(() => {
    // Save current state to history when component mounts
    const currentState = {
      canvas: {},
      bits: {},
      timestamp: Date.now(),
    };

    dispatch(saveState(currentState));
  }, [dispatch]);

  const handleUndo = () => {
    if (canUndoFlag) {
      dispatch(undoAction());
    }
  };

  const handleRedo = () => {
    if (canRedoFlag) {
      dispatch(redoAction());
    }
  };

  return (
    <div className="undo-redo-toolbar" style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      zIndex: 1000,
      display: 'flex',
      gap: '5px',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '5px',
    }}>
      <button
        onClick={handleUndo}
        disabled={!canUndoFlag}
        title={`Undo (Ctrl+Z) - ${canUndoFlag ? 'Available' : 'Not available'}`}
        style={{
          padding: '5px 8px',
          border: '1px solid #ccc',
          backgroundColor: canUndoFlag ? '#fff' : '#f5f5f5',
          borderRadius: '3px',
          cursor: canUndoFlag ? 'pointer' : 'not-allowed',
          opacity: canUndoFlag ? 1 : 0.5,
        }}
      >
        ↶ Undo
      </button>

      <button
        onClick={handleRedo}
        disabled={!canRedoFlag}
        title={`Redo (Ctrl+Y) - ${canRedoFlag ? 'Available' : 'Not available'}`}
        style={{
          padding: '5px 8px',
          border: '1px solid #ccc',
          backgroundColor: canRedoFlag ? '#fff' : '#f5f5f5',
          borderRadius: '3px',
          cursor: canRedoFlag ? 'pointer' : 'not-allowed',
          opacity: canRedoFlag ? 1 : 0.5,
        }}
      >
        ↷ Redo
      </button>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        fontSize: '11px',
        color: '#666',
        marginLeft: '10px',
        padding: '0 5px',
      }}>
        History: {historyState.past.length} undo states, {historyState.future.length} redo states
      </div>
    </div>
  );
};

export default UndoRedo;
