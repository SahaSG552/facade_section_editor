import React from "react";
import { useSelector } from "react-redux";
import Canvas from "./components/Canvas";
import BitsPanel from "./components/BitsPanel";
import OperationsPanel from "./components/OperationsPanel";
import UndoRedo from "./components/UndoRedo";
import useKeyboardShortcuts from "./hooks/useKeyboardShortcuts";
import "./styles/main.css";

const App = () => {
  const canvasState = useSelector((state) => state.canvas);
  const bitsState = useSelector((state) => state.bits);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div id="app">
      {/* Left Panel - Bits Database */}
      <div id="left-panel">
        <h3 id="bits-title">Bits Database</h3>
        <BitsPanel />
      </div>

      {/* Canvas Component */}
      <div style={{ position: 'relative' }}>
        <Canvas />
        <UndoRedo />
      </div>

      {/* Right Menu */}
      <div id="right-menu">
        {/* Part Parameters */}
        <div id="part-params">
          <h3>Part Parameters</h3>
          <label htmlFor="panel-width">Width (mm):</label>
          <input
            type="number"
            id="panel-width"
            value={canvasState.panel.width}
            readOnly
          />
          <label htmlFor="panel-height">Height (mm):</label>
          <input
            type="number"
            id="panel-height"
            value={canvasState.panel.height}
            readOnly
          />
          <label htmlFor="panel-thickness">Thickness (mm):</label>
          <input
            type="number"
            id="panel-thickness"
            value={canvasState.panel.thickness}
            readOnly
          />
          <label htmlFor="panel-anchor">Anchor:</label>
          <button
            id="panel-anchor-btn"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            {canvasState.panel.anchor}
          </button>
        </div>

        {/* Operations Panel */}
        <OperationsPanel />
      </div>
    </div>
  );
};

export default App;
