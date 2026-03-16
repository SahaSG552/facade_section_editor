import { vi } from "vitest";

/**
 * Test Environment Setup
 * 
 * Mocks HTMLCanvasElement.getContext to prevent Paper.js canvas initialization errors
 * during unit tests. Paper.js requires a canvas 2D context, but happy-dom doesn't
 * provide full canvas support.
 */

// Mock canvas 2D context before any imports
if (typeof HTMLCanvasElement !== "undefined") {
    HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
        if (contextType === "2d") {
            return {
                canvas: { width: 300, height: 150 },
                fillStyle: "",
                strokeStyle: "",
                lineWidth: 1,
                lineCap: "butt",
                lineJoin: "miter",
                miterLimit: 10,
                globalAlpha: 1,
                globalCompositeOperation: "source-over",
                fillRect: vi.fn(),
                clearRect: vi.fn(),
                strokeRect: vi.fn(),
                getImageData: vi.fn(() => ({ 
                    data: new Uint8ClampedArray(4), 
                    width: 1, 
                    height: 1 
                })),
                putImageData: vi.fn(),
                createImageData: vi.fn((width, height) => ({ 
                    data: new Uint8ClampedArray(width * height * 4),
                    width,
                    height
                })),
                setTransform: vi.fn(),
                drawImage: vi.fn(),
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                closePath: vi.fn(),
                stroke: vi.fn(),
                fill: vi.fn(),
                fillText: vi.fn(),
                strokeText: vi.fn(),
                measureText: vi.fn((text) => ({ 
                    width: text.length * 8,
                    actualBoundingBoxLeft: 0,
                    actualBoundingBoxRight: text.length * 8,
                    actualBoundingBoxAscent: 10,
                    actualBoundingBoxDescent: 2
                })),
                translate: vi.fn(),
                rotate: vi.fn(),
                scale: vi.fn(),
                transform: vi.fn(),
                setTransform: vi.fn(),
                resetTransform: vi.fn(),
                arc: vi.fn(),
                arcTo: vi.fn(),
                ellipse: vi.fn(),
                rect: vi.fn(),
                quadraticCurveTo: vi.fn(),
                bezierCurveTo: vi.fn(),
                clip: vi.fn(),
                isPointInPath: vi.fn(() => false),
                isPointInStroke: vi.fn(() => false),
                createLinearGradient: vi.fn(() => ({
                    addColorStop: vi.fn()
                })),
                createRadialGradient: vi.fn(() => ({
                    addColorStop: vi.fn()
                })),
                createPattern: vi.fn(() => null),
            };
        }
        return null;
    });
}

// Mock window dimensions if needed
if (typeof window !== "undefined") {
    Object.defineProperty(window, "devicePixelRatio", {
        writable: true,
        configurable: true,
        value: 1,
    });
}
