/**
 * Validation utilities for geometry, coordinates, and bit parameters
 */

export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

/**
 * Validate that a coordinate (x, y) is finite and valid
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @throws {ValidationError} If coordinates are not finite
 */
export function validateCoordinates(x, y) {
    if (!Number.isFinite(x)) {
        throw new ValidationError(
            `Invalid X coordinate: ${x} (must be finite number)`
        );
    }
    if (!Number.isFinite(y)) {
        throw new ValidationError(
            `Invalid Y coordinate: ${y} (must be finite number)`
        );
    }
}

/**
 * Validate panel dimensions (width, height, thickness)
 * @param {number} width - Panel width in mm
 * @param {number} height - Panel height in mm
 * @param {number} thickness - Panel thickness in mm
 * @throws {ValidationError} If dimensions are invalid
 */
export function validatePanelDimensions(width, height, thickness) {
    if (width <= 0 || !Number.isFinite(width)) {
        throw new ValidationError(
            `Invalid panel width: ${width} (must be positive finite number)`
        );
    }
    if (height <= 0 || !Number.isFinite(height)) {
        throw new ValidationError(
            `Invalid panel height: ${height} (must be positive finite number)`
        );
    }
    if (thickness <= 0 || !Number.isFinite(thickness)) {
        throw new ValidationError(
            `Invalid panel thickness: ${thickness} (must be positive finite number)`
        );
    }
}

/**
 * Validate bit diameter
 * @param {number} diameter - Bit diameter in mm
 * @throws {ValidationError} If diameter is invalid
 */
export function validateBitDiameter(diameter) {
    if (diameter <= 0 || !Number.isFinite(diameter)) {
        throw new ValidationError(
            `Invalid bit diameter: ${diameter} (must be positive finite number)`
        );
    }
}

/**
 * Validate V-Carve angle (must be between 1 and 179 degrees)
 * @param {number} angle - Angle in degrees
 * @throws {ValidationError} If angle is invalid
 */
export function validateVCarveAngle(angle) {
    if (angle <= 0 || angle >= 180 || !Number.isFinite(angle)) {
        throw new ValidationError(
            `Invalid V-Carve angle: ${angle} (must be between 0 and 180 degrees)`
        );
    }
}

/**
 * Validate radius value (must be non-negative)
 * @param {number} radius - Radius in mm
 * @throws {ValidationError} If radius is invalid
 */
export function validateRadius(radius) {
    if (radius < 0 || !Number.isFinite(radius)) {
        throw new ValidationError(
            `Invalid radius: ${radius} (must be non-negative finite number)`
        );
    }
}

/**
 * Validate zoom level (must be positive)
 * @param {number} zoomLevel - Zoom level (1.0 = 100%)
 * @throws {ValidationError} If zoom level is invalid
 */
export function validateZoomLevel(zoomLevel) {
    if (zoomLevel <= 0 || !Number.isFinite(zoomLevel)) {
        throw new ValidationError(
            `Invalid zoom level: ${zoomLevel} (must be positive finite number)`
        );
    }
}

/**
 * Validate anchor position ("top-left" or "bottom-left")
 * @param {string} anchor - Panel anchor
 * @throws {ValidationError} If anchor is invalid
 */
export function validatePanelAnchor(anchor) {
    if (!["top-left", "bottom-left"].includes(anchor)) {
        throw new ValidationError(
            `Invalid panel anchor: ${anchor} (must be "top-left" or "bottom-left")`
        );
    }
}

/**
 * Validate operation type (AL, OU, IN, VC)
 * @param {string} operation - Operation type
 * @throws {ValidationError} If operation is invalid
 */
export function validateOperation(operation) {
    if (!["AL", "OU", "IN", "VC"].includes(operation)) {
        throw new ValidationError(
            `Invalid operation: ${operation} (must be AL, OU, IN, or VC)`
        );
    }
}

/**
 * Safe validate with optional throwing - returns error instead of throwing if silent=true
 * @param {Function} validator - Validation function
 * @param {...any} args - Arguments to pass to validator
 * @returns {ValidationError|null} Error object or null if valid
 */
export function safeValidate(validator, ...args) {
    try {
        validator(...args);
        return null;
    } catch (error) {
        if (error instanceof ValidationError) {
            return error;
        }
        throw error;
    }
}

export default {
    ValidationError,
    validateCoordinates,
    validatePanelDimensions,
    validateBitDiameter,
    validateVCarveAngle,
    validateRadius,
    validateZoomLevel,
    validatePanelAnchor,
    validateOperation,
    safeValidate,
};
