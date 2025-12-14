import React, { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { addBit, updateBit } from "../data/bitsStore";
import { updateAvailableBit } from "../store/slices/bitsSlice";
import { evaluateMathExpression } from "../utils/utils";
import { createBitShape } from "../utils/bitShapes";
import CanvasManager from "../canvas/CanvasManager";

const BitModal = ({ bitGroup, bit, isOpen, onClose, onSave }) => {
  const dispatch = useDispatch();

  // Modal state
  const [formData, setFormData] = useState({
    name: "",
    diameter: "",
    length: "",
    angle: "",
    height: "",
    cornerRadius: "",
    flat: "",
    color: "#cccccc",
    toolNumber: 1,
  });

  const [errors, setErrors] = useState({});
  const [previewCanvas, setPreviewCanvas] = useState(null);
  const [previewZoomInitialized, setPreviewZoomInitialized] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (bit) {
        // Edit mode
        setFormData({
          name: bit.name || "",
          diameter: bit.diameter || "",
          length: bit.length || "",
          angle: bit.angle || "",
          height: bit.height || "",
          cornerRadius: bit.cornerRadius || "",
          flat: bit.flat || "",
          color: bit.fillColor || "#cccccc",
          toolNumber: bit.toolNumber || 1,
        });
      } else {
        // Create mode
        setFormData({
          name: "",
          diameter: "",
          length: "",
          angle: "",
          height: "",
          cornerRadius: "",
          flat: "",
          color: "#cccccc",
          toolNumber: 1,
        });
      }
      setErrors({});
    }
  }, [isOpen, bit]);

  // Initialize preview canvas
  useEffect(() => {
    if (isOpen && !previewCanvas) {
      const canvas = document.getElementById("bit-preview-canvas");
      if (canvas) {
        const manager = new CanvasManager({
          canvas,
          width: 200,
          height: 200,
          enableZoom: true,
          enablePan: true,
          enableGrid: true,
          layers: ["grid", "bits"],
        });
        setPreviewCanvas(manager);
      }
    }
  }, [isOpen, previewCanvas]);

  // Update preview when form data changes
  useEffect(() => {
    if (previewCanvas && isValidForm()) {
      updatePreview();
    }
  }, [formData, previewCanvas]);

  const isValidForm = () => {
    const required = ["name", "diameter", "length", "toolNumber"];

    // Add group-specific requirements
    if (bitGroup === "conical") required.push("angle");
    if (bitGroup === "ball") required.push("height");
    if (bitGroup === "fillet" || bitGroup === "bull") {
      required.push("height", "cornerRadius", "flat");
    }

    return required.every(field => formData[field] && formData[field].toString().trim() !== "");
  };

  const updatePreview = () => {
    if (!previewCanvas) return;

    const bitsLayer = previewCanvas.getLayer("bits");
    bitsLayer.innerHTML = "";

    if (!isValidForm()) {
      // Show placeholder text if parameters are not complete
      const svgNS = "http://www.w3.org/2000/svg";
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", "100");
      text.setAttribute("y", "110");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "14");
      text.setAttribute("fill", "#999");
      text.textContent = "Заполните все параметры";
      bitsLayer.appendChild(text);
      return;
    }

    const bitData = {
      name: formData.name,
      diameter: parseFloat(formData.diameter),
      length: parseFloat(formData.length),
      angle: formData.angle ? parseFloat(formData.angle) : undefined,
      height: formData.height ? parseFloat(formData.height) : undefined,
      cornerRadius: formData.cornerRadius ? parseFloat(formData.cornerRadius) : undefined,
      flat: formData.flat ? parseFloat(formData.flat) : undefined,
      fillColor: formData.color,
      toolNumber: formData.toolNumber,
    };

    // Calculate initial zoom level to fit bit within preview area (only once)
    if (!previewZoomInitialized) {
      const bitDiameter = bitData.diameter;
      const bitLength = bitData.length;
      const availableWidth = 200 - 40; // 20px padding on each side
      const availableHeight = 200 - 40; // 20px padding on each side

      // Calculate zoom level to fit bit (maximize zoom to fill the canvas)
      const zoomX = availableWidth / bitDiameter;
      const zoomY = availableHeight / bitLength;
      const zoomLevel = Math.min(zoomX, zoomY);

      // Set initial zoom for preview (pan stays at center)
      previewCanvas.zoomLevel = zoomLevel;
      previewCanvas.updateViewBox();
      setPreviewZoomInitialized(true);
    }

    // Create bit shape always at center of preview (for modal preview use selected color with 0.6 opacity)
    const shape = createBitShape(bitData, bitGroup, 100, 100 + bitData.length / 2, bitData.fillColor, 1);
    if (shape) {
      // Apply selected style for modal preview (0.6 opacity)
      shape.setAttribute("fill", bitData.fillColor);
      shape.style.opacity = "0.6";
      bitsLayer.appendChild(shape);
    }

    // Update stroke width after adding to DOM
    updatePreviewStrokeWidths();
  };

  // Function to update stroke widths in preview based on zoom level
  const updatePreviewStrokeWidths = () => {
    if (!previewCanvas) return;
    const zoomLevel = previewCanvas.zoomLevel;
    const thickness = Math.max(0.1, 0.5 / Math.sqrt(zoomLevel));

    // Update stroke width for the bit shape
    const previewBitsLayer = previewCanvas.getLayer("bits");
    const shape = previewBitsLayer?.querySelector(".bit-shape");
    if (shape) {
      shape.setAttribute("stroke-width", thickness);
    }
  };



  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleBlur = (field) => {
    if (field !== 'name' && field !== 'color') {
      const value = evaluateMathExpression(formData[field]);
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.diameter) {
      newErrors.diameter = "Diameter is required";
    }

    if (!formData.length) {
      newErrors.length = "Length is required";
    }

    if (!formData.toolNumber) {
      newErrors.toolNumber = "Tool number is required";
    }

    if (bitGroup === "conical" && !formData.angle) {
      newErrors.angle = "Angle is required for conical bits";
    }

    if (bitGroup === "ball" && !formData.height) {
      newErrors.height = "Height is required for ball bits";
    }

    if ((bitGroup === "fillet" || bitGroup === "bull")) {
      if (!formData.height) newErrors.height = "Height is required";
      if (!formData.cornerRadius) newErrors.cornerRadius = "Corner radius is required";
      if (!formData.flat) newErrors.flat = "Flat is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const bitData = {
      name: formData.name.trim(),
      diameter: parseFloat(formData.diameter),
      length: parseFloat(formData.length),
      angle: formData.angle ? parseFloat(formData.angle) : undefined,
      height: formData.height ? parseFloat(formData.height) : undefined,
      cornerRadius: formData.cornerRadius ? parseFloat(formData.cornerRadius) : undefined,
      flat: formData.flat ? parseFloat(formData.flat) : undefined,
      fillColor: formData.color,
      toolNumber: parseInt(formData.toolNumber, 10),
    };

    try {
      if (bit) {
        // Update existing bit
        const updatedBit = updateBit(bitGroup, bit.id, bitData);
        dispatch(updateAvailableBit({
          groupName: bitGroup,
          bitId: bit.id,
          updatedBit,
        }));
      } else {
        // Create new bit
        addBit(bitGroup, bitData);
      }

      onSave?.();
      onClose();
    } catch (error) {
      console.error("Failed to save bit:", error);
      setErrors({ general: "Failed to save bit. Please try again." });
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div className="modal-content" style={{
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "20px",
        maxWidth: "600px",
        width: "90%",
        maxHeight: "90vh",
        overflow: "auto",
      }}>
        <h2 style={{ marginTop: 0 }}>
          {bit ? "Edit Bit" : "Create New Bit"} - {bitGroup}
        </h2>

        <div className="modal-body" style={{ display: "flex", gap: "20px" }}>
          {/* Form */}
          <div className="bit-form" style={{ flex: 1 }}>
            {/* Name */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Name:
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px",
                  border: "1px solid #ccc",
                  borderRadius: "3px",
                  fontSize: "14px",
                }}
              />
              {errors.name && <div style={{ color: "red", fontSize: "12px" }}>{errors.name}</div>}
            </div>

            {/* Diameter */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Diameter:
              </label>
              <input
                type="text"
                value={formData.diameter}
                onChange={(e) => handleInputChange("diameter", e.target.value)}
                onBlur={() => handleBlur("diameter")}
                style={{
                  width: "100%",
                  padding: "5px",
                  border: "1px solid #ccc",
                  borderRadius: "3px",
                  fontSize: "14px",
                }}
              />
              {errors.diameter && <div style={{ color: "red", fontSize: "12px" }}>{errors.diameter}</div>}
            </div>

            {/* Length */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Length:
              </label>
              <input
                type="text"
                value={formData.length}
                onChange={(e) => handleInputChange("length", e.target.value)}
                onBlur={() => handleBlur("length")}
                style={{
                  width: "100%",
                  padding: "5px",
                  border: "1px solid #ccc",
                  borderRadius: "3px",
                  fontSize: "14px",
                }}
              />
              {errors.length && <div style={{ color: "red", fontSize: "12px" }}>{errors.length}</div>}
            </div>

            {/* Group-specific fields */}
            {bitGroup === "conical" && (
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  Angle:
                </label>
                <input
                  type="text"
                  value={formData.angle}
                  onChange={(e) => handleInputChange("angle", e.target.value)}
                  onBlur={() => handleBlur("angle")}
                  style={{
                    width: "100%",
                    padding: "5px",
                    border: "1px solid #ccc",
                    borderRadius: "3px",
                    fontSize: "14px",
                  }}
                />
                {errors.angle && <div style={{ color: "red", fontSize: "12px" }}>{errors.angle}</div>}
              </div>
            )}

            {(bitGroup === "ball" || bitGroup === "fillet" || bitGroup === "bull") && (
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                  Height:
                </label>
                <input
                  type="text"
                  value={formData.height}
                  onChange={(e) => handleInputChange("height", e.target.value)}
                  onBlur={() => handleBlur("height")}
                  style={{
                    width: "100%",
                    padding: "5px",
                    border: "1px solid #ccc",
                    borderRadius: "3px",
                    fontSize: "14px",
                  }}
                />
                {errors.height && <div style={{ color: "red", fontSize: "12px" }}>{errors.height}</div>}
              </div>
            )}

            {(bitGroup === "fillet" || bitGroup === "bull") && (
              <>
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    Corner Radius:
                  </label>
                  <input
                    type="text"
                    value={formData.cornerRadius}
                    onChange={(e) => handleInputChange("cornerRadius", e.target.value)}
                    onBlur={() => handleBlur("cornerRadius")}
                    style={{
                      width: "100%",
                      padding: "5px",
                      border: "1px solid #ccc",
                      borderRadius: "3px",
                      fontSize: "14px",
                    }}
                  />
                  {errors.cornerRadius && <div style={{ color: "red", fontSize: "12px" }}>{errors.cornerRadius}</div>}
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                    Flat:
                  </label>
                  <input
                    type="text"
                    value={formData.flat}
                    onChange={(e) => handleInputChange("flat", e.target.value)}
                    onBlur={() => handleBlur("flat")}
                    style={{
                      width: "100%",
                      padding: "5px",
                      border: "1px solid #ccc",
                      borderRadius: "3px",
                      fontSize: "14px",
                    }}
                  />
                  {errors.flat && <div style={{ color: "red", fontSize: "12px" }}>{errors.flat}</div>}
                </div>
              </>
            )}

            {/* Color */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Color:
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => handleInputChange("color", e.target.value)}
                style={{
                  width: "60px",
                  height: "30px",
                  border: "1px solid #ccc",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              />
            </div>

            {/* Tool Number */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
                Tool Number:
              </label>
              <input
                type="number"
                min="1"
                value={formData.toolNumber}
                onChange={(e) => handleInputChange("toolNumber", e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px",
                  border: "1px solid #ccc",
                  borderRadius: "3px",
                  fontSize: "14px",
                }}
              />
              {errors.toolNumber && <div style={{ color: "red", fontSize: "12px" }}>{errors.toolNumber}</div>}
            </div>

            {errors.general && (
              <div style={{ color: "red", fontSize: "12px", marginBottom: "10px" }}>
                {errors.general}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bit-preview" style={{ flexShrink: 0 }}>
            <svg
              id="bit-preview-canvas"
              width="200"
              height="200"
              style={{
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "#fafafa",
              }}
            />
            <div style={{
              marginTop: "10px",
              display: "flex",
              gap: "5px",
              justifyContent: "center",
            }}>
              <button
                onClick={() => previewCanvas?.zoomIn()}
                style={{
                  padding: "5px 8px",
                  border: "1px solid #ccc",
                  backgroundColor: "#fff",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                +
              </button>
              <button
                onClick={() => previewCanvas?.zoomOut()}
                style={{
                  padding: "5px 8px",
                  border: "1px solid #ccc",
                  backgroundColor: "#fff",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                -
              </button>
              <button
                onClick={() => {
                  if (previewCanvas) {
                    previewCanvas.zoomLevel = 1;
                    previewCanvas.panX = 100;
                    previewCanvas.panY = 100;
                    previewCanvas.updateViewBox();
                    updatePreview();
                  }
                }}
                style={{
                  padding: "5px 8px",
                  border: "1px solid #ccc",
                  backgroundColor: "#fff",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Fit
              </button>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="button-group" style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
          marginTop: "20px",
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: "8px 16px",
              border: "1px solid #ccc",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValidForm()}
            style={{
              padding: "8px 16px",
              border: "1px solid #007bff",
              backgroundColor: isValidForm() ? "#007bff" : "#ccc",
              color: "white",
              borderRadius: "4px",
              cursor: isValidForm() ? "pointer" : "not-allowed",
            }}
          >
            {bit ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BitModal;
