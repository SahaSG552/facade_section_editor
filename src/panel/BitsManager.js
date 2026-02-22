import {
    getBits,
    addBit,
    deleteBit,
    updateBit,
    exportToJSON,
    importFromJSON,
} from "../data/bitsStore.js";
import CanvasManager from "../canvas/CanvasManager.js";
import { evaluateMathExpression } from "../utils/utils.js";
import { fitAllVisibleElements } from "../canvas/zoomUtils.js";
import variablesManager from "../data/VariablesManager.js";
import PathEditor from "./PathEditor.js";
import ProfileEditor from "../editor/ProfileEditor.js";

/**
 * Merge a new numeric SVG path with the original formula path.
 * For each coordinate token, if the new numeric value is numerically equal to
 * the original formula’s evaluated value (tolerance 1e-4) — keep the formula.
 * Otherwise use the new numeric value.
 *
 * Both paths must have the same command structure (same number and types of
 * tokens). If they differ (user added/deleted segments), the new path is
 * returned unchanged.
 *
 * @param {string} newPath   - New numeric SVG path (from canvas export)
 * @param {string} rawPath   - Original formula SVG path (may contain {vars})
 * @param {import('./PathEditor.js').default} pathEditor - PathEditor for evaluation
 * @returns {string}
 */
function mergePathWithFormulas(newPath, rawPath, pathEditor) {
    if (!rawPath || !pathEditor) return newPath;

    /** Tokenize into cmd-letters and parameter blobs (handles `{expr}` and `-{expr}`). */
    const tokenize = (str) => {
        const tokens = [];
        let i = 0;
        while (i < str.length) {
            while (i < str.length && /[\s,]/.test(str[i])) i++;
            if (i >= str.length) break;
            if (/[MmLlHhVvZzCcSsQqTtAa]/.test(str[i])) {
                tokens.push({ type: 'cmd', value: str[i++] });
            } else if ((str[i] === '-' || str[i] === '+') && str[i + 1] === '{') {
                // e.g. -{h}
                const end = str.indexOf('}', i + 1);
                const k   = end >= 0 ? end + 1 : str.length;
                tokens.push({ type: 'param', value: str.slice(i, k) });
                i = k;
            } else if (str[i] === '{') {
                // e.g. {d/2}
                const end = str.indexOf('}', i);
                const k   = end >= 0 ? end + 1 : str.length;
                tokens.push({ type: 'param', value: str.slice(i, k) });
                i = k;
            } else {
                // plain number (may start with sign)
                let j = i;
                if (str[j] === '-' || str[j] === '+') j++;
                while (j < str.length && /[\d.eE]/.test(str[j])) {
                    if ((str[j] === 'e' || str[j] === 'E') && j + 1 < str.length &&
                        (str[j + 1] === '-' || str[j + 1] === '+')) j++;
                    j++;
                }
                const numStr = str.slice(i, j);
                if (numStr) tokens.push({ type: 'param', value: numStr });
                // Always advance: if nothing was consumed (e.g. unknown char like '/', '(')
                // skip it so the outer while never stalls.
                i = j > i ? j : j + 1;
            }
        }
        return tokens;
    };

    const newTokens = tokenize(newPath);
    const rawTokens = tokenize(rawPath);
    if (newTokens.length !== rawTokens.length) return newPath; // incompatible structure

    const result = [];
    for (let i = 0; i < newTokens.length; i++) {
        const nt = newTokens[i];
        const rt = rawTokens[i];
        if (nt.type === 'cmd') {
            result.push(nt.value);
        } else {
            const newVal = parseFloat(nt.value);
            const rawVal = parseFloat(pathEditor.evaluateToken(rt.value));
            if (!isNaN(newVal) && !isNaN(rawVal) && Math.abs(newVal - rawVal) < 1e-4) {
                result.push(rt.value); // identical → keep formula
            } else {
                result.push(nt.value); // changed → use new number
            }
        }
    }
    return result.join(' ');
}

const svgNS = "http://www.w3.org/2000/svg";

export default class BitsManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.bitGroups = document.getElementById("bit-groups");
    }

    // Create SVG icon
    createSVGIcon(shape, params, size = 50) {
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", size);
        svg.setAttribute("height", size);
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", size / 2);
        circle.setAttribute("cy", size / 2);
        circle.setAttribute("r", size / 2 - 1);
        circle.setAttribute("fill", "white");
        circle.setAttribute("stroke", "black");
        circle.setAttribute("stroke-width", "2");
        svg.appendChild(circle);

        const innerGroup = document.createElementNS(svgNS, "g");
        innerGroup.setAttribute(
            "transform",
            `translate(${size / 2}, ${size / 2})`,
        );

        let innerShape;

        if (shape !== "newBit" && params && params.diameter !== undefined) {
            // Use actual bit shape if parameters are provided
            innerShape = this.createBitShapeElement(
                params,
                shape,
                0,
                params.length / 2,
                false, // isSelected = false for icon
                false, // includeShank = false for icon
            );
            // Adjust transform for proper scaling in icon
            innerShape.setAttribute("transform", `scale(${size / 80})`);
        } else {
            // Use placeholder shapes for new bit button
            const s = size / 4;
            switch (shape) {
                case "cylindrical":
                    innerShape = document.createElementNS(svgNS, "rect");
                    innerShape.setAttribute("x", -size / 4);
                    innerShape.setAttribute("y", -size / 4);
                    innerShape.setAttribute("width", size / 2);
                    innerShape.setAttribute("height", size / 2);
                    break;
                case "conical":
                    innerShape = document.createElementNS(svgNS, "path");
                    innerShape.setAttribute(
                        "d",
                        `M ${-s} 0
                    L ${-s} ${-s}
                    L ${s} ${-s}
                    L ${s} 0
                    L 0 ${s}
                    Z`,
                    );
                    break;
                case "ball":
                    innerShape = document.createElementNS(svgNS, "path");
                    innerShape.setAttribute(
                        "d",
                        `M ${-s} 0
                    L ${-s} ${-s}
                    L ${s} ${-s}
                    L ${s} 0
                    A ${s} ${s} 0 0 1 0 ${s}
                    A ${s} ${s} 0 0 1 ${-s} 0
                    Z`,
                    );
                    break;
                case "fillet":
                    innerShape = document.createElementNS(svgNS, "path");
                    innerShape.setAttribute(
                        "d",
                        `M ${-s} ${s / 4}
                    L ${-s} ${-s}
                    L ${s} ${-s}
                    L ${s} ${s / 4}
                    A ${s} ${s} 0 0 0 ${s / 4} ${s}
                    L ${-s / 4} ${s}
                    A ${s} ${s} 0 0 0 ${-s} ${s / 4}
                    Z`,
                    );
                    break;
                case "bull":
                    innerShape = document.createElementNS(svgNS, "path");
                    innerShape.setAttribute(
                        "d",
                        `M ${-s} ${s / 2}
                    L ${-s} ${-s}
                    L ${s} ${-s}
                    L ${s} ${s / 2}
                    A ${s / 2} ${s / 2} 0 0 1 ${s / 2} ${s}
                    L ${-s / 2} ${s}
                    A ${s / 2} ${s / 2} 0 0 1 ${-s} ${s / 2}
                    Z`,
                    );
                    break;
                case "profile":
                    // Profile cutter icon - custom shape (chamfer-like)
                    innerShape = document.createElementNS(svgNS, "path");
                    innerShape.setAttribute(
                        "d",
                        `M ${-s} ${s}
                    L ${-s} ${-s / 2}
                    L ${-s / 2} ${-s}
                    L ${s} ${-s}
                    L ${s} ${s}
                    Z`,
                    );
                    break;
                case "newBit":
                    innerShape = document.createElementNS(svgNS, "path");
                    innerShape.setAttribute(
                        "d",
                        `M0 ${-size / 6}V${size / 6}M${-size / 6} 0H${size / 6}`,
                    );
                    break;
            }
            if (innerShape) {
                // Use the bit's color if available, otherwise white
                const fillColor = params?.fillColor
                    ? this.getBitFillColor(params, false)
                    : "white";
                innerShape.setAttribute("fill", fillColor);
                innerShape.setAttribute("stroke", "black");
                innerShape.setAttribute("stroke-width", "2");
            }
        }

        if (innerShape) {
            innerGroup.appendChild(innerShape);
        }
        svg.appendChild(innerGroup);
        return svg;
    }

    // Create action icon
    createActionIcon(action) {
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "15");
        svg.setAttribute("height", "15");
        svg.setAttribute("viewBox", "0 0 24 24");

        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", "12");
        circle.setAttribute("cy", "12");
        circle.setAttribute("r", "11");
        circle.setAttribute("fill", "white");
        circle.setAttribute("stroke-width", "2");

        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("fill", "black");

        switch (action) {
            case "edit":
                circle.setAttribute("stroke", "green");
                path.setAttribute(
                    "d",
                    "M16.293 2.293l3.414 3.414-13 13-3.414-3.414 13-13zM18 10v8h-8v-8h8z",
                );
                break;
            case "copy":
                circle.setAttribute("stroke", "orange");
                path.setAttribute(
                    "d",
                    "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
                );
                break;
            case "remove":
                circle.setAttribute("stroke", "red");
                path.setAttribute(
                    "d",
                    "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
                );
                break;
        }

        svg.appendChild(circle);
        svg.appendChild(path);
        return svg;
    }

    // Validate all numeric parameters for bit shape
    validateBitShapeParams(bit, groupName) {
        const required = ['diameter', 'length'];
        const typeSpecific = {
            conical: ['angle'],
            ball: ['height'],
            fillet: ['height', 'cornerRadius', 'flat'],
            bull: ['height', 'cornerRadius', 'flat'],
            profile: [] // profile uses profilePath instead of numeric params
        };
        
        // Check base required params
        for (const param of required) {
            const val = bit[param];
            if (val === undefined || val === null || isNaN(val) || !isFinite(val)) {
                return false;
            }
        }
        
        // Check type-specific params
        const specific = typeSpecific[groupName] || [];
        for (const param of specific) {
            const val = bit[param];
            if (val === undefined || val === null || isNaN(val) || !isFinite(val)) {
                return false;
            }
        }
        
        // Profile type requires profilePath
        if (groupName === 'profile' && !bit.profilePath) {
            return false;
        }
        
        return true;
    }

    // Create bit shape element based on parameters
    createBitShapeElement(
        bit,
        groupName,
        x = 0,
        y = 0,
        isSelected = false,
        includeShank = true,
        strokeWidth = 1,
    ) {
        // Create a group to contain bit and shank shapes
        const group = document.createElementNS(svgNS, "g");

        let bitShape;
        
        // Validate ALL required parameters before creating any SVG elements
        if (!bit || !this.validateBitShapeParams(bit, groupName)) {
            return group; // Return empty group - don't create invalid paths
        }
        
        // Get the fill color with proper opacity
        const fillColor = this.getBitFillColor(bit, isSelected);

        switch (groupName) {
            case "cylindrical":
                bitShape = document.createElementNS(svgNS, "rect");
                bitShape.setAttribute("x", x - bit.diameter / 2);
                bitShape.setAttribute("y", y - bit.length);
                bitShape.setAttribute("width", bit.diameter);
                bitShape.setAttribute("height", bit.length);
                bitShape.setAttribute("fill", fillColor);
                break;
            case "conical": {
                const oppositeAngle = bit.angle;
                const hypotenuse = bit.diameter;
                const height =
                    (hypotenuse / 2) *
                    (1 / Math.tan(this.angleToRad(oppositeAngle / 2)));
                // Validate calculated height
                if (isNaN(height) || !isFinite(height)) return group;
                const points = [
                    `${x},${y}`,
                    `${x - hypotenuse / 2},${y - height}`,
                    `${x - hypotenuse / 2},${y - bit.length}`,
                    `${x + hypotenuse / 2},${y - bit.length}`,
                    `${x + hypotenuse / 2},${y - height}`,
                ].join(" ");
                bitShape = document.createElementNS(svgNS, "polygon");
                bitShape.setAttribute("points", points);
                bitShape.setAttribute("fill", fillColor);
                break;
            }
            case "ball": {
                // Радиус дуги (формула через хорду и стрелу подъёма)
                const A = { x: x + bit.diameter / 2, y: y - bit.height };
                const B = { x: x - bit.diameter / 2, y: y - bit.height };
                const arcRad =
                    bit.height / 2 +
                    (this.distancePtToPt(A, B) * this.distancePtToPt(A, B)) /
                        (8 * bit.height);
                // Validate arc radius
                if (isNaN(arcRad) || !isFinite(arcRad) || arcRad <= 0) return group;
                bitShape = document.createElementNS(svgNS, "path");
                bitShape.setAttribute(
                    "d",
                    `M ${x + bit.diameter / 2} ${
                        y - bit.height
                    } A ${arcRad} ${arcRad} 0 0 1 ${x - bit.diameter / 2} ${
                        y - bit.height
                    }
        L ${x - bit.diameter / 2} ${y - bit.length}
        L ${x + bit.diameter / 2} ${y - bit.length} Z`,
                );
                bitShape.setAttribute("fill", fillColor);
                break;
            }
            case "fillet": {
                // Fillet cutter: cylindrical part + fillet profile
                const effectiveFlat = Math.max(bit.flat || 0, 0);
                const arcRad = bit.cornerRadius;
                // Validate arc radius
                if (isNaN(arcRad) || !isFinite(arcRad) || arcRad <= 0) return group;
                bitShape = document.createElementNS(svgNS, "path");
                bitShape.setAttribute(
                    "d",
                    `M ${x + bit.diameter / 2} ${
                        y - bit.height
                    } A ${arcRad} ${arcRad} 0 0 0 ${x + effectiveFlat / 2} ${y}
        L ${x - effectiveFlat / 2} ${y}
        A ${arcRad} ${arcRad} 0 0 0 ${x - bit.diameter / 2} ${y - bit.height}
        L ${x - bit.diameter / 2} ${y - bit.length}
        L ${x + bit.diameter / 2} ${y - bit.length} Z`,
                );
                bitShape.setAttribute("fill", fillColor);
                break;
            }
            case "bull": {
                // Bull-nose cutter: cylindrical part + bullnose profile
                const arcRad = bit.cornerRadius;
                // Validate arc radius
                if (isNaN(arcRad) || !isFinite(arcRad) || arcRad <= 0) return group;
                bitShape = document.createElementNS(svgNS, "path");
                bitShape.setAttribute(
                    "d",
                    `M ${x + bit.diameter / 2} ${
                        y - bit.height
                    } A ${arcRad} ${arcRad} 0 0 1 ${x + bit.flat / 2} ${y}
        L ${x - bit.flat / 2} ${y}
        A ${arcRad} ${arcRad} 0 0 1 ${x - bit.diameter / 2} ${y - bit.height}
        L ${x - bit.diameter / 2} ${y - bit.length}
        L ${x + bit.diameter / 2} ${y - bit.length} Z`,
                );
                bitShape.setAttribute("fill", fillColor);
                break;
            }
            case "profile": {
                // Profile cutter: custom profile defined by SVG path
                if (!bit.profilePath) return group;
                
                // Parse the profile path and transform it
                // The profilePath is defined with origin at bottom-center, Y pointing up
                // We need to: 1) flip Y (SVG Y is down), 2) translate to position
                const transformedPath = this.transformProfilePath(
                    bit.profilePath,
                    x,
                    y,
                    bit.diameter
                );
                
                if (!transformedPath) return group;
                
                bitShape = document.createElementNS(svgNS, "path");
                bitShape.setAttribute("d", transformedPath);
                bitShape.setAttribute("fill", fillColor);
                break;
            }
        }

        if (bitShape) {
            bitShape.setAttribute("stroke", "black");
            bitShape.setAttribute("stroke-width", strokeWidth);
            bitShape.classList.add("bit-shape");
            group.appendChild(bitShape);
        }

        // Add shank if parameters are present and includeShank is true
        if (
            includeShank &&
            bit.shankDiameter &&
            bit.totalLength &&
            bit.totalLength > bit.length
        ) {
            const shankLength = bit.totalLength - bit.length;
            const shankShape = document.createElementNS(svgNS, "rect");
            shankShape.setAttribute("x", x - bit.shankDiameter / 2);
            shankShape.setAttribute("y", y - bit.totalLength);
            shankShape.setAttribute("width", bit.shankDiameter);
            shankShape.setAttribute("height", shankLength);
            shankShape.setAttribute("fill", "rgba(64, 64, 64, 0.1)");
            shankShape.setAttribute("stroke", "black");
            shankShape.setAttribute("stroke-width", strokeWidth);
            shankShape.classList.add("shank-shape");
            group.appendChild(shankShape);
        }

        return group;
    }

    // Get the fill color for a bit with proper opacity
    getBitFillColor(bit, isSelected = false) {
        const baseColor = bit.fillColor;
        if (!baseColor) return "rgba(204, 204, 204, 0.3)"; // Default gray

        // Parse the base color to extract RGB values
        let r, g, b;
        if (baseColor.startsWith("rgba")) {
            // Extract RGB from rgba(r, g, b, a)
            const match = baseColor.match(
                /rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/,
            );
            if (match) {
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
            }
        } else if (baseColor.startsWith("rgb")) {
            // Extract RGB from rgb(r, g, b)
            const match = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
            }
        } else if (baseColor.startsWith("#")) {
            // Convert hex to RGB
            const hex = baseColor.slice(1);
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        }

        // Apply opacity: 0.6 for selected/modal, 0.3 for normal
        const opacity = isSelected ? 0.6 : 0.3;
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Helper functions needed for bit shapes
    distancePtToPt(p1, p2) {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }

    angleToRad(angle) {
        return (angle * Math.PI) / 180;
    }

    // Create bit groups
    async createBitGroups() {
        const allBits = await getBits();
        const groupOrder = Object.keys(allBits);

        groupOrder.forEach((groupName) => {
            // sort by diameter asc, then length asc (work on a shallow copy to avoid mutating storage)
            const bits = (allBits[groupName] || []).slice().sort((a, b) => {
                const d = (a.diameter || 0) - (b.diameter || 0);
                if (d !== 0) return d;
                return (a.length || 0) - (b.length || 0);
            });
            const groupDiv = document.createElement("div");
            groupDiv.className = "bit-group";

            const groupIcon = this.createSVGIcon(groupName);
            groupDiv.appendChild(groupIcon);

            const bitList = document.createElement("div");
            bitList.className = "bit-list";

            bits.forEach((bit, index) => {
                const bitDiv = document.createElement("div");
                bitDiv.className = "bit";

                const bitName = document.createElement("span");
                bitName.textContent = bit.name;
                bitDiv.appendChild(bitName);

                const bitIcon = this.createSVGIcon(groupName, bit, 40);
                bitDiv.appendChild(bitIcon);

                const actionIcons = document.createElement("div");
                actionIcons.className = "action-icons";
                ["edit", "copy", "remove"].forEach((action) => {
                    const actionIcon = this.createActionIcon(action);
                    actionIcon.addEventListener("click", async (e) => {
                        e.stopPropagation();

                        switch (action) {
                            case "edit":
                                // open edit modal for this bit
                                this.openBitModal(groupName, bit);
                                break;
                            case "copy":
                                await this.handleCopyClick(e, bit);
                                this.refreshBitGroups();
                                break;
                            case "remove":
                                await this.handleDeleteClick(e, bit);
                                this.refreshBitGroups();
                                break;
                        }
                    });
                    actionIcons.appendChild(actionIcon);
                });
                bitDiv.appendChild(actionIcons);

                bitDiv.addEventListener("click", () =>
                    this.drawBitShape(bit, groupName),
                );
                bitList.appendChild(bitDiv);
            });

            // Add '+' button
            const addButton = document.createElement("div");
            addButton.className = "bit add-bit";

            const addBitName = document.createElement("span");
            addBitName.textContent = "New";
            addButton.appendChild(addBitName);
            const addBitIcon = this.createSVGIcon("newBit", "newBit", 40);
            addButton.appendChild(addBitIcon);

            addButton.addEventListener("click", () =>
                this.openNewBitMenu(groupName),
            );

            bitList.appendChild(addButton);

            groupDiv.appendChild(bitList);

            groupDiv.addEventListener("mouseenter", (e) => {
                const rect = groupDiv.getBoundingClientRect();
                bitList.style.display = "flex";
                bitList.style.left = rect.right + 5 + "px";
                bitList.style.top = rect.top + rect.height / 2 + "px";
                bitList.style.transform = "translateY(-50%)";

                // Позиционировать невидимую зону для hover bridge
                const afterElement =
                    groupDiv.getAttribute("data-after-element");
                // Установить ::after динамически через JS (для невидимой зоны)
            });

            groupDiv.addEventListener("mouseleave", (e) => {
                // Не скрывать меню сразу - дать пользователю время дотянуться до него
                setTimeout(() => {
                    if (!bitList.matches(":hover")) {
                        bitList.style.display = "none";
                    }
                }, 100);
            });

            bitList.addEventListener("mouseenter", () => {
                bitList.style.display = "flex";
            });

            bitList.addEventListener("mouseleave", () => {
                bitList.style.display = "none";
            });

            this.bitGroups.appendChild(groupDiv);
        });
    }

    async refreshBitGroups() {
        this.bitGroups.innerHTML = "";
        await this.createBitGroups();
    }

    async handleCopyClick(e, bit) {
        const baseName = bit.name;
        const all = await getBits();
        // count existing copies with same baseName
        const existingCopies = Object.values(all)
            .flat()
            .filter((b) => b.name.startsWith(`${baseName} (`));
        const maxCopyNumber = existingCopies.reduce((max, b) => {
            const m = b.name.match(/\((\d+)\)$/);
            return m ? Math.max(max, parseInt(m[1], 10)) : max;
        }, 0);
        const name = `${baseName} (${maxCopyNumber + 1})`;
        const newBit = { ...bit, name };
        delete newBit.id; // ensure new id created

        // Find the group name for this bit
        const groupName = await this.findBitGroupName(bit);

        if (groupName) {
            addBit(groupName, newBit);
        }
    }

    async handleDeleteClick(e, bit) {
        if (confirm(`Are you sure you want to delete ${bit.name}?`)) {
            // Find the group name for this bit
            const groupName = await this.findBitGroupName(bit);

            if (groupName) {
                deleteBit(groupName, bit.id);
            }
        }
    }

    async isBitNameDuplicate(name, excludeId = null) {
        const all = await getBits();
        return Object.values(all || {})
            .flat()
            .some((bit) => bit.name === name && bit.id !== excludeId);
    }

    // Helper method to find group name for a bit
    async findBitGroupName(bit) {
        const allBits = await getBits();
        for (const group in allBits) {
            if (allBits[group].some((b) => b.id === bit.id)) {
                return group;
            }
        }
        return null;
    }

    // Helper method to evaluate a field value (handles formulas and variables)
    evaluateFieldValue(value, variableValues = {}) {
        if (!value || !value.trim()) return null;
        
        const trimmed = value.trim();
        
        // Check if it's a simple number
        const num = parseFloat(trimmed);
        if (!isNaN(num) && isFinite(num)) {
            return num;
        }
        
        // Check if it contains variable references {varName}
        let expression = trimmed;
        if (/\{[a-zA-Z][a-zA-Z0-9]*\}/.test(trimmed)) {
            expression = trimmed.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, varName) => {
                const varValue = variableValues[varName];
                if (varValue !== undefined && !isNaN(varValue)) {
                    return varValue;
                }
                return "0"; // Default to 0 if variable not found
            });
        }
        
        // Try to evaluate the expression
        try {
            const result = evaluateMathExpression(expression);
            if (!isNaN(result) && isFinite(result)) {
                return result;
            }
        } catch (e) {
            // Evaluation failed
        }
        
        return null;
    }

    // Helper method to collect variable values from form with dependency resolution
    collectVariableValues(form, groupName) {
        const values = {};
        const rawExpressions = {};
        const fieldToVarMap = {
            diameter: "d",
            length: "l", 
            shankDiameter: "sd",
            totalLength: "tl",
            toolnumber: "tn",
            angle: "a",
            height: "h",
            cornerRadius: "cr",
            flat: "f",
        };
        
        // First pass: collect all raw values (numbers and expressions) from standard fields
        Object.keys(fieldToVarMap).forEach(fieldId => {
            const input = form.querySelector(`#bit-${fieldId}`);
            if (input && input.value.trim()) {
                const varName = fieldToVarMap[fieldId];
                const value = input.value.trim();
                rawExpressions[varName] = value;
                
                // If it's a simple number, store it immediately
                const num = parseFloat(value);
                if (!isNaN(num) && isFinite(num) && value === num.toString()) {
                    values[varName] = num;
                }
            }
        });
        
        // Collect custom variable values if groupName is provided
        if (groupName) {
            const customVars = variablesManager.getCustomVariables(groupName);
            customVars.forEach(v => {
                const input = form.querySelector(`#bit-${v.varName}`);
                if (input && input.value.trim()) {
                    const value = input.value.trim();
                    rawExpressions[v.varName] = value;
                    
                    // If it's a simple number, store it immediately
                    const num = parseFloat(value);
                    if (!isNaN(num) && isFinite(num) && value === num.toString()) {
                        values[v.varName] = num;
                    }
                }
            });
        }
        
        // Resolve dependencies - multiple passes until no more changes
        let changed = true;
        let iterations = 0;
        const maxIterations = 10; // Prevent infinite loops
        
        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;
            
            Object.keys(rawExpressions).forEach(varName => {
                // Skip if already resolved
                if (values[varName] !== undefined) return;
                
                let expression = rawExpressions[varName];
                
                // Replace variable references {varName} with their resolved values
                expression = expression.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, refVar) => {
                    if (values[refVar] !== undefined) {
                        return values[refVar];
                    }
                    return match; // Keep reference if not yet resolved
                });
                
                // Check if all variables were resolved
                const hasUnresolvedVars = /\{[a-zA-Z][a-zA-Z0-9]*\}/.test(expression);
                
                if (!hasUnresolvedVars) {
                    // Try to evaluate
                    try {
                        const result = evaluateMathExpression(expression);
                        if (!isNaN(result) && isFinite(result)) {
                            values[varName] = result;
                            changed = true;
                        }
                    } catch (e) {
                        // Evaluation failed, try again next iteration
                    }
                }
            });
        }
        
        return values;
    }

    // Helper method to collect bit parameters from form
    // modalElement is needed for profile type to find profilePath input (it's outside form)
    collectBitParameters(form, groupName, modalElement = null) {
        const name = form.querySelector("#bit-name").value.trim();
        
        // Collect variable values for formula evaluation (pass groupName for custom vars)
        const variableValues = this.collectVariableValues(form, groupName);
        
        // Evaluate required fields
        const diameter = this.evaluateFieldValue(
            form.querySelector("#bit-diameter")?.value,
            variableValues
        );
        const length = this.evaluateFieldValue(
            form.querySelector("#bit-length")?.value,
            variableValues
        );
        const toolNumber = parseInt(
            this.evaluateFieldValue(form.querySelector("#bit-toolnumber")?.value, variableValues) || 1,
            10
        );

        // Color picker is now in the toolbar, not in the form
        const colorInput = document.querySelector("#bit-color");
        const color = colorInput ? colorInput.value : "#cccccc";
        
        let bitParams = {
            name,
            fillColor: color,
        };
        
        // Only add numeric values
        if (diameter !== null && !isNaN(diameter)) bitParams.diameter = diameter;
        if (length !== null && !isNaN(length)) bitParams.length = length;
        if (!isNaN(toolNumber)) bitParams.toolNumber = toolNumber;

        // Add shank parameters if present and valid
        const shankDiameter = this.evaluateFieldValue(
            form.querySelector("#bit-shankDiameter")?.value,
            variableValues
        );
        if (shankDiameter !== null && !isNaN(shankDiameter)) {
            bitParams.shankDiameter = shankDiameter;
        }

        const totalLength = this.evaluateFieldValue(
            form.querySelector("#bit-totalLength")?.value,
            variableValues
        );
        if (totalLength !== null && !isNaN(totalLength)) {
            bitParams.totalLength = totalLength;
        }

        // Add group-specific parameters
        if (groupName === "conical") {
            const angle = this.evaluateFieldValue(
                form.querySelector("#bit-angle")?.value,
                variableValues
            );
            if (angle !== null && !isNaN(angle)) bitParams.angle = angle;
        }
        if (groupName === "ball") {
            const height = this.evaluateFieldValue(
                form.querySelector("#bit-height")?.value,
                variableValues
            );
            if (height !== null && !isNaN(height)) bitParams.height = height;
        }
        if (groupName === "fillet" || groupName === "bull") {
            const height = this.evaluateFieldValue(
                form.querySelector("#bit-height")?.value,
                variableValues
            );
            if (height !== null && !isNaN(height)) bitParams.height = height;
            
            const cornerRadius = this.evaluateFieldValue(
                form.querySelector("#bit-cornerRadius")?.value,
                variableValues
            );
            if (cornerRadius !== null && !isNaN(cornerRadius)) bitParams.cornerRadius = cornerRadius;
            
            const flat = this.evaluateFieldValue(
                form.querySelector("#bit-flat")?.value,
                variableValues
            );
            if (flat !== null && !isNaN(flat)) bitParams.flat = flat;
        }

        // Profile type: collect profilePath (input is in modal, not in form)
        if (groupName === "profile" && modalElement) {
            const profilePathInput = modalElement.querySelector("#bit-profilePath");
            if (profilePathInput && profilePathInput.value.trim()) {
                bitParams.profilePath = profilePathInput.value.trim();
            }
        }

        return bitParams;
    }

    // Helper method to validate bit parameters
    // modalElement is needed for profile type to find profilePath input (it's outside form)
    validateBitParameters(form, groupName, modalElement = null) {
        const name = form.querySelector("#bit-name")?.value?.trim();
        if (!name) return false;

        // Check required fields have values (not empty)
        const diameter = form.querySelector("#bit-diameter")?.value?.trim();
        if (!diameter) return false;

        const length = form.querySelector("#bit-length")?.value?.trim();
        if (!length) return false;

        const toolNumber = form.querySelector("#bit-toolnumber")?.value?.trim();
        if (!toolNumber) return false;

        // Check type-specific required fields
        if (groupName === "conical") {
            const angle = form.querySelector("#bit-angle")?.value?.trim();
            if (!angle) return false;
        }

        if (groupName === "ball") {
            const height = form.querySelector("#bit-height")?.value?.trim();
            if (!height) return false;
        }

        if (groupName === "fillet" || groupName === "bull") {
            const height = form.querySelector("#bit-height")?.value?.trim();
            const cornerRadius = form.querySelector("#bit-cornerRadius")?.value?.trim();
            const flat = form.querySelector("#bit-flat")?.value?.trim();
            if (!height || !cornerRadius || !flat) return false;
        }

        // Profile type requires profilePath (input is in modal, not in form)
        if (groupName === "profile") {
            const profilePath = modalElement?.querySelector("#bit-profilePath")?.value?.trim();
            if (!profilePath) return false;
        }

        // Now check if we can actually evaluate the values for drawing (pass groupName for custom vars)
        const variableValues = this.collectVariableValues(form, groupName);
        
        const evaluatedDiameter = this.evaluateFieldValue(diameter, variableValues);
        const evaluatedLength = this.evaluateFieldValue(length, variableValues);
        
        // Must have valid diameter and length for drawing
        if (evaluatedDiameter === null || evaluatedLength === null) return false;
        if (evaluatedDiameter <= 0 || evaluatedLength <= 0) return false;

        return true;
    }

    // Helper method to build bit payload for saving
    // modalElement is needed for profile type to find profilePath input (it's outside form)
    buildBitPayload(form, groupName, modalElement = null) {
        // Get resolved variable values (pass groupName for custom vars)
        const variableValues = this.collectVariableValues(form, groupName);
        
        // Helper to get raw value from input
        const getRawValue = (fieldId) => {
            const input = form.querySelector(`#bit-${fieldId}`);
            return input ? input.value.trim() : "";
        };
        
        // Helper to get evaluated value
        const getEvaluatedValue = (fieldId, varName) => {
            const raw = getRawValue(fieldId);
            if (!raw) return null;
            
            // Simple number
            const num = parseFloat(raw);
            if (!isNaN(num) && isFinite(num) && raw === num.toString()) {
                return num;
            }
            
            // Use resolved variable value if available
            if (varName && variableValues[varName] !== undefined) {
                return variableValues[varName];
            }
            
            // Try to evaluate
            return this.evaluateFieldValue(raw, variableValues);
        };
        
        // Helper to evaluate name with variables
        const evaluateName = (rawName) => {
            if (!rawName) return "";
            
            // Replace variable references {varName} with their values
            let evaluated = rawName.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, varName) => {
                if (variableValues[varName] !== undefined) {
                    return variableValues[varName];
                }
                return match; // Keep original if variable not found
            });
            
            return evaluated;
        };

        // Color picker is now in the toolbar, not in the form
        const colorInput = document.querySelector("#bit-color");
        const color = colorInput ? colorInput.value : "#cccccc";
        
        // Get raw name and evaluated name
        const rawName = form.querySelector("#bit-name").value.trim();
        const evaluatedName = evaluateName(rawName);
        
        const payload = {
            name: evaluatedName || rawName,
            fillColor: color,
            toolNumber: parseInt(getEvaluatedValue("toolnumber", "tn")) || 1,
        };
        
        // Store raw name if it contains variables
        if (rawName !== evaluatedName && /\{[a-zA-Z][a-zA-Z0-9]*\}/.test(rawName)) {
            payload.rawName = rawName;
        }

        // Store raw values (formulas) for future editing
        const rawValues = {};
        const fieldToVarMap = {
            diameter: "d",
            length: "l", 
            shankDiameter: "sd",
            totalLength: "tl",
            angle: "a",
            height: "h",
            cornerRadius: "cr",
            flat: "f",
        };
        
        // Collect raw values - store empty string if empty, not skip
        Object.keys(fieldToVarMap).forEach(fieldId => {
            const raw = getRawValue(fieldId);
            rawValues[fieldId] = raw; // Always store, even if empty
        });
        
        // Store raw values in payload
        payload.rawValues = rawValues;

        // Store evaluated numeric values for geometry - use 0 if empty/invalid
        const diameter = getEvaluatedValue("diameter", "d");
        const length = getEvaluatedValue("length", "l");
        
        payload.diameter = diameter !== null ? diameter : 0;
        payload.length = length !== null ? length : 0;

        // Add optional shank parameters - store 0 if empty
        const shankDiameter = getEvaluatedValue("shankDiameter", "sd");
        payload.shankDiameter = shankDiameter !== null ? shankDiameter : 0;

        const totalLength = getEvaluatedValue("totalLength", "tl");
        payload.totalLength = totalLength !== null ? totalLength : 0;

        // Add group-specific parameters - store 0 if empty
        if (groupName === "conical") {
            const angle = getEvaluatedValue("angle", "a");
            payload.angle = angle !== null ? angle : 0;
        }
        if (groupName === "ball") {
            const height = getEvaluatedValue("height", "h");
            payload.height = height !== null ? height : 0;
        }
        if (groupName === "fillet" || groupName === "bull") {
            const height = getEvaluatedValue("height", "h");
            payload.height = height !== null ? height : 0;
            
            const cornerRadius = getEvaluatedValue("cornerRadius", "cr");
            payload.cornerRadius = cornerRadius !== null ? cornerRadius : 0;
            
            const flat = getEvaluatedValue("flat", "f");
            payload.flat = flat !== null ? flat : 0;
        }
        
        // Profile type: store profilePath (evaluated) and rawProfilePath (with formulas)
        // Inputs are in modal, not in form
        if (groupName === "profile" && modalElement) {
            const profilePathInput = modalElement.querySelector("#bit-profilePath");
            if (profilePathInput && profilePathInput.value.trim()) {
                payload.profilePath = profilePathInput.value.trim();
            }
            const rawProfilePathInput = modalElement.querySelector("#bit-rawProfilePath");
            if (rawProfilePathInput && rawProfilePathInput.value.trim()) {
                payload.rawProfilePath = rawProfilePathInput.value.trim();
            }
        }
        
        // Store custom variable values
        const customVars = variablesManager.getCustomVariables(groupName);
        const customValues = {};
        customVars.forEach(v => {
            const input = form.querySelector(`#bit-${v.varName}`);
            if (input) {
                customValues[v.varName] = input.value.trim();
            }
        });
        if (Object.keys(customValues).length > 0) {
            payload.customValues = customValues;
        }

        return payload;
    }

    openNewBitMenu(groupName) {
        // reuse unified modal for create/edit - open as "new"
        this.openBitModal(groupName, null);
    }

    // Unified create/edit modal with new flex grid layout
    openBitModal(groupName, bit = null) {
        const isEdit = !!bit;
        
        // Use rawValues if available (formulas), otherwise fall back to numeric values
        const rawVals = bit?.rawValues || {};
        const customVals = bit?.customValues || {};
        
        // Use rawName if available, otherwise use name
        const displayName = bit?.rawName || bit?.name || "";
        
        const defaultValues = {
            name: displayName,
            diameter: rawVals.diameter !== undefined ? rawVals.diameter : (bit ? bit.diameter : ""),
            length: rawVals.length !== undefined ? rawVals.length : (bit ? bit.length : ""),
            shankDiameter: rawVals.shankDiameter !== undefined ? rawVals.shankDiameter : (bit ? bit.shankDiameter : ""),
            totalLength: rawVals.totalLength !== undefined ? rawVals.totalLength : (bit ? bit.totalLength : ""),
            angle: rawVals.angle !== undefined ? rawVals.angle : (bit ? bit.angle : ""),
            height: rawVals.height !== undefined ? rawVals.height : (bit ? bit.height : ""),
            cornerRadius: rawVals.cornerRadius !== undefined ? rawVals.cornerRadius : (bit ? bit.cornerRadius : ""),
            flat: rawVals.flat !== undefined ? rawVals.flat : (bit ? bit.flat : ""),
            profilePath: bit ? bit.profilePath : "",
            rawProfilePath: bit ? (bit.rawProfilePath || bit.profilePath) : "", // raw path with formulas
            toolNumber: bit && bit.toolNumber !== undefined ? bit.toolNumber : 1,
            color: bit && bit.fillColor ? bit.fillColor : "#cccccc",
            customValues: customVals,
        };

        // Get variables for this bit type
        const variables = variablesManager.getVariablesForType(groupName);
        const customVariables = variablesManager.getCustomVariables(groupName);

        // Generate form rows without profile path (will be added separately)
        const formRows = this.generateFormRows(groupName, defaultValues, variables, false);
        const profilePathHtml = groupName === "profile" ? this.generateProfilePathHtml(defaultValues) : "";
        
        const modal = document.createElement("div");
        modal.className = "modal";
        modal.innerHTML = `
    <div class="modal-content">
      <h2>${isEdit ? "Edit Bit" : "New Bit Parameters"}</h2>
      <div class="modal-body">
        <div class="bit-form-container">
          <form id="bit-form" class="bit-form">
            <div class="bit-form-grid" id="bit-form-grid">
              ${formRows}
            </div>
          </form>
          <button type="button" class="add-field-btn" id="add-custom-field-btn">
            + Add Custom Field
          </button>
          ${profilePathHtml}
        </div>
        <div id="bit-preview" class="bit-preview">
          <svg id="bit-preview-canvas" width="400" height="400"></svg>
          <div id="preview-toolbar">
            <button type="button" id="preview-zoom-in" title="Zoom In">+</button>
            <button type="button" id="preview-zoom-out" title="Zoom Out">-</button>
            <button type="button" id="preview-fit" title="Fit to Scale">Fit</button>
            <button type="button" id="preview-toggle-grid" title="Toggle Grid">Grid</button>
            <input type="color" id="bit-color" value="${defaultValues.color}" title="Bit Color">
            ${groupName === "profile" ? '<button type="button" id="preview-edit" class="preview-edit-btn" title="Edit profile shape">Edit</button>' : ""}
          </div>
          <div id="text-editor-panel"></div>
        </div>
      </div>
      <div class="button-group">
        <button type="button" id="cancel-btn">Cancel</button>
        <button type="button" id="ok-btn">OK</button>
      </div>
    </div>
  `;

        document.body.appendChild(modal);
        const form = modal.querySelector("#bit-form");
        const formGrid = modal.querySelector("#bit-form-grid");

        // Preview canvas manager
        let previewCanvasManager;
        let previewRenderState = {
            signature: null,
            shape: null,
            bitParams: null,
        };

        // Initialize preview canvas with larger size
        const initializePreviewCanvas = () => {
            previewCanvasManager = new CanvasManager({
                canvas: modal.querySelector("#bit-preview-canvas"),
                width: 400,
                height: 400,
                enableZoom: true,
                enablePan: true,
                enableGrid: true,
                enableMouseEvents: true,
                gridSize: 1,
                initialZoom: 1,
                // Grid anchor at origin (0, 0) for preview canvas
                gridAnchorX: 0,
                gridAnchorY: 0,
                layers: ["grid", "bits", "overlay"],
                onZoom: (zoomLevel) => {
                    updatePreviewStrokeWidths(zoomLevel);
                },
            });
        };

        // Function to update stroke widths in preview
        function updatePreviewStrokeWidths(zoomLevel = previewCanvasManager?.zoomLevel) {
            if (!zoomLevel || !previewCanvasManager) return;
            const thickness = Math.max(0.1, 0.5 / Math.sqrt(zoomLevel));

            const previewBitsLayer = previewCanvasManager.getLayer("bits");
            const bitShape = previewBitsLayer?.querySelector(".bit-shape");
            const shankShape = previewBitsLayer?.querySelector(".shank-shape");
            if (bitShape) bitShape.setAttribute("stroke-width", thickness);
            if (shankShape) shankShape.setAttribute("stroke-width", thickness);

            if (previewRenderState.shape) {
                drawAnchorAndAxis(previewRenderState.shape);
            }
        }

        // Draw anchor cross and axis line.
        // Bit is always placed with anchor (bottom-center) at (0, 0),
        // so grid anchor = (0,0) is fixed in CanvasManager config — no dynamic update needed.
        const drawAnchorAndAxis = (bitShape) => {
            const overlayLayer = previewCanvasManager.getLayer("overlay");
            if (!overlayLayer) return;
            overlayLayer.innerHTML = "";

            // Anchor is always at origin
            const anchorX = 0;
            const anchorY = 0;

            // Find top of bit for the axis line (use getBBox on attached element)
            let topY = -50;
            if (bitShape) {
                try {
                    const bbox = bitShape.getBBox();
                    if (isFinite(bbox.y)) topY = bbox.y - 5;
                } catch (e) {}
            }

            const zoom = previewCanvasManager.zoomLevel || 1;
            const axisStrokeWidth = Math.min(0.1, 1 / Math.sqrt(zoom));
            const crossStrokeWidth = Math.min(0.1, 1 / Math.sqrt(zoom));
            const crossSize = Math.min(3, 5 / Math.sqrt(zoom));

            // Axis line (dashed gray, from anchor upward)
            const axisLine = document.createElementNS(svgNS, "line");
            axisLine.setAttribute("x1", anchorX);
            axisLine.setAttribute("y1", anchorY);
            axisLine.setAttribute("x2", anchorX);
            axisLine.setAttribute("y2", topY);
            axisLine.setAttribute("stroke", "gray");
            axisLine.setAttribute("stroke-width", axisStrokeWidth);
            axisLine.setAttribute("stroke-dasharray", `${3/zoom},${3/zoom}`);
            axisLine.classList.add("bit-preview-axis");
            overlayLayer.appendChild(axisLine);

            // Anchor cross (red)
            const crossGroup = document.createElementNS(svgNS, "g");
            crossGroup.classList.add("bit-preview-anchor");

            const hLine = document.createElementNS(svgNS, "line");
            hLine.setAttribute("x1", anchorX - crossSize); hLine.setAttribute("y1", anchorY);
            hLine.setAttribute("x2", anchorX + crossSize); hLine.setAttribute("y2", anchorY);
            hLine.setAttribute("stroke", "red");
            hLine.setAttribute("stroke-width", crossStrokeWidth);
            crossGroup.appendChild(hLine);

            const vLine = document.createElementNS(svgNS, "line");
            vLine.setAttribute("x1", anchorX); vLine.setAttribute("y1", anchorY - crossSize);
            vLine.setAttribute("x2", anchorX); vLine.setAttribute("y2", anchorY + crossSize);
            vLine.setAttribute("stroke", "red");
            vLine.setAttribute("stroke-width", crossStrokeWidth);
            crossGroup.appendChild(vLine);

            overlayLayer.appendChild(crossGroup);
        };

        // Function to update bit preview
        const updateBitPreview = () => {
            const previewBitsLayer = previewCanvasManager.getLayer("bits");

            if (!this.validateBitParameters(form, groupName, modal)) {
                previewBitsLayer.innerHTML = "";
                previewRenderState.signature = null;
                previewRenderState.shape = null;
                previewRenderState.bitParams = null;
                const text = document.createElementNS(svgNS, "text");
                text.setAttribute("x", 0);
                text.setAttribute("y", 10);
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("font-size", "14");
                text.setAttribute("fill", "#999");
                text.textContent = "Fill all parameters";
                previewBitsLayer.appendChild(text);
                drawAnchorAndAxis(null);
                return;
            }

            const bitParams = this.collectBitParameters(form, groupName, modal);
            const renderSignature = JSON.stringify({
                groupName,
                bitParams,
                color: modal.querySelector("#bit-color")?.value,
            });

            if (previewRenderState.signature === renderSignature && previewRenderState.shape) {
                drawAnchorAndAxis(previewRenderState.shape);
                updateFormulaResults();
                return;
            }

            previewBitsLayer.innerHTML = "";

            const strokeWidth = Math.max(0.1, 0.5 / Math.sqrt(previewCanvasManager.zoomLevel));

            // Place bit with anchor (bottom-center) at canvas origin (0, 0).
            // createBitShapeElement(bit, group, x, y) — x,y IS the anchor position.
            const shape = this.createBitShapeElement(
                bitParams, groupName,
                0, 0,   // anchor → origin
                true, true, strokeWidth,
            );

            previewBitsLayer.appendChild(shape);
            previewRenderState.signature = renderSignature;
            previewRenderState.shape = shape;
            previewRenderState.bitParams = bitParams;

            // Fit to BITS ONLY first — overlay has stale-positioned debug text that would break bbox
            fitAllVisibleElements(previewCanvasManager, ["bits"], 10);

            // Now draw axis and anchor cross with the CORRECT viewBox already set
            drawAnchorAndAxis(shape);

            updateFormulaResults();
        };

        // Function to update formula results display
        const updateFormulaResults = () => {
            // Use the same dependency resolution as collectVariableValues (pass groupName for custom vars)
            const variableValues = this.collectVariableValues(form, groupName);
            
            const fieldToVarMap = {
                diameter: "d",
                length: "l", 
                shankDiameter: "sd",
                totalLength: "tl",
                toolnumber: "tn",
                angle: "a",
                height: "h",
                cornerRadius: "cr",
                flat: "f",
            };

            // Evaluate and show results for each row
            const rows = formGrid.querySelectorAll(".bit-form-row");
            rows.forEach(row => {
                const input = row.querySelector("input");
                const resultEl = row.querySelector(".formula-result");
                if (!input || !resultEl) return;

                const value = input.value.trim();
                if (!value) {
                    resultEl.textContent = "";
                    resultEl.classList.remove("visible");
                    return;
                }

                // Get the field ID
                const fieldId = input.id.replace("bit-", "");
                
                // Special handling for name field - show evaluated name
                if (fieldId === "name") {
                    const hasVariableRef = /\{[a-zA-Z][a-zA-Z0-9]*\}/.test(value);
                    if (hasVariableRef) {
                        // Evaluate name with variables
                        let evaluated = value.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, varName) => {
                            if (variableValues[varName] !== undefined) {
                                return variableValues[varName];
                            }
                            return match;
                        });
                        
                        if (evaluated !== value) {
                            resultEl.textContent = `= ${evaluated}`;
                            resultEl.classList.add("visible");
                        } else {
                            resultEl.textContent = "";
                            resultEl.classList.remove("visible");
                        }
                    } else {
                        resultEl.textContent = "";
                        resultEl.classList.remove("visible");
                    }
                    return;
                }

                // Check if value contains a formula (has {varName} or math expression)
                const hasVariableRef = /\{[a-zA-Z][a-zA-Z0-9]*\}/.test(value);
                const hasMathOps = /[+\-*/()]/.test(value) && !/^\d*\.?\d*$/.test(value);

                if (!hasVariableRef && !hasMathOps) {
                    // Plain number, no result needed
                    resultEl.textContent = "";
                    resultEl.classList.remove("visible");
                    return;
                }

                // Get the variable name for this field - check both standard and custom fields
                let varName = fieldToVarMap[fieldId];
                
                // If not in standard mapping, check if it's a custom variable (fieldId IS the varName)
                if (!varName) {
                    varName = fieldId;
                }
                
                // Check if we have a resolved value for this variable
                if (variableValues[varName] !== undefined) {
                    const resolved = variableValues[varName];
                    const numValue = parseFloat(value);
                    
                    // Show result if it's different from the raw input
                    if (isNaN(numValue) || Math.abs(resolved - numValue) > 0.0001) {
                        resultEl.textContent = `= ${resolved.toFixed(2)}`;
                        resultEl.classList.add("visible");
                    } else {
                        resultEl.textContent = "";
                        resultEl.classList.remove("visible");
                    }
                } else {
                    // Variable not resolved (circular dependency or missing reference)
                    resultEl.textContent = "?";
                    resultEl.classList.add("visible");
                }
            });
        };

        // Preview zoom functions
        const previewZoomIn = () => {
            previewCanvasManager.zoomIn();
            updatePreviewStrokeWidths();
        };

        const previewZoomOut = () => {
            previewCanvasManager.zoomOut();
            updatePreviewStrokeWidths();
        };

        const previewFitToScale = () => {
            // Fit to bits only (overlay has debug text that would skew bbox)
            fitAllVisibleElements(previewCanvasManager, ["bits"], 10);
            if (previewRenderState.shape) drawAnchorAndAxis(previewRenderState.shape);
            updatePreviewStrokeWidths();
        };

        const togglePreviewGrid = () => {
            previewCanvasManager.toggleGrid();
        };

        // Initialize preview canvas
        initializePreviewCanvas();

        // Add event listeners for zoom buttons
        modal.querySelector("#preview-zoom-in").addEventListener("click", () => {
            previewZoomIn();
        });

        modal.querySelector("#preview-zoom-out").addEventListener("click", () => {
            previewZoomOut();
        });

        modal.querySelector("#preview-fit").addEventListener("click", () => {
            previewFitToScale();
        });

        modal.querySelector("#preview-toggle-grid").addEventListener("click", () => {
            togglePreviewGrid();
        });

        // Profile editor — only wired up for "profile" type bits
        if (groupName === "profile") {
            const profileEditor = new ProfileEditor();

            modal.querySelector("#preview-edit")?.addEventListener("click", () => {
                const variableValues = this.collectVariableValues(form, groupName);
                // Use the evaluated path from the hidden input (set by PathEditor).
                // Fall back to defaultValues.profilePath (bit.profilePath for existing bits).
                const evaluatedInput = modal.querySelector("#bit-profilePath");
                const profilePath    = (evaluatedInput?.value?.trim()) || defaultValues.profilePath || "";

                // Snapshot the raw formula path BEFORE entering edit (setPath will overwrite it).
                const originalRawPath = pathEditorInstance?.getPath() ?? "";


                // Track whether the user confirmed the edit (Done) or cancelled it.
                let editSaved = false;

                profileEditor.enter({
                    modal,
                    canvasManager: previewCanvasManager,
                    profilePath,
                    variableValues,
                    pathEditor: pathEditorInstance,
                    onSave: (newPath) => {
                        editSaved = true;
                        if (newPath !== null) {
                            // Merge numeric canvas result with original formula path.
                            // Coordinates that did not change keep their formula tokens.
                            const merged = mergePathWithFormulas(newPath, originalRawPath, pathEditorInstance);
                            // Reload the merged path into PathEditor with onChange suppressed.
                            // updateHiddenInput() fires inside each addLine() call and writes:
                            //   - hiddenInput    (#bit-profilePath)    <- EVALUATED numeric path
                            //   - rawHiddenInput (#bit-rawProfilePath) <- raw formula path
                            // CRITICAL: hiddenInput must be a pure numeric path before
                            // updateBitPreview() reads it. Formula tokens like {d} passed to
                            // transformProfilePath() cause getBBox() to freeze the browser.
                            if (pathEditorInstance) {
                                const savedOnChange = pathEditorInstance.onChange;
                                pathEditorInstance.onChange = () => {};   // suppress during reload
                                pathEditorInstance.setPath(merged);
                                pathEditorInstance.onChange = savedOnChange;
                            }
                        }
                        updateBitPreview();
                    },
                    // Always called after exit (save or cancel) to restore preview rendering.
                    // EditorCanvas.destroy() clears bitsLayer.innerHTML, so the cached shape
                    // DOM element is detached. Reset the signature to force a full re-render.
                    onClose: () => {
                        if (!editSaved && pathEditorInstance) {
                            // Cancel: restore the path that was in the PathEditor before
                            // editing started (preserving any formula tokens).
                            const savedOnChange = pathEditorInstance.onChange;
                            pathEditorInstance.onChange = () => {};
                            pathEditorInstance.setPath(originalRawPath);
                            pathEditorInstance.onChange = savedOnChange;
                        }
                        previewRenderState.signature = null;
                        previewRenderState.shape = null;
                        updateBitPreview();
                    },
                });
            });
        }

        // Add input event listeners
        const addInputListeners = () => {
            const inputs = formGrid.querySelectorAll("input");
            inputs.forEach((input) => {
                // Don't replace input value on blur - keep the formula
                // Just update the preview and formula results
                input.addEventListener("input", () => {
                    updateBitPreview();
                    updateFormulaResults();
                });
            });
        };

        addInputListeners();

        // Initialize PathEditor for profile type
        let pathEditorInstance = null;
        const profilePathInput = modal.querySelector("#bit-profilePath");
        const pathEditorContainer = modal.querySelector("#path-editor-container");
        
        if (groupName === "profile" && pathEditorContainer && profilePathInput) {
            // Get variable values for the path editor
            const getVariableValues = () => this.collectVariableValues(form, groupName);
            const rawProfilePathInput = modal.querySelector("#bit-rawProfilePath");
            
            // Create PathEditor instance
            pathEditorInstance = new PathEditor({
                container: pathEditorContainer,
                hiddenInput: profilePathInput,           // evaluated path (for rendering)
                rawHiddenInput: rawProfilePathInput,     // raw path with formulas (for saving)
                onChange: (path) => {
                    updateBitPreview();
                },
                variableValues: getVariableValues()
            });
            
            // Set initial path - prefer rawProfilePath (has formulas), fallback to profilePath
            const initialPath = defaultValues.rawProfilePath || defaultValues.profilePath;
            if (initialPath) {
                pathEditorInstance.setPath(initialPath);
            }
            
            // Update variable values when form inputs change
            const updatePathEditorVariables = () => {
                pathEditorInstance.setVariableValues(getVariableValues());
            };
            
            // Add listeners to update variables
            formGrid.querySelectorAll("input").forEach(input => {
                input.addEventListener("input", updatePathEditorVariables);
            });
        }

        // Color input listener
        const colorInput = modal.querySelector("#bit-color");
        colorInput.addEventListener("input", () => {
            previewRenderState.signature = null;
            updateBitPreview();
        });

        // Add custom field button
        modal.querySelector("#add-custom-field-btn").addEventListener("click", () => {
            this.openAddCustomFieldModal(groupName, formGrid, () => {
                addInputListeners();
                updateBitPreview();
                // Update PathEditor variables when new custom field is added
                if (pathEditorInstance) {
                    pathEditorInstance.setVariableValues(this.collectVariableValues(form, groupName));
                }
                // Add listener to update PathEditor when new field value changes
                if (pathEditorInstance) {
                    formGrid.querySelectorAll("input").forEach(input => {
                        // Remove old listener by replacing with new one (simple approach)
                        input.addEventListener("input", () => {
                            pathEditorInstance.setVariableValues(this.collectVariableValues(form, groupName));
                        });
                    });
                }
            });
        });

        // Add delete field listeners
        const addDeleteListeners = () => {
            const deleteButtons = formGrid.querySelectorAll(".delete-field-btn:not(:disabled)");
            deleteButtons.forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    const row = e.target.closest(".bit-form-row");
                    const varId = row?.dataset?.varId;
                    if (varId && variablesManager.removeCustomVariable(groupName, varId)) {
                        row.remove();
                        updateBitPreview();
                    }
                });
            });
        };

        addDeleteListeners();

        // Update canvas bit in real-time for edit operations
        if (isEdit && bit) {
            const updateCanvasBit = () => {
                const currentParams = this.collectBitParameters(form, groupName);
                if (this.onUpdateCanvasBitWithParams) {
                    this.onUpdateCanvasBitWithParams(bit.id, currentParams, groupName);
                }
            };

            formGrid.addEventListener("input", updateCanvasBit);
            colorInput.addEventListener("input", updateCanvasBit);
        }

        // Initial preview update
        updateBitPreview();
        previewFitToScale();

        // Prevent form submission on Enter key
        form.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
            }
        });

        // OK button click handler
        modal.querySelector("#ok-btn").addEventListener("click", async () => {
            const name = form.querySelector("#bit-name").value.trim();

            if (await this.isBitNameDuplicate(name, isEdit ? bit?.id : null)) {
                alert("A bit with this name already exists. Please choose a different name.");
                return;
            }

            const payload = this.buildBitPayload(form, groupName, modal);

            let updatedBit;
            if (isEdit) {
                updatedBit = updateBit(groupName, bit.id, payload);
            } else {
                updatedBit = addBit(groupName, payload);
            }

            if (isEdit) {
                this.updateCanvasBitsForBitId(updatedBit.id);
            }

            document.body.removeChild(modal);
            this.refreshBitGroups();
        });

        // Cancel button
        modal.querySelector("#cancel-btn").addEventListener("click", () => {
            document.body.removeChild(modal);
        });
    }

    // Generate profile path HTML (separate from form)
    generateProfilePathHtml(defaultValues) {
        const profilePathValue = defaultValues.profilePath || "";
        const rawProfilePathValue = defaultValues.rawProfilePath || profilePathValue;
        return `
            <div class="profile-path-section">
                <div class="profile-path-header">Profile Path:</div>
                <div id="path-editor-container"></div>
                <input type="hidden" id="bit-profilePath" value="${profilePathValue}">
                <input type="hidden" id="bit-rawProfilePath" value="${rawProfilePathValue}">
            </div>
        `;
    }

    // Generate form rows for flex grid layout
    generateFormRows(groupName, defaultValues, variables, includeProfilePath = true) {
        let rows = "";

        // Name field (always first) - supports variables like R{cr}
        rows += `
            <div class="bit-form-row" data-field="name">
                <label for="bit-name">Name:</label>
                <div class="input-wrapper">
                    <input type="text" id="bit-name" required value="${defaultValues.name}">
                    <div class="formula-result name-result"></div>
                </div>
                <button type="button" class="delete-field-btn" disabled style="visibility:hidden;">×</button>
            </div>
        `;

        // Common fields
        const fieldConfigs = [
            { id: "diameter", label: "Diameter", varName: "d", required: true, default: defaultValues.diameter },
            { id: "length", label: "Length", varName: "l", required: true, default: defaultValues.length },
            { id: "shankDiameter", label: "Shank Diameter", varName: "sd", required: false, default: defaultValues.shankDiameter },
            { id: "totalLength", label: "Total Length", varName: "tl", required: false, default: defaultValues.totalLength },
        ];

        // Type-specific fields
        if (groupName === "conical") {
            fieldConfigs.push({ id: "angle", label: "Angle", varName: "a", required: true, default: defaultValues.angle });
        }
        if (groupName === "ball") {
            fieldConfigs.push({ id: "height", label: "Height", varName: "h", required: true, default: defaultValues.height });
        }
        if (groupName === "fillet" || groupName === "bull") {
            fieldConfigs.push({ id: "height", label: "Height", varName: "h", required: true, default: defaultValues.height });
            fieldConfigs.push({ id: "cornerRadius", label: "Corner Radius", varName: "cr", required: true, default: defaultValues.cornerRadius });
            fieldConfigs.push({ id: "flat", label: "Flat", varName: "f", required: true, default: defaultValues.flat });
        }

        // Tool number
        fieldConfigs.push({ id: "toolnumber", label: "Tool Number", varName: "tn", required: true, default: defaultValues.toolNumber, type: "text" });

    // Generate rows for each field - all have 3 columns, delete button hidden for default fields
        fieldConfigs.forEach(config => {
            const varInfo = variables.find(v => v.varName === config.varName);
            const varDisplay = varInfo ? `<span class="var-name">{${config.varName}}</span>` : "";
            const inputType = config.type || "text";
            
            rows += `
                <div class="bit-form-row" data-field="${config.id}">
                    <label for="bit-${config.id}">${config.label}:${varDisplay}</label>
                    <div class="input-wrapper">
                        <input type="${inputType}" id="bit-${config.id}" ${config.required ? "required" : ""} value="${config.default}" ${config.type === "number" ? 'min="1" step="1"' : ""}>
                        <div class="formula-result"></div>
                    </div>
                    <button type="button" class="delete-field-btn" disabled style="visibility:hidden;">×</button>
                </div>
            `;
        });

        // Add custom variable rows - delete button is visible
        const customVars = variablesManager.getCustomVariables(groupName);
        customVars.forEach(v => {
            // Use saved customValue if available, otherwise use defaultValue
            const savedValue = defaultValues.customValues?.[v.varName];
            const fieldValue = savedValue !== undefined ? savedValue : (v.defaultValue || "");
            rows += `
                <div class="bit-form-row" data-field="${v.varName}" data-var-id="${v.id}">
                    <label for="bit-${v.varName}">${v.name}:<span class="var-name">{${v.varName}}</span></label>
                    <div class="input-wrapper">
                        <input type="text" id="bit-${v.varName}" value="${fieldValue}">
                        <div class="formula-result"></div>
                    </div>
                    <button type="button" class="delete-field-btn visible" title="Delete custom field">×</button>
                </div>
            `;
        });

        return rows;
    }

    // Open modal to add custom field
    openAddCustomFieldModal(groupName, formGrid, onUpdate) {
        const availableVars = variablesManager.getAvailableCustomVariables(groupName);
        
        const modal = document.createElement("div");
        modal.className = "custom-field-modal";
        modal.innerHTML = `
            <div class="custom-field-modal-content">
                <h3>Add Custom Field</h3>
                <div class="field-row">
                    <label for="custom-field-select">Select existing or create new:</label>
                    <select id="custom-field-select">
                        <option value="">-- Create new field --</option>
                        ${availableVars.map(v => `<option value="${v.varName}" data-name="${v.name}" data-default="${v.defaultValue}" data-unit="${v.unit}">${v.name} ({${v.varName}}) - from ${v.sourceType}</option>`).join("")}
                    </select>
                </div>
                <div id="new-field-fields">
                    <div class="field-row">
                        <label for="custom-field-name">Field Name:</label>
                        <input type="text" id="custom-field-name" placeholder="e.g., Tip Radius">
                    </div>
                    <div class="field-row">
                        <label for="custom-field-var">Variable Name:</label>
                        <input type="text" id="custom-field-var" placeholder="e.g., tr" maxlength="3">
                    </div>
                    <div class="field-row">
                        <label for="custom-field-default">Default Value:</label>
                        <input type="text" id="custom-field-default" placeholder="e.g., 0">
                    </div>
                </div>
                <div class="button-group">
                    <button type="button" id="custom-field-cancel">Cancel</button>
                    <button type="button" id="custom-field-add">Add</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const select = modal.querySelector("#custom-field-select");
        const newFieldFields = modal.querySelector("#new-field-fields");
        const nameInput = modal.querySelector("#custom-field-name");
        const varInput = modal.querySelector("#custom-field-var");
        const defaultInput = modal.querySelector("#custom-field-default");

        // Toggle new field fields based on selection
        select.addEventListener("change", () => {
            if (select.value) {
                newFieldFields.style.display = "none";
                const option = select.options[select.selectedIndex];
                nameInput.value = option.dataset.name || "";
                varInput.value = select.value;
                defaultInput.value = option.dataset.default || "";
            } else {
                newFieldFields.style.display = "block";
                nameInput.value = "";
                varInput.value = "";
                defaultInput.value = "";
            }
        });

        // Add button
        modal.querySelector("#custom-field-add").addEventListener("click", () => {
            const name = nameInput.value.trim();
            const varName = varInput.value.trim().toLowerCase();
            const defaultValue = defaultInput.value.trim();

            if (!name || !varName) {
                alert("Please enter field name and variable name");
                return;
            }

            if (!/^[a-z][a-z0-9]*$/.test(varName)) {
                alert("Variable name must start with a letter and contain only lowercase letters and numbers");
                return;
            }

            const newVar = variablesManager.addCustomVariable(groupName, {
                name,
                varName,
                defaultValue: parseFloat(defaultValue) || 0,
                unit: "",
            });

            if (newVar) {
                // Add new row to form
                const row = document.createElement("div");
                row.className = "bit-form-row";
                row.dataset.field = varName;
                row.dataset.varId = newVar.id;
                row.innerHTML = `
                    <label for="bit-${varName}">${name}:<span class="var-name">{${varName}}</span></label>
                    <div class="input-wrapper">
                        <input type="text" id="bit-${varName}" value="${defaultValue}">
                        <div class="formula-result"></div>
                    </div>
                    <button type="button" class="delete-field-btn visible" title="Delete custom field">×</button>
                `;
                formGrid.appendChild(row);

                // Add delete listener
                row.querySelector(".delete-field-btn").addEventListener("click", (e) => {
                    if (variablesManager.removeCustomVariable(groupName, newVar.id)) {
                        row.remove();
                        if (onUpdate) onUpdate();
                    }
                });

                if (onUpdate) onUpdate();
            } else {
                alert(`Variable {${varName}} already exists for this bit type`);
            }

            document.body.removeChild(modal);
        });

        // Cancel button
        modal.querySelector("#custom-field-cancel").addEventListener("click", () => {
            document.body.removeChild(modal);
        });
    }

    getGroupSpecificInputs(groupName, defaults = {}) {
        const d = defaults.diameter !== undefined ? defaults.diameter : "";
        const l = defaults.length !== undefined ? defaults.length : "";
        const a = defaults.angle !== undefined ? defaults.angle : "";
        const h = defaults.height !== undefined ? defaults.height : "";
        const cr =
            defaults.cornerRadius !== undefined ? defaults.cornerRadius : "";
        const f = defaults.flat !== undefined ? defaults.flat : "";
        const sd =
            defaults.shankDiameter !== undefined ? defaults.shankDiameter : "";
        const tl =
            defaults.totalLength !== undefined ? defaults.totalLength : "";

        let inputs = `
        <label for="bit-diameter">Diameter:</label>
        <input type="text" id="bit-diameter" required value="${d}">
        <label for="bit-length">Length:</label>
        <input type="text" id="bit-length" required value="${l}">
        <label for="bit-shankDiameter">Shank Diameter:</label>
        <input type="text" id="bit-shankDiameter" value="${sd}">
        <label for="bit-totalLength">Total Length:</label>
        <input type="text" id="bit-totalLength" value="${tl}">
    `;
        if (groupName === "conical") {
            inputs += `
        <label for="bit-angle">Angle:</label>
        <input type="text" id="bit-angle" required value="${a}">
        `;
        }
        if (groupName === "ball") {
            inputs += `
        <label for="bit-height">Height:</label>
        <input type="text" id="bit-height" required value="${h}">
        `;
        }
        if (groupName === "fillet" || groupName === "bull") {
            inputs += `
        <label for="bit-height">Height:</label>
        <input type="text" id="bit-height" required value="${h}">
        <label for="bit-cornerRadius">Corner Radius:</label>
        <input type="text" id="bit-cornerRadius" required value="${cr}">
        <label for="bit-flat">Flat:</label>
        <input type="text" id="bit-flat" required value="${f}">
        `;
        }
        return inputs;
    }

    // Method that will be called from main script to draw bit shape on canvas
    drawBitShape(bit, groupName) {
        // This method will need to be implemented by delegating to the main canvas manager
        // For now, we'll need to pass a callback or reference to the main drawing function
        if (this.onDrawBitShape) {
            this.onDrawBitShape(bit, groupName);
        }
    }

    // Method to update canvas bits when a bit is edited
    updateCanvasBitsForBitId(bitId) {
        // This will be implemented when we connect to the main canvas functionality
        if (this.onUpdateCanvasBits) {
            this.onUpdateCanvasBits(bitId);
        }
    }

    // Assign profilePath to bits based on their SVG shapes
    assignProfilePathsToBits(bits) {
        bits.forEach((bit) => {
            // Use bit.bitData as the bit parameters
            const bitParams = bit.bitData;
            // Create temporary bit shape at origin (0,0) without shank
            const group = this.createBitShapeElement(
                bitParams,
                bit.groupName,
                0,
                0,
                false,
                false,
            );
            const bitShape = group.querySelector(".bit-shape");

            let pathData = "";

            if (bitShape) {
                if (bitShape.tagName === "rect") {
                    // Convert rect to path
                    const x = parseFloat(bitShape.getAttribute("x"));
                    const y = parseFloat(bitShape.getAttribute("y"));
                    const w = parseFloat(bitShape.getAttribute("width"));
                    const h = parseFloat(bitShape.getAttribute("height"));
                    if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h)) {
                        pathData = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${
                            y + h
                        } L ${x} ${y + h} Z`;
                    }
                } else if (bitShape.tagName === "polygon") {
                    // Convert polygon points to path
                    const pointsStr = bitShape.getAttribute("points");
                    if (pointsStr) {
                        const points = pointsStr
                            .trim()
                            .split(/\s+/)
                            .filter((p) => p.includes(","));
                        if (points.length > 0) {
                            pathData = "M " + points.join(" L ") + " Z";
                        }
                    }
                } else if (bitShape.tagName === "path") {
                    // Use path d attribute directly
                    pathData = bitShape.getAttribute("d") || "";
                }
            }

            // Invert Y coordinates to match Three.js coordinate system (SVG Y is down, Three.js Y is up)
            if (pathData) {
                pathData = this.invertYInPath(pathData);
                // Ensure the path is closed
                if (!pathData.trim().endsWith("Z")) {
                    pathData += " Z";
                }
            }

            // Assign to bitData
            if (!bit.bitData) bit.bitData = {};
            bit.bitData.profilePath = pathData;
        });
    }

    // Transform profile path from profile coordinate system to SVG coordinates
    // Profile CS: origin at bottom-center (anchor point), Y pointing up
    // X=0 is at center, positive X is right, negative X is left
    // SVG CS: origin at top-left, Y pointing down
    transformProfilePath(profilePath, x, y, diameter) {
        if (!profilePath) return null;
        
        try {
            // Parse the path and transform coordinates
            // 1. Flip Y axis (multiply by -1)
            // 2. Translate to position (x, y)
            // 3. X=0 maps to center (x), so SVG x = x + profileX
            
            const commands = profilePath.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);
            if (!commands) return null;
            
            const result = [];
            
            commands.forEach((cmd) => {
                const type = cmd[0].toUpperCase();
                const params = cmd
                    .slice(1)
                    .trim()
                    .split(/[\s,]+/)
                    .map(Number)
                    .filter((n) => !isNaN(n));
                
                // Transform each coordinate
                let transformedParams = [];
                let i = 0;
                
                while (i < params.length) {
                    if (type === "M" || type === "L" || type === "T") {
                        // x y -> transform to SVG coords
                        // Profile: x=0 is center, y=0 is bottom (anchor)
                        // SVG: x = x + profileX, y = y - profileY (flip Y)
                        const px = params[i];
                        const py = params[i + 1];
                        transformedParams.push(x + px, y - py);
                        i += 2;
                    } else if (type === "H") {
                        // x only - relative to center
                        transformedParams.push(x + params[i]);
                        i += 1;
                    } else if (type === "V") {
                        // y only - flip
                        transformedParams.push(y - params[i]);
                        i += 1;
                    } else if (type === "C") {
                        // x1 y1 x2 y2 x y
                        transformedParams.push(
                            x + params[i], y - params[i + 1],
                            x + params[i + 2], y - params[i + 3],
                            x + params[i + 4], y - params[i + 5]
                        );
                        i += 6;
                    } else if (type === "S" || type === "Q") {
                        // x1 y1 x y
                        transformedParams.push(
                            x + params[i], y - params[i + 1],
                            x + params[i + 2], y - params[i + 3]
                        );
                        i += 4;
                    } else if (type === "A") {
                        // rx ry angle large sweep x y
                        // Invert sweep flag when Y is inverted
                        const sweep = 1 - params[i + 4];
                        transformedParams.push(
                            params[i], params[i + 1], params[i + 2],
                            params[i + 3], sweep,
                            x + params[i + 5], y - params[i + 6]
                        );
                        i += 7;
                    } else if (type === "Z") {
                        break;
                    } else {
                        // Unknown command, copy as is
                        transformedParams = params.slice(i);
                        break;
                    }
                }
                
                result.push(type + " " + transformedParams.join(" "));
            });
            
            return result.join(" ");
        } catch (e) {
            console.warn("Failed to transform profile path:", e);
            return null;
        }
    }

    // Highlight SVG path syntax for display
    highlightPathSyntax(pathData) {
        if (!pathData) return "";
        
        // Escape HTML entities first
        let escaped = pathData
            .replace(/&/g, "&")
            .replace(/</g, "<")
            .replace(/>/g, ">");
        
        // Highlight commands (M, L, H, V, C, S, Q, T, A, Z)
        escaped = escaped.replace(/([MLHVCSQTAZmlhvcsqtaz])/g, '<span class="path-cmd">$1</span>');
        
        // Highlight numbers (including negative and decimals)
        escaped = escaped.replace(/(-?\d+\.?\d*)/g, '<span class="path-num">$1</span>');
        
        // Highlight commas
        escaped = escaped.replace(/,/g, '<span class="path-comma">,</span>');
        
        return escaped;
    }

    // Parse path into commands for line-by-line editing
    parsePathToLines(pathData) {
        if (!pathData) return [];
        
        const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
        return commands.map((cmd, index) => {
            const type = cmd[0].toUpperCase();
            const params = cmd.slice(1).trim();
            return {
                index,
                type,
                params,
                raw: cmd
            };
        });
    }

    // Invert Y coordinates in SVG path data
    invertYInPath(pathData) {
        const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);
        const result = [];
        commands.forEach((cmd) => {
            const type = cmd[0].toUpperCase();
            const params = cmd
                .slice(1)
                .trim()
                .split(/[\s,]+/)
                .map(Number)
                .filter((n) => !isNaN(n));
            result.push(type);
            let i = 0;
            while (i < params.length) {
                if (type === "M" || type === "L" || type === "T") {
                    // x y
                    result.push(params[i], -params[i + 1]);
                    i += 2;
                } else if (type === "H") {
                    // x
                    result.push(params[i]);
                    i += 1;
                } else if (type === "V") {
                    // y
                    result.push(-params[i]);
                    i += 1;
                } else if (type === "C") {
                    // x1 y1 x2 y2 x y
                    result.push(
                        params[i],
                        -params[i + 1],
                        params[i + 2],
                        -params[i + 3],
                        params[i + 4],
                        -params[i + 5],
                    );
                    i += 6;
                } else if (type === "S" || type === "Q") {
                    // x1 y1 x y
                    result.push(
                        params[i],
                        -params[i + 1],
                        params[i + 2],
                        -params[i + 3],
                    );
                    i += 4;
                } else if (type === "A") {
                    // rx ry angle large sweep x y
                    // Invert sweep flag when Y is inverted to maintain correct arc direction
                    const sweep = 1 - params[i + 4];
                    result.push(
                        params[i],
                        params[i + 1],
                        params[i + 2],
                        params[i + 3],
                        sweep,
                        params[i + 5],
                        -params[i + 6],
                    );
                    i += 7;
                } else if (type === "Z") {
                    // nothing
                    break;
                } else {
                    // unknown, add as is
                    result.push(...params.slice(i));
                    break;
                }
            }
        });
        return result.join(" ");
    }
}
