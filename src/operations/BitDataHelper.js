/**
 * BitDataHelper - Utility class for bit data transformations and calculations
 * Handles coordinate transformations, data conversions, and bit-specific operations
 * **PHASE 2 REFACTORING** - Extracted from scattered helper functions in script.js
 */

export class BitDataHelper {
    constructor(appConfig, panelCoordinateHelper) {
        this.appConfig = appConfig;
        this.panelCoordinateHelper = panelCoordinateHelper;
    }

    /**
     * Convert bit coordinates from current anchor to top-left anchor coordinates
     * Used for calculations that need consistent coordinate system
     */
    convertToTopAnchorCoordinates(bit) {
        if (!bit || !bit.x || bit.y === undefined) {
            console.warn("BitDataHelper: Invalid bit data", bit);
            return { x: 0, y: 0 };
        }

        // Get current anchor offset
        const currentAnchorOffset = this.getAnchorOffsetForBit(bit);

        // Convert from current anchor to top anchor coordinates
        return {
            x: bit.x + currentAnchorOffset.x,
            y: bit.y + currentAnchorOffset.y,
        };
    }

    /**
     * Convert bit coordinates from top anchor back to current anchor
     */
    convertFromTopAnchorCoordinates(bit, topAnchorCoords) {
        const currentAnchorOffset = this.getAnchorOffsetForBit(bit);

        return {
            x: topAnchorCoords.x - currentAnchorOffset.x,
            y: topAnchorCoords.y - currentAnchorOffset.y,
        };
    }

    /**
     * Get anchor offset for a specific bit based on its alignment
     */
    getAnchorOffsetForBit(bit) {
        const panelAnchor = this.appConfig.panel.anchor;

        return panelAnchor === "top-left"
            ? { x: 0, y: 0 }
            : { x: 0, y: this.appConfig.panel.thickness };
    }

    /**
     * Calculate V-Carve passes for a bit
     * Returns array of passes with calculated offsets
     */
    calculateVCarvePasses(bit, panelAnchorCoords) {
        if (!bit || !bit.bitData || bit.operation !== "VC") {
            return [];
        }

        const angle = bit.bitData.angle || 90;
        const hypotenuse = bit.bitData.diameter || 10;

        // Get Y coordinate in top anchor system
        const topAnchorCoords = this.convertToTopAnchorCoordinates(bit);
        const bitY = topAnchorCoords.y;

        // Calculate conical bit height
        const bitHeight =
            (hypotenuse / 2) * (1 / Math.tan(this.angleToRad(angle) / 2));

        // Calculate number of passes
        const passes = bitHeight < bitY ? Math.ceil(bitY / bitHeight) : 1;

        // Calculate offsets for each pass
        const passData = [];
        for (let i = 0; i < passes; i++) {
            const partialResult = (bitY * (i + 1)) / passes;
            const offsetValue =
                partialResult * Math.tan(this.angleToRad(angle / 2));

            passData.push({
                passIndex: i,
                depth: partialResult,
                offset: topAnchorCoords.x - offsetValue,
                bitHeight: bitHeight,
            });
        }

        // Reverse to start from outermost pass
        return passData.reverse();
    }

    /**
     * Get all information about a bit in titled/display format
     * Used by UI and export functions
     */
    getTitledBitData(bit, index = 0) {
        if (!bit || !bit.bitData) {
            return null;
        }

        const bitData = bit.bitData;
        const topAnchorCoords = this.convertToTopAnchorCoordinates(bit);

        return {
            index: index,
            id: bitData.id,
            name: bitData.name || `Bit ${bitData.id}`,
            diameter: bitData.diameter || 0,
            operation: bit.operation || "NONE",
            alignment: bit.alignment || "center",
            angle: bitData.angle || 0,
            shankLength: bitData.shankLength || 0,
            fillColor: bitData.fillColor || "#000000",

            // Position data
            x: bit.x,
            y: bit.y,
            xTopAnchor: topAnchorCoords.x,
            yTopAnchor: topAnchorCoords.y,

            // Computed properties
            baseAbsX: bit.baseAbsX || 0,
            baseAbsY: bit.baseAbsY || 0,
            isSelected: false, // Should be set by caller
        };
    }

    /**
     * Check if bit coordinates are within panel bounds
     */
    isBitInPanelBounds(bit) {
        if (!bit || !this.panelCoordinateHelper) {
            return false;
        }

        const topAnchorCoords = this.convertToTopAnchorCoordinates(bit);
        const bounds = this.panelCoordinateHelper.getPanelBounds();

        const radius = (bit.bitData?.diameter || 0) / 2;

        return (
            topAnchorCoords.x - radius >= bounds.left &&
            topAnchorCoords.x + radius <= bounds.right &&
            topAnchorCoords.y - radius >= bounds.top &&
            topAnchorCoords.y + radius <= bounds.bottom
        );
    }

    /**
     * Get display Y coordinate for a bit (considering anchor and flip)
     */
    getDisplayY(bit) {
        if (!bit || bit.y === undefined) {
            return 0;
        }

        const panelAnchor = this.appConfig.panel.anchor;
        const displayY = bit.y + this.getAnchorOffsetForBit(bit).y;

        // Mirror Y for display based on anchor
        return panelAnchor === "bottom-left" ? -displayY : displayY;
    }

    /**
     * Set Y coordinate from display (inverse of getDisplayY)
     */
    setDisplayY(bit, displayY) {
        const panelAnchor = this.appConfig.panel.anchor;
        const adjustedY = panelAnchor === "bottom-left" ? -displayY : displayY;

        bit.y = adjustedY - this.getAnchorOffsetForBit(bit).y;
        return bit;
    }

    /**
     * Snap bit position to grid
     */
    snapBitToGrid(bit, gridSize = 1) {
        if (!bit) return bit;

        const anchorOffset = this.getAnchorOffsetForBit(bit);
        const snappedX =
            Math.round((bit.x + anchorOffset.x) / gridSize) * gridSize -
            anchorOffset.x;
        const snappedY =
            Math.round((bit.y + anchorOffset.y) / gridSize) * gridSize -
            anchorOffset.y;

        bit.x = snappedX;
        bit.y = snappedY;

        return bit;
    }

    /**
     * Calculate extension height for a bit
     * Used by updateBitExtensions()
     */
    calculateExtensionHeight(bit, panelAnchorCoords) {
        if (!bit || bit.operation !== "VC") {
            return 0;
        }

        const topAnchorCoords = this.convertToTopAnchorCoordinates(bit);
        const angle = bit.bitData.angle || 90;
        const hypotenuse = bit.bitData.diameter || 10;
        const bitHeight =
            (hypotenuse / 2) * (1 / Math.tan(this.angleToRad(angle) / 2));

        return bitHeight;
    }

    /**
     * Clone bit data safely
     */
    cloneBit(bit) {
        if (!bit) return null;

        return {
            ...bit,
            bitData: { ...bit.bitData },
            group: bit.group, // Reference, not cloned
        };
    }

    /**
     * Validate bit data
     */
    isValidBit(bit) {
        return (
            bit &&
            typeof bit === "object" &&
            bit.bitData &&
            typeof bit.bitData === "object" &&
            bit.bitData.id !== undefined &&
            bit.x !== undefined &&
            bit.y !== undefined
        );
    }

    /**
     * Merge bit updates safely
     */
    updateBitData(bit, updates) {
        if (!this.isValidBit(bit)) {
            console.warn("BitDataHelper: Invalid bit for update", bit);
            return bit;
        }

        return {
            ...bit,
            ...updates,
            bitData: {
                ...bit.bitData,
                ...(updates.bitData || {}),
            },
        };
    }

    /**
     * Helper: Convert angle in degrees to radians
     */
    angleToRad(degrees) {
        return (degrees * Math.PI) / 180;
    }

    /**
     * Helper: Convert angle in radians to degrees
     */
    radToAngle(radians) {
        return (radians * 180) / Math.PI;
    }

    /**
     * Get bit statistics for debugging
     */
    getBitStats(bitsArray) {
        if (!bitsArray || !Array.isArray(bitsArray)) {
            return null;
        }

        const vcBits = bitsArray.filter((b) => b.operation === "VC");
        const flatBits = bitsArray.filter((b) => b.operation === "FLAT");
        const noneBits = bitsArray.filter(
            (b) => b.operation !== "VC" && b.operation !== "FLAT"
        );

        return {
            total: bitsArray.length,
            vcCount: vcBits.length,
            flatCount: flatBits.length,
            otherCount: noneBits.length,
            vcBits: vcBits,
            flatBits: flatBits,
        };
    }
}

export default BitDataHelper;
