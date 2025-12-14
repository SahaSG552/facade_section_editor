// Utility functions for creating bit shapes consistently across the application
import React from "react";

/**
 * Create SVG shape element for a bit
 * @param {Object} bitData - Bit data object
 * @param {string} groupName - Type of bit (cylindrical, conical, ball, fillet, bull)
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} fillColor - Fill color
 * @param {number} strokeWidth - Stroke width
 * @returns {SVGElement} SVG shape element
 */
export function createBitShape(
    bitData,
    groupName,
    x,
    y,
    fillColor = "#cccccc",
    strokeWidth = 1
) {
    const svgNS = "http://www.w3.org/2000/svg";
    let shape;

    switch (groupName) {
        case "cylindrical":
            shape = document.createElementNS(svgNS, "rect");
            shape.setAttribute("x", x - bitData.diameter / 2);
            shape.setAttribute("y", y - bitData.length);
            shape.setAttribute("width", bitData.diameter);
            shape.setAttribute("height", bitData.length);
            break;

        case "conical":
            // Calculate conical shape based on angle
            const oppositeAngle = bitData.angle || 90;
            const hypotenuse = bitData.diameter;
            const height =
                (hypotenuse / 2) *
                (1 / Math.tan((oppositeAngle * Math.PI) / 180 / 2));

            const points = [
                `${x},${y}`, // top point
                `${x - hypotenuse / 2},${y - height}`, // bottom left
                `${x - hypotenuse / 2},${y - bitData.length}`, // shaft bottom left
                `${x + hypotenuse / 2},${y - bitData.length}`, // shaft bottom right
                `${x + hypotenuse / 2},${y - height}`, // bottom right
            ].join(" ");

            shape = document.createElementNS(svgNS, "polygon");
            shape.setAttribute("points", points);
            break;

        case "ball":
            // Ball nose bit: spherical tip + cylindrical shaft
            const ballHeight = bitData.height || bitData.diameter / 2;
            const arcRadius =
                ballHeight / 2 + bitData.diameter ** 2 / (8 * ballHeight);

            shape = document.createElementNS(svgNS, "path");
            shape.setAttribute(
                "d",
                `M ${x + bitData.diameter / 2} ${y - ballHeight} ` +
                    `A ${arcRadius} ${arcRadius} 0 0 1 ${
                        x - bitData.diameter / 2
                    } ${y - ballHeight} ` +
                    `L ${x - bitData.diameter / 2} ${y - bitData.length} ` +
                    `L ${x + bitData.diameter / 2} ${y - bitData.length} Z`
            );
            break;

        case "fillet":
            // Fillet bit: flat tip + fillet radius + cylindrical shaft
            const filletHeight = bitData.height || bitData.diameter / 4;
            const filletRadius = bitData.cornerRadius || bitData.diameter / 4;
            const flatWidth = bitData.flat || bitData.diameter / 2;

            shape = document.createElementNS(svgNS, "path");
            shape.setAttribute(
                "d",
                `M ${x + bitData.diameter / 2} ${y - filletHeight} ` +
                    `A ${filletRadius} ${filletRadius} 0 0 0 ${
                        x + flatWidth / 2
                    } ${y} ` +
                    `L ${x - flatWidth / 2} ${y} ` +
                    `A ${filletRadius} ${filletRadius} 0 0 0 ${
                        x - bitData.diameter / 2
                    } ${y - filletHeight} ` +
                    `L ${x - bitData.diameter / 2} ${y - bitData.length} ` +
                    `L ${x + bitData.diameter / 2} ${y - bitData.length} Z`
            );
            break;

        case "bull":
            // Bull nose bit: rounded tip + cylindrical shaft
            const bullHeight = bitData.height || bitData.diameter / 4;
            const bullRadius = bitData.cornerRadius || bitData.diameter / 4;
            const bullFlat = bitData.flat || bitData.diameter / 2;

            shape = document.createElementNS(svgNS, "path");
            shape.setAttribute(
                "d",
                `M ${x + bitData.diameter / 2} ${y - bullHeight} ` +
                    `A ${bullRadius} ${bullRadius} 0 0 1 ${
                        x + bullFlat / 2
                    } ${y} ` +
                    `L ${x - bullFlat / 2} ${y} ` +
                    `A ${bullRadius} ${bullRadius} 0 0 1 ${
                        x - bitData.diameter / 2
                    } ${y - bullHeight} ` +
                    `L ${x - bitData.diameter / 2} ${y - bitData.length} ` +
                    `L ${x + bitData.diameter / 2} ${y - bitData.length} Z`
            );
            break;

        default:
            // Default circle shape
            shape = document.createElementNS(svgNS, "circle");
            shape.setAttribute("cx", x);
            shape.setAttribute("cy", y - bitData.length / 2);
            shape.setAttribute("r", bitData.diameter / 2);
    }

    if (shape) {
        shape.setAttribute("fill", fillColor);
        shape.setAttribute("stroke", "black");
        shape.setAttribute("stroke-width", strokeWidth);
        shape.setAttribute("class", "bit-shape");
    }

    return shape;
}

/**
 * Create React JSX element for bit icon (for UI components)
 * @param {Object} bitData - Bit data object
 * @param {string} groupName - Type of bit
 * @param {number} size - Icon size
 * @returns {JSX.Element} React JSX element
 */
export function createBitIconJSX(bitData, groupName, size = 40) {
    // If bitData is provided and has proper parameters, use real bit scaling
    if (bitData && bitData.diameter && bitData.length) {
        const diameter = bitData.diameter;
        const length = bitData.length;
        const availableWidth = size - 8; // 4px padding on each side
        const availableHeight = size - 8;

        // Calculate scale to fit bit in icon area
        const scaleX = availableWidth / diameter;
        const scaleY = availableHeight / length;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

        // Center the bit
        const centerX = size / 2;
        const centerY = size / 2 + (length * scale) / 2;

        // Create scaled bit shape
        const scaledBitData = {
            ...bitData,
            diameter: diameter * scale,
            length: length * scale,
            height: bitData.height ? bitData.height * scale : undefined,
            cornerRadius: bitData.cornerRadius
                ? bitData.cornerRadius * scale
                : undefined,
            flat: bitData.flat ? bitData.flat * scale : undefined,
        };

        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <g
                    transform={`translate(${
                        centerX - (diameter * scale) / 2
                    }, ${centerY - length * scale})`}
                >
                    {createScaledBitShapeJSX(scaledBitData, groupName)}
                </g>
            </svg>
        );
    }

    // For placeholder icons (no bitData or incomplete data)
    const createShapeJSX = () => {
        switch (groupName) {
            case "cylindrical":
                return (
                    <rect
                        key="cylindrical"
                        x={size * 0.2}
                        y={size * 0.1}
                        width={size * 0.6}
                        height={size * 0.8}
                        fill="#cccccc"
                        stroke="#000"
                        strokeWidth="1"
                    />
                );

            case "conical":
                const angle = bitData?.angle || 90;
                const height =
                    ((size * 0.6) / 2) *
                    (1 / Math.tan((angle * Math.PI) / 180 / 2));
                const points = [
                    size * 0.5,
                    size * 0.1, // top
                    size * 0.2,
                    size * 0.1 + height, // bottom left
                    size * 0.2,
                    size * 0.9, // shaft left
                    size * 0.8,
                    size * 0.9, // shaft right
                    size * 0.8,
                    size * 0.1 + height, // bottom right
                ].join(" ");
                return (
                    <polygon
                        key="conical"
                        points={points}
                        fill="#cccccc"
                        stroke="#000"
                        strokeWidth="1"
                    />
                );

            case "ball":
                return (
                    <g key="ball">
                        <rect
                            x={size * 0.2}
                            y={size * 0.3}
                            width={size * 0.6}
                            height={size * 0.5}
                            fill="#cccccc"
                            stroke="#000"
                            strokeWidth="1"
                        />
                        <circle
                            cx={size * 0.5}
                            cy={size * 0.3}
                            r={size * 0.1}
                            fill="#cccccc"
                            stroke="#000"
                            strokeWidth="1"
                        />
                    </g>
                );

            case "fillet":
                return (
                    <path
                        key="fillet"
                        d={`M ${size * 0.2} ${size * 0.3} L ${size * 0.2} ${
                            size * 0.9
                        } L ${size * 0.8} ${size * 0.9} L ${size * 0.8} ${
                            size * 0.3
                        } A ${size * 0.2} ${size * 0.2} 0 0 0 ${size * 0.4} ${
                            size * 0.3
                        } L ${size * 0.2} ${size * 0.3} Z`}
                        fill="#cccccc"
                        stroke="#000"
                        strokeWidth="1"
                    />
                );

            case "bull":
                return (
                    <path
                        key="bull"
                        d={`M ${size * 0.2} ${size * 0.5} L ${size * 0.2} ${
                            size * 0.9
                        } L ${size * 0.8} ${size * 0.9} L ${size * 0.8} ${
                            size * 0.5
                        } A ${size * 0.15} ${size * 0.15} 0 0 1 ${
                            size * 0.65
                        } ${size * 0.4} L ${size * 0.35} ${size * 0.4} A ${
                            size * 0.15
                        } ${size * 0.15} 0 0 1 ${size * 0.2} ${size * 0.5} Z`}
                        fill="#cccccc"
                        stroke="#000"
                        strokeWidth="1"
                    />
                );

            case "newBit":
                return (
                    <path
                        key="newBit"
                        d={`M${size * 0.3} ${size * 0.3}V${size * 0.7}M${
                            size * 0.3
                        } ${size * 0.5}H${size * 0.7}`}
                        stroke="#666"
                        strokeWidth="2"
                        fill="none"
                    />
                );

            default:
                return (
                    <circle
                        key="default"
                        cx={size / 2}
                        cy={size / 2}
                        r={size * 0.3}
                        fill="#cccccc"
                        stroke="#000"
                        strokeWidth="1"
                    />
                );
        }
    };

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {createShapeJSX()}
        </svg>
    );
}

// Helper function to create scaled bit shapes for icons
function createScaledBitShapeJSX(bitData, groupName) {
    switch (groupName) {
        case "cylindrical":
            return (
                <rect
                    key="cylindrical"
                    x={0}
                    y={0}
                    width={bitData.diameter}
                    height={bitData.length}
                    fill="#cccccc"
                    stroke="#000"
                    strokeWidth="0.5"
                />
            );

        case "conical":
            const angle = bitData.angle || 90;
            const hypotenuse = bitData.diameter;
            const height =
                (hypotenuse / 2) * (1 / Math.tan((angle * Math.PI) / 180 / 2));
            const points = [
                hypotenuse / 2,
                0, // top
                0,
                height, // bottom left
                0,
                bitData.length, // shaft left
                hypotenuse,
                bitData.length, // shaft right
                hypotenuse,
                height, // bottom right
            ].join(" ");
            return (
                <polygon
                    key="conical"
                    points={points}
                    fill="#cccccc"
                    stroke="#000"
                    strokeWidth="0.5"
                />
            );

        case "ball":
            const ballHeight = bitData.height || bitData.diameter / 2;
            const arcRadius =
                ballHeight / 2 + bitData.diameter ** 2 / (8 * ballHeight);
            return (
                <path
                    key="ball"
                    d={`M ${bitData.diameter} ${ballHeight} A ${arcRadius} ${arcRadius} 0 0 1 0 ${ballHeight} L 0 ${bitData.length} L ${bitData.diameter} ${bitData.length} Z`}
                    fill="#cccccc"
                    stroke="#000"
                    strokeWidth="0.5"
                />
            );

        case "fillet":
            const filletHeight = bitData.height || bitData.diameter / 4;
            const filletRadius = bitData.cornerRadius || bitData.diameter / 4;
            const flatWidth = bitData.flat || bitData.diameter / 2;
            return (
                <path
                    key="fillet"
                    d={`M ${
                        bitData.diameter
                    } ${filletHeight} A ${filletRadius} ${filletRadius} 0 0 0 ${
                        bitData.diameter / 2 + flatWidth / 2
                    } ${filletHeight + filletRadius} L ${
                        bitData.diameter / 2 - flatWidth / 2
                    } ${
                        filletHeight + filletRadius
                    } A ${filletRadius} ${filletRadius} 0 0 0 0 ${filletHeight} L 0 ${
                        bitData.length
                    } L ${bitData.diameter} ${bitData.length} Z`}
                    fill="#cccccc"
                    stroke="#000"
                    strokeWidth="0.5"
                />
            );

        case "bull":
            const bullHeight = bitData.height || bitData.diameter / 4;
            const bullRadius = bitData.cornerRadius || bitData.diameter / 4;
            const bullFlat = bitData.flat || bitData.diameter / 2;
            return (
                <path
                    key="bull"
                    d={`M ${
                        bitData.diameter
                    } ${bullHeight} A ${bullRadius} ${bullRadius} 0 0 1 ${
                        bitData.diameter / 2 + bullFlat / 2
                    } ${bullHeight + bullRadius} L ${
                        bitData.diameter / 2 - bullFlat / 2
                    } ${
                        bullHeight + bullRadius
                    } A ${bullRadius} ${bullRadius} 0 0 1 0 ${bullHeight} L 0 ${
                        bitData.length
                    } L ${bitData.diameter} ${bitData.length} Z`}
                    fill="#cccccc"
                    stroke="#000"
                    strokeWidth="0.5"
                />
            );

        default:
            return (
                <circle
                    key="default"
                    cx={bitData.diameter / 2}
                    cy={bitData.length / 2}
                    r={bitData.diameter / 2}
                    fill="#cccccc"
                    stroke="#000"
                    strokeWidth="0.5"
                />
            );
    }
}

/**
 * Get default bit parameters for each type
 * @param {string} groupName - Type of bit
 * @returns {Object} Default parameters
 */
export function getDefaultBitParams(groupName) {
    const defaults = {
        cylindrical: {
            diameter: 6,
            length: 20,
            toolNumber: 1,
            fillColor: "#cccccc",
        },
        conical: {
            diameter: 6,
            length: 20,
            angle: 90,
            toolNumber: 1,
            fillColor: "#cccccc",
        },
        ball: {
            diameter: 6,
            length: 20,
            height: 3,
            toolNumber: 1,
            fillColor: "#cccccc",
        },
        fillet: {
            diameter: 6,
            length: 20,
            height: 1.5,
            cornerRadius: 1.5,
            flat: 3,
            toolNumber: 1,
            fillColor: "#cccccc",
        },
        bull: {
            diameter: 6,
            length: 20,
            height: 1.5,
            cornerRadius: 1.5,
            flat: 3,
            toolNumber: 1,
            fillColor: "#cccccc",
        },
    };

    return defaults[groupName] || defaults.cylindrical;
}
