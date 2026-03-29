/**
 * Normalization stage for offset processing.
 *
 * This stage is responsible for turning input SVG path data into normalized
 * contour segment collections suitable for downstream offset stages.
 */

/**
 * @param {string} pathData
 * @param {{ exportModule?: any }} options
 * @param {{ normalizeArcAngles: Function, splitSegmentsIntoContours: Function, log: any }} deps
 * @returns {Array<Array>}
 */
export function normalizeInputContours(pathData, options = {}, deps) {
    const { normalizeArcAngles, splitSegmentsIntoContours, log } = deps;

    if (!pathData || !String(pathData).trim()) {
        return [];
    }

    const exportModule = options.exportModule;
    if (!exportModule?.dxfExporter?.parseSVGPathSegments) {
        log.warn("Custom offset requires exportModule with parseSVGPathSegments");
        return [];
    }

    const parseSegments = exportModule.dxfExporter.parseSVGPathSegments(
        pathData,
        0,
        0,
        (y) => y,
        false,
    );

    if (!parseSegments || parseSegments.length === 0) {
        return [];
    }

    const normalizedSegments = parseSegments.map(normalizeArcAngles);
    return splitSegmentsIntoContours(normalizedSegments).filter((contour) => contour.length > 0);
}
