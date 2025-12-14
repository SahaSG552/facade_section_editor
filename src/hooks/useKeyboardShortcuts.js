import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { undo, redo, canUndo, canRedo } from "../store/slices/historySlice";
import { clearAllBits } from "../store/slices/bitsSlice";
import {
    fitToScale,
    zoomIn,
    zoomOut,
    toggleGrid,
} from "../store/slices/canvasSlice";

const useKeyboardShortcuts = () => {
    const dispatch = useDispatch();
    const canUndoFlag = useSelector(canUndo);
    const canRedoFlag = useSelector(canRedo);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger shortcuts when user is typing in inputs
            if (
                e.target.tagName === "INPUT" ||
                e.target.tagName === "TEXTAREA" ||
                e.target.tagName === "SELECT"
            ) {
                return;
            }

            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            const isShift = e.shiftKey;

            // Undo/Redo shortcuts
            if (isCtrlOrCmd) {
                switch (e.key.toLowerCase()) {
                    case "z":
                        if (!isShift) {
                            e.preventDefault();
                            if (canUndoFlag) {
                                dispatch(undo());
                            }
                        }
                        break;
                    case "y":
                        e.preventDefault();
                        if (canRedoFlag) {
                            dispatch(redo());
                        }
                        break;
                    case "s":
                        e.preventDefault();
                        // TODO: Implement save functionality
                        console.log("Save - TODO");
                        break;
                    case "=":
                    case "+":
                        e.preventDefault();
                        dispatch(zoomIn());
                        break;
                    case "-":
                        e.preventDefault();
                        dispatch(zoomOut());
                        break;
                    case "0":
                        e.preventDefault();
                        dispatch(fitToScale());
                        break;
                    case "g":
                        e.preventDefault();
                        dispatch(toggleGrid());
                        break;
                    default:
                        break;
                }
            }

            // Other shortcuts
            switch (e.key.toLowerCase()) {
                case "delete":
                case "backspace":
                    e.preventDefault();
                    // TODO: Delete selected bits
                    console.log("Delete selected bits - TODO");
                    break;
                case "escape":
                    // TODO: Clear selection
                    console.log("Clear selection - TODO");
                    break;
                default:
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [dispatch, canUndoFlag, canRedoFlag]);

    return null;
};

export default useKeyboardShortcuts;
