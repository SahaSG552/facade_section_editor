/**
 * BooleanOperationStrategy - Handles boolean operations using Paper.js
 * Encapsulates the logic for calculating boolean operations (part shape) using Paper.js
 * **PHASE 2 REFACTORING** - Extracted from updatePartShape() and related functions
 */

import { ARC_APPROX_TOLERANCE } from "../config/constants.js";

export class BooleanOperationStrategy {
    constructor(appConfig, canvasManager, paperCalculator) {
        this.appConfig = appConfig;
        this.canvasManager = canvasManager;
        this.paperCalculator = paperCalculator;
    }

    /**
     * Calculate the result polygon using Paper.js boolean engine
     * @param {SVGElement} panelSection - Panel section element
     * @param {Array} bitsOnCanvas - Array of bits with operations
     * @param {Array} phantomBits - Array of phantom bits for boolean operations
     * @param {Object} options - Additional options (unused, kept for compatibility)
     * @returns {Object} Object with { d: pathData, engineType: string }
     */
    calculateResultPolygon(
        panelSection,
        bitsOnCanvas,
        phantomBits,
        options = {}
    ) {
        console.log("[Boolean] Using Paper.js");

        // Paper.js boolean operation
        const d = this.calculateWithPaperJs(
            panelSection,
            bitsOnCanvas,
            phantomBits,
            options
        );

        // Return object with both path data and engine type
        return {
            d: d || "M 0 0 Z",
            engineType: "paperjs",
        };
    }

    /**
     * Calculate using Paper.js boolean processor
     * @private
     */
    calculateWithPaperJs(
        panelSection,
        bitsOnCanvas,
        phantomBits,
        options = {}
    ) {
        // Paper.js boolean operation
        if (typeof this.paperCalculator === "function") {
            return this.paperCalculator(
                panelSection,
                bitsOnCanvas,
                phantomBits
            );
        }

        console.warn(
            "[Boolean] paperCalculator not found, returning empty path"
        );
        return "M 0 0 Z"; // Return empty path if function not available
    }

    /**
     * Get the engine type currently in use
     * @returns {string} Always "paperjs"
     */
    getEngineType() {
        return "paperjs";
    }

    /**
     * Check if Paper.js engine is active
     * @returns {boolean} Always true
     */
    isUsingPaperJs() {
        return true;
    }

    /**
     * Calculate offset contours for a single bit
     * This is used by the UpdatePipeline for offset calculations
     * @param {Object} offsetCalculator - Paper.js offset calculator instance
     * @param {SVGElement} partFront - Panel front element
     * @param {number} offsetDistance - Distance to offset
     * @returns {string|null} SVG path data for the offset contour
     */
    calculateOffsetContour(offsetCalculator, partFront, offsetDistance) {
        if (!offsetCalculator || !partFront) {
            return null;
        }

        // Use Paper.js direct SVG import to preserve Bezier curves
        return offsetCalculator.calculateOffsetFromSVG(
            partFront,
            offsetDistance
        );
    }

    /**
     * Apply transform to path (Paper.js paths don't need transforms)
     * @param {SVGElement} pathElement - SVG path element to update
     * @param {string} engineType - Engine type (always "paperjs")
     * @param {number} panelX - Panel X offset (unused)
     * @param {number} panelY - Panel Y offset (unused)
     */
    applyPathTransform(pathElement, engineType, panelX = 0, panelY = 0) {
        if (!pathElement) return;
        // Paper.js: no transform needed
        pathElement.removeAttribute("transform");
    }

    /**
     * Get configuration for Paper.js offset calculator
     * @param {Object} exportModule - Export module for arc approximation
     * @returns {Object} Configuration object for offset calculator
     */
    getOffsetCalculatorConfig(exportModule = null) {
        return {
            useArcApproximation: true,
            arcTolerance: ARC_APPROX_TOLERANCE,
            exportModule: exportModule,
        };
    }
}

export default BooleanOperationStrategy;
