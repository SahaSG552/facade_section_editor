import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getBits } from "../data/bitsStore";
import { setAvailableBits, addBitToCanvas } from "../store/slices/bitsSlice";
import { evaluateMathExpression } from "../utils/utils";
import { createBitIconJSX } from "../utils/bitShapes";
import BitModal from "./BitModal";

const BitsPanel = () => {
  const dispatch = useDispatch();
  const [bitsGroups, setBitsGroups] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    bitGroup: null,
    bit: null,
  });

  // Redux state
  const canvasState = useSelector((state) => state.canvas);

  // Load bits database on component mount
  useEffect(() => {
    const loadBitsDatabase = async () => {
      try {
        const bitsData = await getBits();
        setBitsGroups(bitsData);
        dispatch(setAvailableBits(bitsData));
      } catch (error) {
        console.error("Failed to load bits database:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBitsDatabase();
  }, [dispatch]);

  // Handle bit drag start
  const handleDragStart = (e, bit, groupName) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      bit,
      groupName,
      type: "bit"
    }));
    e.dataTransfer.effectAllowed = "copy";
  };

  // Handle export/import buttons
  const handleExportBits = () => {
    // TODO: Implement export functionality
    console.log("Export bits - TODO");
  };

  const handleImportBits = () => {
    // TODO: Implement import functionality
    console.log("Import bits - TODO");
  };

  // Modal handlers
  const openCreateModal = (groupName) => {
    setModalState({
      isOpen: true,
      bitGroup: groupName,
      bit: null,
    });
  };

  const openEditModal = (bit, groupName) => {
    setModalState({
      isOpen: true,
      bitGroup: groupName,
      bit: bit,
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      bitGroup: null,
      bit: null,
    });
  };

  const handleModalSave = () => {
    // Refresh bits database after save
    const loadBitsDatabase = async () => {
      try {
        const bitsData = await getBits();
        setBitsGroups(bitsData);
        dispatch(setAvailableBits(bitsData));
      } catch (error) {
        console.error("Failed to reload bits database:", error);
      }
    };
    loadBitsDatabase();
  };

  if (loading) {
    return (
      <div id="bit-groups">
        <div style={{ padding: "20px", textAlign: "center" }}>
          Loading bits database...
        </div>
      </div>
    );
  }

  return (
    <>
      <div id="bits-actions">
        <button
          id="export-bits-btn"
          title="Export bits to JSON file"
          onClick={handleExportBits}
        >
          Exp
        </button>
        <button
          id="import-bits-btn"
          title="Import bits from JSON file"
          onClick={handleImportBits}
        >
          Imp
        </button>
      </div>

      <div id="bit-groups">
        {Object.entries(bitsGroups).map(([groupName, bits]) => (
          <BitGroup
            key={groupName}
            groupName={groupName}
            bits={bits}
            onDragStart={handleDragStart}
            onCreateBit={openCreateModal}
            onEditBit={openEditModal}
          />
        ))}
      </div>

      {/* Bit Modal */}
      <BitModal
        bitGroup={modalState.bitGroup}
        bit={modalState.bit}
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSave={handleModalSave}
      />
    </>
  );
};

// Bit Group Component
const BitGroup = ({ groupName, bits, onDragStart, onCreateBit, onEditBit }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Sort bits by diameter, then length
  const sortedBits = [...bits].sort((a, b) => {
    const d = (a.diameter || 0) - (b.diameter || 0);
    if (d !== 0) return d;
    return (a.length || 0) - (b.length || 0);
  });

  return (
    <div className="bit-group">
      <div
        className="bit-group-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          cursor: "pointer",
          padding: "8px",
          backgroundColor: "#f0f0f0",
          borderBottom: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <span style={{ fontWeight: "bold", textTransform: "capitalize" }}>
          {groupName}
        </span>
        <span>{isExpanded ? "▼" : "▶"}</span>
      </div>

      {isExpanded && (
        <div className="bit-list" style={{ display: "flex", flexDirection: "column" }}>
          {/* New Bit Button */}
          <div
            className="bit add-bit"
            onClick={() => onCreateBit(groupName)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px",
              borderBottom: "1px solid #eee",
              cursor: "pointer",
              backgroundColor: "#f9f9f9",
              fontStyle: "italic",
              color: "#666"
            }}
          >
            <div style={{ marginRight: "8px" }}>
              <BitIcon bit={{}} groupName="newBit" size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: "bold", fontSize: "12px" }}>New {groupName} bit</div>
              <div style={{ fontSize: "10px" }}>Click to create</div>
            </div>
          </div>

          {/* Existing Bits */}
          {sortedBits.map((bit) => (
            <BitItem
              key={bit.id}
              bit={bit}
              groupName={groupName}
              onDragStart={onDragStart}
              onEditBit={onEditBit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Individual Bit Item Component
const BitItem = ({ bit, groupName, onDragStart, onEditBit }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="bit"
      draggable
      onDragStart={(e) => onDragStart(e, bit, groupName)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px",
        borderBottom: "1px solid #eee",
        cursor: "grab",
        position: "relative"
      }}
    >
      {/* Bit Icon */}
      <div style={{ marginRight: "8px" }}>
        <BitIcon bit={bit} groupName={groupName} size={32} />
      </div>

      {/* Bit Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: "bold", fontSize: "12px" }}>{bit.name}</div>
        <div style={{ fontSize: "10px", color: "#666" }}>
          Ø{bit.diameter}mm × {bit.length}mm
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div
          className="action-icons"
          style={{
            display: "flex",
            gap: "2px",
            position: "absolute",
            right: "8px"
          }}
        >
          <button
            title="Edit bit"
            style={{
              padding: "2px 4px",
              fontSize: "10px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              cursor: "pointer"
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEditBit(bit, groupName);
            }}
          >
            ✏️
          </button>
          <button
            title="Copy bit"
            style={{
              padding: "2px 4px",
              fontSize: "10px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              cursor: "pointer"
            }}
            onClick={(e) => {
              e.stopPropagation();
              console.log("Copy bit:", bit.name);
            }}
          >
            📋
          </button>
          <button
            title="Delete bit"
            style={{
              padding: "2px 4px",
              fontSize: "10px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              cursor: "pointer",
              color: "#d00"
            }}
            onClick={(e) => {
              e.stopPropagation();
              console.log("Delete bit:", bit.name);
            }}
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};

// Bit Icon Component - uses shared bitShapes utility
const BitIcon = ({ bit, groupName, size = 40 }) => {
  return createBitIconJSX(bit, groupName, size);
};

export default BitsPanel;
