import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  removeBitFromCanvas,
  updateBitPosition,
  updateBitAlignment,
  updateBitOperation,
  updateBitColor,
  moveBit,
} from "../store/slices/bitsSlice";
import { addOperation } from "../store/slices/operationsSlice";
import { saveState } from "../store/slices/historySlice";

const OperationsPanel = () => {
  const dispatch = useDispatch();
  const { bitsOnCanvas } = useSelector((state) => state.bits);
  const { panel } = useSelector((state) => state.canvas);

  // Local state for table editing
  const [editingCell, setEditingCell] = useState(null);
  const [dragSrcRow, setDragSrcRow] = useState(null);

  // Handle bit removal
  const handleDeleteBit = (index) => {
    dispatch(removeBitFromCanvas(index));
    dispatch(addOperation({
      type: "DELETE_BIT",
      description: `Deleted bit at position ${index + 1}`,
      data: { index },
    }));
    // Save state to history
    dispatch(saveState({
      bits: { bitsOnCanvas: bitsOnCanvas.filter((_, i) => i !== index) },
      timestamp: Date.now(),
    }));
  };

  // Handle position update
  const handlePositionChange = (index, axis, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    // Calculate new position relative to anchor
    const anchorOffset = panel.anchor === "top-left" ? { x: 0, y: 0 } : { x: 0, y: panel.thickness };
    const newX = axis === 'x' ? numValue - anchorOffset.x : bitsOnCanvas[index].x;
    const newY = axis === 'y' ? numValue - anchorOffset.y : bitsOnCanvas[index].y;

    dispatch(updateBitPosition({ index, x: newX, y: newY }));
    dispatch(addOperation({
      type: "UPDATE_POSITION",
      description: `Updated bit position (${axis.toUpperCase()}: ${value})`,
      data: { index, axis, value: numValue },
    }));
    // Save state to history
    const updatedBits = [...bitsOnCanvas];
    updatedBits[index] = { ...updatedBits[index], x: newX, y: newY };
    dispatch(saveState({
      bits: { bitsOnCanvas: updatedBits },
      timestamp: Date.now(),
    }));
  };

  // Handle alignment change
  const handleAlignmentChange = (index) => {
    const currentAlignment = bitsOnCanvas[index].alignment;
    const alignments = ['center', 'left', 'right'];
    const currentIndex = alignments.indexOf(currentAlignment);
    const nextIndex = (currentIndex + 1) % alignments.length;
    const newAlignment = alignments[nextIndex];

    dispatch(updateBitAlignment({ index, alignment: newAlignment }));
    dispatch(addOperation({
      type: "UPDATE_ALIGNMENT",
      description: `Changed alignment to ${newAlignment}`,
      data: { index, alignment: newAlignment },
    }));
    // Save state to history
    const updatedBits = [...bitsOnCanvas];
    updatedBits[index] = { ...updatedBits[index], alignment: newAlignment };
    dispatch(saveState({
      bits: { bitsOnCanvas: updatedBits },
      timestamp: Date.now(),
    }));
  };

  // Handle operation change
  const handleOperationChange = (index, operation) => {
    dispatch(updateBitOperation({ index, operation }));
    dispatch(addOperation({
      type: "UPDATE_OPERATION",
      description: `Changed operation to ${operation}`,
      data: { index, operation },
    }));
    // Save state to history
    const updatedBits = [...bitsOnCanvas];
    updatedBits[index] = { ...updatedBits[index], operation };
    dispatch(saveState({
      bits: { bitsOnCanvas: updatedBits },
      timestamp: Date.now(),
    }));
  };

  // Handle color change
  const handleColorChange = (index, color) => {
    dispatch(updateBitColor({ index, color }));
    dispatch(addOperation({
      type: "UPDATE_COLOR",
      description: `Changed color to ${color}`,
      data: { index, color },
    }));
    // Save state to history
    const updatedBits = [...bitsOnCanvas];
    updatedBits[index] = { ...updatedBits[index], color };
    dispatch(saveState({
      bits: { bitsOnCanvas: updatedBits },
      timestamp: Date.now(),
    }));
  };

  // Handle cell editing
  const handleCellEdit = (rowIndex, colIndex, value) => {
    setEditingCell({ rowIndex, colIndex, value });
  };

  const handleCellSave = () => {
    if (!editingCell) return;

    const { rowIndex, colIndex, value } = editingCell;

    // Determine which field is being edited based on column
    switch (colIndex) {
      case 3: // X position
        handlePositionChange(rowIndex, 'x', value);
        break;
      case 4: // Y position
        handlePositionChange(rowIndex, 'y', value);
        break;
    }

    setEditingCell(null);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  // Drag and drop for reordering
  const handleDragStart = (e, index) => {
    setDragSrcRow(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, destIndex) => {
    e.preventDefault();

    if (dragSrcRow !== null && dragSrcRow !== destIndex) {
      // Create new order array
      const newBitsOrder = [...bitsOnCanvas];
      const [movedBit] = newBitsOrder.splice(dragSrcRow, 1);
      newBitsOrder.splice(destIndex, 0, movedBit);

      // Renumber bits
      newBitsOrder.forEach((bit, i) => {
        bit.number = i + 1;
      });

      dispatch(moveBit({ fromIndex: dragSrcRow, toIndex: destIndex }));
      dispatch(addOperation({
        type: "MOVE_BIT",
        description: `Moved bit from position ${dragSrcRow + 1} to ${destIndex + 1}`,
        data: { fromIndex: dragSrcRow, toIndex: destIndex },
      }));

      // Save state to history
      dispatch(saveState({
        bits: { bitsOnCanvas: newBitsOrder },
        timestamp: Date.now(),
      }));
    }

    setDragSrcRow(null);
  };

  // Calculate anchor-relative coordinates for display
  const getDisplayCoordinates = (bit) => {
    const anchorOffset = panel.anchor === "top-left" ? { x: 0, y: 0 } : { x: 0, y: panel.thickness };
    return {
      x: (bit.x + anchorOffset.x).toFixed(2),
      y: (bit.y + anchorOffset.y).toFixed(2),
    };
  };

  // Operations data
  const operations = [
    { value: "AL", label: "Profile Along" },
    { value: "OU", label: "Profile Outside" },
    { value: "IN", label: "Profile Inside" },
    { value: "PO", label: "Pocketing" },
    { value: "VC", label: "V-Carve" },
    { value: "RE", label: "Re-Machining" },
    { value: "TS", label: "T-Slotting" },
    { value: "DR", label: "Drill" },
  ];

  return (
    <div id="operations">
      <div id="operations-header">
        <h3>Operations</h3>
        <div id="operations-toolbar">
          <button id="save-btn" title="Save current bit positions">
            Save
          </button>
          <button id="save-as-btn" title="Save bit positions to JSON file">
            Save As
          </button>
          <button id="load-btn" title="Load bit positions from JSON file">
            Load
          </button>
          <button id="clear-btn" title="Clear all bits from canvas">
            Clear
          </button>
        </div>
      </div>

      <div id="operations-log">
        <div>Operations log - {bitsOnCanvas.length} bits on canvas</div>
      </div>

      {/* Bits Sheet Table */}
      <table>
        <thead>
          <tr>
            <th></th>
            <th style={{ textAlign: "center" }}>№</th>
            <th style={{ textAlign: "center" }}>Name</th>
            <th style={{ textAlign: "center" }}>X</th>
            <th style={{ textAlign: "center" }}>Y</th>
            <th style={{ textAlign: "center" }}>Al</th>
            <th style={{ textAlign: "center" }}>OP</th>
            <th style={{ textAlign: "center" }}>Col</th>
            <th style={{ textAlign: "center" }}>Del</th>
          </tr>
        </thead>
        <tbody id="bits-sheet-body">
          {bitsOnCanvas.length === 0 ? (
            <tr>
              <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>
                No bits on canvas. Drag bits from the left panel to get started.
              </td>
            </tr>
          ) : (
            bitsOnCanvas.map((bit, index) => {
              const coords = getDisplayCoordinates(bit);
              const isEditingX = editingCell?.rowIndex === index && editingCell?.colIndex === 3;
              const isEditingY = editingCell?.rowIndex === index && editingCell?.colIndex === 4;

              return (
                <tr
                  key={bit.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  {/* Drag handle */}
                  <td style={{ cursor: "grab", textAlign: "center" }}>☰</td>

                  {/* Number */}
                  <td style={{ textAlign: "center" }}>{bit.number}</td>

                  {/* Name */}
                  <td style={{ textAlign: "center" }}>{bit.name}</td>

                  {/* X Position */}
                  <td style={{ textAlign: "center" }}>
                    {isEditingX ? (
                      <input
                        type="text"
                        value={editingCell.value}
                        onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCellSave();
                          if (e.key === 'Escape') handleCellCancel();
                        }}
                        autoFocus
                        style={{ width: "60px", textAlign: "center" }}
                      />
                    ) : (
                      <span
                        onClick={() => handleCellEdit(index, 3, coords.x)}
                        style={{ cursor: "pointer", display: "inline-block", width: "60px" }}
                      >
                        {coords.x}
                      </span>
                    )}
                  </td>

                  {/* Y Position */}
                  <td style={{ textAlign: "center" }}>
                    {isEditingY ? (
                      <input
                        type="text"
                        value={editingCell.value}
                        onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                        onBlur={handleCellSave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCellSave();
                          if (e.key === 'Escape') handleCellCancel();
                        }}
                        autoFocus
                        style={{ width: "60px", textAlign: "center" }}
                      />
                    ) : (
                      <span
                        onClick={() => handleCellEdit(index, 4, coords.y)}
                        style={{ cursor: "pointer", display: "inline-block", width: "60px" }}
                      >
                        {coords.y}
                      </span>
                    )}
                  </td>

                  {/* Alignment */}
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleAlignmentChange(index)}
                      style={{
                        padding: "2px 6px",
                        cursor: "pointer",
                        minWidth: "40px"
                      }}
                    >
                      {bit.alignment || 'center'}
                    </button>
                  </td>

                  {/* Operation */}
                  <td style={{ textAlign: "center" }}>
                    <select
                      value={bit.operation || 'AL'}
                      onChange={(e) => handleOperationChange(index, e.target.value)}
                      style={{ width: "100px", fontSize: "11px" }}
                    >
                      {operations.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Color */}
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="color"
                      value={bit.color || '#cccccc'}
                      onChange={(e) => handleColorChange(index, e.target.value)}
                      style={{
                        width: "30px",
                        height: "20px",
                        border: "none",
                        cursor: "pointer"
                      }}
                    />
                  </td>

                  {/* Delete */}
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleDeleteBit(index)}
                      style={{
                        padding: "2px 6px",
                        cursor: "pointer",
                        color: "#d00",
                        fontSize: "14px"
                      }}
                      title="Delete bit"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OperationsPanel;
