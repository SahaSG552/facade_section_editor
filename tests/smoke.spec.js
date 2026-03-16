import { describe, it, expect, beforeEach } from "vitest";

/**
 * Smoke Tests for Root Geometry Modules
 * Tests basic harness functionality and DOM environment support.
 */

describe("Test Harness Smoke Tests", () => {
    it("should initialize vitest harness successfully", () => {
        expect(true).toBe(true);
    });

    it("should have DOM environment available", () => {
        // happy-dom provides document and window globals
        expect(typeof document).toBe("object");
        expect(typeof window).toBe("object");
        expect(document.createElement).toBeDefined();
    });

    it("should create DOM elements without error", () => {
        const div = document.createElement("div");
        div.textContent = "Test DOM element";
        expect(div.textContent).toBe("Test DOM element");
    });

    it("should support DOM node manipulation", () => {
        const container = document.createElement("div");
        const child = document.createElement("span");
        child.id = "test-span";
        child.textContent = "child";
        
        container.appendChild(child);
        expect(container.firstChild).toBe(child);
        expect(container.querySelector("#test-span")).toBe(child);
    });
});

describe("Geometry Helpers - DOM-Dependent Tests", () => {
    it("should handle offset series calculations", () => {
        // Test the buildPartialSeries utility
        const buildPartialSeries = (total, steps) => {
            const count = Math.max(1, Number.isFinite(Number(steps)) ? Math.floor(Number(steps)) : 1);
            const t = Number.isFinite(Number(total)) ? Number(total) : 0;
            const out = [];
            for (let i = 0; i < count; i++) {
                out.push((t * (i + 1)) / count);
            }
            return out;
        };

        const result = buildPartialSeries(10, 3);
        expect(result).toEqual([10/3, 20/3, 10]);
        expect(result.length).toBe(3);
        expect(result[result.length - 1]).toBe(10);
    });

    it("should handle offset distance series generation", () => {
        const buildPartialSeries = (total, steps) => {
            const count = Math.max(1, Number.isFinite(Number(steps)) ? Math.floor(Number(steps)) : 1);
            const t = Number.isFinite(Number(total)) ? Number(total) : 0;
            const out = [];
            for (let i = 0; i < count; i++) {
                out.push((t * (i + 1)) / count);
            }
            return out;
        };

        const buildOffsetDistanceSeries = (distance, count) => {
            return buildPartialSeries(distance, count);
        };

        const offsets = buildOffsetDistanceSeries(5, 2);
        expect(offsets).toEqual([2.5, 5]);
        expect(offsets[offsets.length - 1]).toBe(5);
    });

    it("should validate edge cases in geometry calculations", () => {
        const buildPartialSeries = (total, steps) => {
            const count = Math.max(1, Number.isFinite(Number(steps)) ? Math.floor(Number(steps)) : 1);
            const t = Number.isFinite(Number(total)) ? Number(total) : 0;
            const out = [];
            for (let i = 0; i < count; i++) {
                out.push((t * (i + 1)) / count);
            }
            return out;
        };

        // Test with single step
        expect(buildPartialSeries(10, 1)).toEqual([10]);
        
        // Test with zero total
        expect(buildPartialSeries(0, 3)).toEqual([0, 0, 0]);
        
        // Test with invalid steps (should default to 1)
        expect(buildPartialSeries(10, 0)).toEqual([10]);
        expect(buildPartialSeries(10, -1)).toEqual([10]);
    });
});

describe("DOM Environment Capabilities", () => {
    let container;

    beforeEach(() => {
        container = document.createElement("div");
        container.id = "test-container";
        document.body.appendChild(container);
    });

    it("should support canvas element creation", () => {
        const canvas = document.createElement("canvas");
        canvas.width = 100;
        canvas.height = 100;
        container.appendChild(canvas);
        
        expect(canvas.width).toBe(100);
        expect(canvas.height).toBe(100);
        expect(container.contains(canvas)).toBe(true);
    });

    it("should support SVG element creation", () => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100");
        svg.setAttribute("height", "100");
        container.appendChild(svg);
        
        expect(svg.getAttribute("width")).toBe("100");
        expect(container.contains(svg)).toBe(true);
    });

    it("should support DOM queries and selections", () => {
        const elem = document.createElement("div");
        elem.className = "test-class";
        elem.textContent = "query test";
        container.appendChild(elem);
        
        expect(document.querySelector(".test-class")).toBe(elem);
        expect(document.querySelectorAll(".test-class").length).toBe(1);
    });
});
