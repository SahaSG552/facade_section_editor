/**
 * Arc Approximation Utilities
 * Аппроксимация кривых Безье в дуги для 2D canvas и 3D экструзии
 */

import LoggerFactory from "../core/LoggerFactory.js";
import {
    ARC_APPROX_TOLERANCE,
    ARC_RADIUS_TOLERANCE,
} from "../config/constants.js";

const log = LoggerFactory.createLogger("arcApproximation");

/**
 * Конвертирует segments (после optimizeSegmentsToArcs) обратно в SVG path строку
 * @param {Array} segments - массив сегментов (line, arc, bezier)
 * @param {boolean} invertSweepFlag - Инвертировать sweep flag для арок (при переходе из DXF в SVG координаты)
 * @returns {string} SVG path data (d attribute)
 */
export function segmentsToSVGPath(segments, invertSweepFlag = false) {
    if (!segments || segments.length === 0) {
        return "";
    }

    const pathCommands = [];
    let currentX = null;
    let currentY = null;

    segments.forEach((segment, index) => {
        // Первый сегмент всегда начинается с M (move)
        if (
            index === 0 ||
            currentX !== segment.start.x ||
            currentY !== segment.start.y
        ) {
            pathCommands.push(
                `M ${segment.start.x.toFixed(6)} ${segment.start.y.toFixed(6)}`
            );
            currentX = segment.start.x;
            currentY = segment.start.y;
        }

        switch (segment.type) {
            case "line":
                pathCommands.push(
                    `L ${segment.end.x.toFixed(6)} ${segment.end.y.toFixed(6)}`
                );
                currentX = segment.end.x;
                currentY = segment.end.y;
                break;

            case "arc":
                // SVG arc command: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
                const arc = segment.arc;

                // radius (для DXF arc может быть уже готовый объект)
                let rx = arc.radius || arc.rx || 0;
                let ry = arc.radius || arc.ry || 0;

                // Auto-correct arc radius if too small for chord length (like in DXF export)
                // This ensures corrected arcs are used in both 2D display and 3D rendering
                const dx = segment.end.x - segment.start.x;
                const dy = segment.end.y - segment.start.y;
                const chordLength = Math.sqrt(dx * dx + dy * dy);
                const minRadius = chordLength / 2;

                if (rx < minRadius - ARC_RADIUS_TOLERANCE) {
                    log.warn(
                        `[Arc Auto-correct] Radius ${rx.toFixed(
                            2
                        )}mm → ${minRadius.toFixed(
                            2
                        )}mm (chord ${chordLength.toFixed(2)}mm)`
                    );
                    rx = minRadius;
                    ry = minRadius;
                }

                // rotation (обычно 0 для круговых дуг)
                const rotation = arc.xAxisRotation || 0;

                // large-arc-flag (1 если дуга > 180°)
                const largeArc =
                    arc.largeArcFlag !== undefined ? arc.largeArcFlag : 0;

                // sweep-flag (направление: 1 = по часовой, 0 = против)
                // В DXF: isCCW = true означает counter-clockwise (против часовой = 0)
                // В DXF: isCCW = false означает clockwise (по часовой = 1)
                let sweep;
                if (arc.sweepFlag !== undefined) {
                    sweep = arc.sweepFlag;
                } else if (arc.isCCW !== undefined) {
                    sweep = arc.isCCW ? 0 : 1;
                } else {
                    sweep = 1; // default clockwise
                }

                // Инвертировать sweep если переходим из DXF координат (Y вверх) в SVG координаты (Y вниз)
                if (invertSweepFlag) {
                    sweep = sweep === 1 ? 0 : 1;
                }

                pathCommands.push(
                    `A ${rx.toFixed(6)} ${ry.toFixed(
                        6
                    )} ${rotation} ${largeArc} ${sweep} ${segment.end.x.toFixed(
                        6
                    )} ${segment.end.y.toFixed(6)}`
                );
                currentX = segment.end.x;
                currentY = segment.end.y;
                break;

            case "bezier":
                // Cubic Bezier: C x1 y1 x2 y2 x y
                pathCommands.push(
                    `C ${segment.cp1.x.toFixed(6)} ${segment.cp1.y.toFixed(
                        6
                    )} ${segment.cp2.x.toFixed(6)} ${segment.cp2.y.toFixed(
                        6
                    )} ${segment.end.x.toFixed(6)} ${segment.end.y.toFixed(6)}`
                );
                currentX = segment.end.x;
                currentY = segment.end.y;
                break;

            default:
                log.warn(`Unknown segment type: ${segment.type}`);
        }
    });

    // Закрываем path если он замкнут (проверяем первую и последнюю точку)
    if (segments.length > 0) {
        const firstSeg = segments[0];
        const lastSeg = segments[segments.length - 1];
        const eps = 0.001;

        if (
            Math.abs(firstSeg.start.x - lastSeg.end.x) < eps &&
            Math.abs(firstSeg.start.y - lastSeg.end.y) < eps
        ) {
            pathCommands.push("Z");
        }
    }

    return pathCommands.join(" ");
}

/**
 * Применяет аппроксимацию Безье → Арки к SVG path data
 * Использует функции из ExportModule для аппроксимации
 * @param {string} pathData - SVG path data (d attribute)
 * @param {Object} exportModule - экземпляр ExportModule с функциями parseSVGPathSegments и optimizeSegmentsToArcs
 * @param {number} tolerance - RMS tolerance в мм (по умолчанию 0.15)
 * @returns {string} Аппроксимированный SVG path data с дугами
 */
export function approximatePath(
    pathData,
    exportModule,
    tolerance = ARC_APPROX_TOLERANCE
) {
    if (!pathData || !exportModule) {
        log.warn("approximatePath: missing pathData or exportModule");
        return pathData;
    }

    try {
        // Парсим SVG path data в segments
        // parseSVGPathSegments(d, offsetX, offsetY, convertY, invertRelativeY)
        // Для 2D canvas: offsetX=0, offsetY=0, convertY = identity, invertRelativeY = false
        const identityConvert = (y) => y;
        const segments = exportModule.dxfExporter.parseSVGPathSegments(
            pathData,
            0,
            0,
            identityConvert,
            false // НЕ инвертировать Y для относительных команд (остаемся в SVG координатах)
        );

        if (!segments || segments.length === 0) {
            log.warn("approximatePath: no segments parsed");
            return pathData;
        }

        // Применяем аппроксимацию Безье → Арки
        const originalBezierCount = segments.filter(
            (s) => s.type === "bezier"
        ).length;

        if (originalBezierCount === 0) {
            // Нет Безье кривых для аппроксимации
            return pathData;
        }

        const optimizedSegments =
            exportModule.dxfExporter.optimizeSegmentsToArcs(
                segments,
                tolerance
            );

        const optimizedBezierCount = optimizedSegments.filter(
            (s) => s.type === "bezier"
        ).length;
        const convertedCount = originalBezierCount - optimizedBezierCount;

        log.debug(
            `Arc approximation: ${convertedCount}/${originalBezierCount} Beziers converted (${(
                (convertedCount / originalBezierCount) *
                100
            ).toFixed(0)}%)`
        );

        // Конвертируем оптимизированные segments обратно в SVG path
        // invertSweepFlag: true - segments в DXF координатах (Y вверх), инвертируем для SVG (Y вниз)
        const approximatedPath = segmentsToSVGPath(optimizedSegments, true);

        return approximatedPath;
    } catch (error) {
        log.error("approximatePath failed:", error);
        return pathData; // fallback to original
    }
}
