/**
 * EditorVisualConfig — centralized visual constants for the profile editor.
 *
 * All tools and canvas helpers should import from here instead of
 * having magic numbers or CSS class name strings scattered across files.
 *
 * ### CSS class names
 * Used for SVG element classification.  Matching styles are in `styles.css`
 * under the "EDITOR CANVAS" sections.
 *
 * ### Geometry sizes
 * All values are in SVG **user-space units**, which equal the panel size
 * in mm (e.g. 0.05 ≈ 0.05 mm).  They are intentionally tiny so they
 * render as small dots / markers regardless of zoom level, because the
 * SVG layer uses `vector-effect: non-scaling-stroke` for all editor elements.
 *
 * ### Usage example
 * ```js
 * import { EV } from "../EditorVisualConfig.js";
 *
 * const dot = document.createElementNS(SVG_NS, "circle");
 * dot.setAttribute("r", EV.r.endpoint);
 * dot.classList.add(EV.cls.endpoint);
 * ```
 */

/**
 * @typedef {object} EditorVisualCls
 * @property {string} segment           - Committed segment (line/arc/circle outline)
 * @property {string} segmentSelected   - Segment in selected state
 * @property {string} segmentMirror     - Mirrored counterpart
 * @property {string} segmentHover      - Hovered segment highlight
 * @property {string} endpoint          - Endpoint dot on committed segments
 * @property {string} endpointSelected  - Endpoint dot when segment is selected
 * @property {string} endpointMirror    - Mirrored endpoint dot
 * @property {string} endpointHover     - Hovered endpoint dot
 * @property {string} arcHandle         - Draggable pt3 control handle (orange)
 * @property {string} arcHandleHover    - pt3 handle in hover state
 * @property {string} arcCenter         - Small dot at arc / circle center
 * @property {string} arcRadiusLine     - Dashed center → handle guide line
 * @property {string} arcRadiusLabel    - Radius text label (arc2pt)
 * @property {string} ghostOutline      - Main stroke element of in-progress ghost
 * @property {string} ghostRadius       - Dashed guide radius line inside a ghost
 * @property {string} ghostEndpoint     - Filled dot at ghost endpoints
 * @property {string} ghostCenter       - Hollow dot at ghost center
 * @property {string} selectionBox      - Window-select rectangle
 * @property {string} selectionBoxCross - Crossing-select rectangle
 * @property {string} axis              - Mirror / symmetry axis
 */

/**
 * @typedef {object} EditorVisualR
 * @property {number} endpoint      - Endpoint dots on committed segments
 * @property {number} handle        - Arc / circle pt3 draggable handle
 * @property {number} center        - Arc / circle center marker
 * @property {number} ghostEndpoint - Endpoint dots in ghost preview
 * @property {number} ghostCenter   - Center dot in ghost preview (overridden by CSS `r`)
 */

/** @type {{ cls: EditorVisualCls, r: EditorVisualR }} */
export const EV = {
    /** CSS class names for SVG editor elements. */
    cls: {
        segment:           "editor-segment",
        segmentSelected:   "editor-segment-selected",
        segmentMirror:     "editor-segment-mirror",
        segmentHover:      "editor-segment-hover",
        endpoint:          "editor-endpoint",
        endpointSelected:  "editor-endpoint-selected",
        endpointMirror:    "editor-endpoint-mirror",
        endpointHover:     "editor-endpoint-hover",
        arcHandle:         "editor-arc-handle",
        arcHandleHover:    "editor-arc-handle-hover",
        arcCenter:         "editor-arc-center",
        arcRadiusLine:     "editor-arc-radius-line",
        arcRadiusLabel:    "editor-arc-radius-label",
        ghostOutline:      "editor-ghost-outline",
        ghostRadius:       "editor-ghost-radius",
        ghostEndpoint:     "editor-ghost-endpoint",
        ghostCenter:       "editor-ghost-center",
        selectionBox:      "editor-selection-box",
        selectionBoxCross: "editor-selection-box--crossing",
        axis:              "editor-axis",
    },

    /**
     * Geometry radii for SVG circle elements, in panel mm (SVG user-space).
     * Keep in sync with the `r:` overrides in styles.css (ghost-center, etc.).
     */
    r: {
        /** Endpoint dot on a committed segment (start / end). */
        endpoint:      0.05,
        /** Draggable pt3 control handle on arcs and circles. */
        handle:        0.06,
        /** Center marker on selected arcs and circles. */
        center:        0.035,
        /** Endpoint dot in an in-progress ghost preview. */
        ghostEndpoint: 0.05,
        /**
         * Center dot in an in-progress ghost preview.
         * CSS overrides this via `r: 0.07` on `.editor-ghost-center`.
         */
        ghostCenter:   0.05,
    },
};

export default EV;
