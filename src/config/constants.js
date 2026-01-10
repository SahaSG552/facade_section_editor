// Shared constants for geometry, tolerances, and rendering
export const DEFAULT_STROKE_BASE = 0.5; // Base stroke width before zoom scaling
export const DEFAULT_STROKE_MIN = 0.1; // Minimum stroke width after scaling

export const ARC_APPROX_TOLERANCE = 0.15; // mm RMS tolerance for Bezier -> arc approximation
export const ARC_RADIUS_TOLERANCE = 0.01; // mm tolerance for radius vs chord checks and zero-offset guard
