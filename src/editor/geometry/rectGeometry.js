/**
 * Rectangle corner keys used by rect/rx handles.
 * @type {Array<'rx-start'|'rx-x'|'rx-y'|'rx-opposite'>}
 */
export const RECT_CORNER_KEYS = ["rx-start", "rx-x", "rx-y", "rx-opposite"];

/**
 * Compute effective rectangle geometry in segment-local space.
 *
 * Supports both direction flags (`dirW`/`dirH`) and signed dimensions (`w`/`h`),
 * producing a single normalized interaction model for render/hit-test/edit code.
 *
 * @param {object} data
 * @returns {{
 *  xStart:number,
 *  yStart:number,
 *  xOpp:number,
 *  yOpp:number,
 *  minX:number,
 *  maxX:number,
 *  minY:number,
 *  maxY:number,
 *  dirW:number,
 *  dirH:number,
 *  widthAbs:number,
 *  heightAbs:number
 * }}
 */
export function getRectGeomLocal(data) {
    const xStart = Number(data?.x ?? 0);
    const yStart = Number(data?.y ?? 0);
    const w = Number(data?.w ?? 0);
    const h = Number(data?.h ?? 0);
    const dirWBase = Number(data?.dirW) < 0 ? -1 : 1;
    const hasDirH = Object.prototype.hasOwnProperty.call(data ?? {}, "dirH");
    const dirHBase = hasDirH ? (Number(data?.dirH) < 0 ? -1 : 1) : -1;

    const dx = dirWBase * w;
    const dy = dirHBase * h;
    const xOpp = xStart + dx;
    const yOpp = yStart + dy;
    const dirW = dx >= 0 ? 1 : -1;
    const dirH = dy >= 0 ? 1 : -1;

    return {
        xStart,
        yStart,
        xOpp,
        yOpp,
        minX: Math.min(xStart, xOpp),
        maxX: Math.max(xStart, xOpp),
        minY: Math.min(yStart, yOpp),
        maxY: Math.max(yStart, yOpp),
        dirW,
        dirH,
        widthAbs: Math.abs(w),
        heightAbs: Math.abs(h),
    };
}

/**
 * Clamp rectangle corner radius to valid bounds.
 * @param {object} data
 * @returns {number}
 */
export function getRectClampedRx(data) {
    const g = getRectGeomLocal(data);
    const rxRaw = Math.abs(Number(data?.rx ?? 0));
    return Math.max(0, Math.min(rxRaw, g.widthAbs / 2, g.heightAbs / 2));
}

/**
 * Get the four rectangle corner points from normalized geometry.
 * @param {{xStart:number,yStart:number,xOpp:number,yOpp:number}} geom
 * @returns {Record<'rx-start'|'rx-x'|'rx-y'|'rx-opposite',{x:number,y:number}>}
 */
export function getRectCornerPointMap(geom) {
    return {
        "rx-start": { x: geom.xStart, y: geom.yStart },
        "rx-x": { x: geom.xOpp, y: geom.yStart },
        "rx-y": { x: geom.xStart, y: geom.yOpp },
        "rx-opposite": { x: geom.xOpp, y: geom.yOpp },
    };
}

/**
 * Get inward (+u,+v) direction at each rectangle corner.
 * @param {{dirW:number,dirH:number}} geom
 * @returns {Record<'rx-start'|'rx-x'|'rx-y'|'rx-opposite',{ix:number,iy:number}>}
 */
export function getRectCornerInwardMap(geom) {
    return {
        "rx-start": { ix: geom.dirW, iy: geom.dirH },
        "rx-x": { ix: -geom.dirW, iy: geom.dirH },
        "rx-y": { ix: geom.dirW, iy: -geom.dirH },
        "rx-opposite": { ix: -geom.dirW, iy: -geom.dirH },
    };
}

/**
 * Build rounded-rectangle boundary primitives in segment-local space.
 * @param {object} data
 * @returns {{lines:Array<object>,arcs:Array<object>,rx:number}}
 */
export function getRectBoundaryPrimitives(data) {
    const g = getRectGeomLocal(data);
    const rx = getRectClampedRx(data);

    const xA = g.xStart;
    const yA = g.yStart;
    const xB = g.xOpp;
    const yB = g.yOpp;
    const dx = g.dirW;
    const dy = g.dirH;

    const lines = [];
    if (rx > 1e-9) {
        lines.push(
            { side: "top", axis: "h", role: "y-start", a: { x: xA + dx * rx, y: yA }, b: { x: xB - dx * rx, y: yA } },
            { side: "bottom", axis: "h", role: "y-opposite", a: { x: xA + dx * rx, y: yB }, b: { x: xB - dx * rx, y: yB } },
            { side: "left", axis: "w", role: "x-start", a: { x: xA, y: yA + dy * rx }, b: { x: xA, y: yB - dy * rx } },
            { side: "right", axis: "w", role: "x-opposite", a: { x: xB, y: yA + dy * rx }, b: { x: xB, y: yB - dy * rx } },
        );
    } else {
        lines.push(
            { side: "top", axis: "h", role: "y-start", a: { x: xA, y: yA }, b: { x: xB, y: yA } },
            { side: "bottom", axis: "h", role: "y-opposite", a: { x: xA, y: yB }, b: { x: xB, y: yB } },
            { side: "left", axis: "w", role: "x-start", a: { x: xA, y: yA }, b: { x: xA, y: yB } },
            { side: "right", axis: "w", role: "x-opposite", a: { x: xB, y: yA }, b: { x: xB, y: yB } },
        );
    }

    const arcs = rx > 1e-9
        ? [
            { cornerKey: "rx-start", center: { x: xA + dx * rx, y: yA + dy * rx }, sx: -dx, sy: -dy },
            { cornerKey: "rx-x", center: { x: xB - dx * rx, y: yA + dy * rx }, sx: dx, sy: -dy },
            { cornerKey: "rx-y", center: { x: xA + dx * rx, y: yB - dy * rx }, sx: -dx, sy: dy },
            { cornerKey: "rx-opposite", center: { x: xB - dx * rx, y: yB - dy * rx }, sx: dx, sy: dy },
        ]
        : [];

    return { lines, arcs, rx };
}