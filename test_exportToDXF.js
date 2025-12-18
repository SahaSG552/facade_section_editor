// Comprehensive test suite for exportToDXF function
// This test file can be run in Node.js environment with DOM simulation

import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

// Mock the DOM environment
const dom = new JSDOM(
    `
<!DOCTYPE html>
<html>
<head></head>
<body>
    <div id="canvas"></div>
    <input id="panel-width" value="400">
    <input id="panel-height" value="600">
    <input id="panel-thickness" value="19">
</body>
</html>
`,
    {
        url: "http://localhost:3000",
        pretendToBeVisual: true,
    }
);

global.window = dom.window;
global.document = dom.window.document;
global.alert = jest.fn();

// Mock the required modules
jest.mock("./src/utils/dxfExporter.js", () => ({
    exportToDXF: jest.fn(),
    downloadDXF: jest.fn(),
}));

jest.mock("./src/utils/makerProcessor.js", () => ({
    makerCalculateResultPolygon: jest.fn(),
}));

// Import the script after setting up mocks
import { exportToDXF, bitsOnCanvas } from "./src/script.js";
import dxfExporter from "./src/utils/dxfExporter.js";
import { makerCalculateResultPolygon } from "./src/utils/makerProcessor.js";

describe("exportToDXF Function - Thorough Testing", () => {
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        global.alert.mockClear();

        // Reset bitsOnCanvas
        bitsOnCanvas.length = 0;

        // Mock successful DXF export
        dxfExporter.exportToDXF.mockReturnValue("mocked dxf content");
    });

    test("1. Normal operation with bits on canvas", () => {
        // Setup: Add some bits to canvas
        bitsOnCanvas.push({
            name: "Test Bit",
            x: 100,
            y: 50,
            operation: "AL",
            color: "#cccccc",
            bitData: { diameter: 10 },
        });

        // Mock clipper result
        makerCalculateResultPolygon.mockReturnValue([
            { X: 0, Y: 0 },
            { X: 400, Y: 0 },
            { X: 400, Y: 600 },
            { X: 0, Y: 600 },
        ]);

        // Execute
        exportToDXF();

        // Verify
        expect(global.alert).not.toHaveBeenCalled();
        expect(makerCalculateResultPolygon).toHaveBeenCalled();
        expect(dxfExporter.exportToDXF).toHaveBeenCalledWith(
            bitsOnCanvas,
            expect.any(Array),
            expect.any(Object), // partFront
            expect.any(Array), // offsetContours
            19 // panelThickness
        );
        expect(dxfExporter.downloadDXF).toHaveBeenCalledWith(
            "mocked dxf content"
        );
    });

    test("2. Edge case: No bits on canvas", () => {
        // Setup: Empty bitsOnCanvas
        bitsOnCanvas.length = 0;

        // Execute
        exportToDXF();

        // Verify
        expect(global.alert).toHaveBeenCalledWith(
            "No bits on canvas to export. Please add some bits first."
        );
        expect(makerCalculateResultPolygon).not.toHaveBeenCalled();
        expect(dxfExporter.exportToDXF).not.toHaveBeenCalled();
        expect(dxfExporter.downloadDXF).not.toHaveBeenCalled();
    });

    test("3. Edge case: Empty clipper result", () => {
        // Setup: Add bit but mock empty clipper result
        bitsOnCanvas.push({
            name: "Test Bit",
            x: 100,
            y: 50,
            operation: "AL",
            color: "#cccccc",
            bitData: { diameter: 10 },
        });

        makerCalculateResultPolygon.mockReturnValue([]);

        // Execute
        exportToDXF();

        // Verify
        expect(global.alert).not.toHaveBeenCalled();
        expect(dxfExporter.exportToDXF).toHaveBeenCalledWith(
            bitsOnCanvas,
            [],
            expect.any(Object),
            expect.any(Array),
            19
        );
        expect(dxfExporter.downloadDXF).toHaveBeenCalledWith(
            "mocked dxf content"
        );
    });

    test("4. Edge case: Null clipper result", () => {
        // Setup: Add bit but mock null clipper result
        bitsOnCanvas.push({
            name: "Test Bit",
            x: 100,
            y: 50,
            operation: "AL",
            color: "#cccccc",
            bitData: { diameter: 10 },
        });

        makerCalculateResultPolygon.mockReturnValue(null);

        // Execute
        exportToDXF();

        // Verify
        expect(global.alert).not.toHaveBeenCalled();
        expect(dxfExporter.exportToDXF).toHaveBeenCalledWith(
            bitsOnCanvas,
            null,
            expect.any(Object),
            expect.any(Array),
            19
        );
        expect(dxfExporter.downloadDXF).toHaveBeenCalledWith(
            "mocked dxf content"
        );
    });

    test("5. Edge case: Multiple bits with different operations", () => {
        // Setup: Add multiple bits with different operations
        bitsOnCanvas.push(
            {
                name: "Bit1",
                x: 50,
                y: 100,
                operation: "AL",
                color: "#ff0000",
                bitData: { diameter: 6 },
            },
            {
                name: "Bit2",
                x: 200,
                y: 150,
                operation: "OU",
                color: "#00ff00",
                bitData: { diameter: 12 },
            },
            {
                name: "Bit3",
                x: 350,
                y: 200,
                operation: "VC",
                color: "#0000ff",
                bitData: { diameter: 10, angle: 90 },
            }
        );

        makerCalculateResultPolygon.mockReturnValue([
            { X: 0, Y: 0 },
            { X: 400, Y: 0 },
            { X: 400, Y: 600 },
            { X: 0, Y: 600 },
        ]);

        // Execute
        exportToDXF();

        // Verify
        expect(global.alert).not.toHaveBeenCalled();
        expect(dxfExporter.exportToDXF).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ name: "Bit1", operation: "AL" }),
                expect.objectContaining({ name: "Bit2", operation: "OU" }),
                expect.objectContaining({ name: "Bit3", operation: "VC" }),
            ]),
            expect.any(Array),
            expect.any(Object),
            expect.any(Array),
            19
        );
    });

    test("6. Edge case: DXF export failure", () => {
        // Setup: Add bit and mock DXF export failure
        bitsOnCanvas.push({
            name: "Test Bit",
            x: 100,
            y: 50,
            operation: "AL",
            color: "#cccccc",
            bitData: { diameter: 10 },
        });

        makerCalculateResultPolygon.mockReturnValue([
            { X: 0, Y: 0 },
            { X: 400, Y: 0 },
            { X: 400, Y: 600 },
            { X: 0, Y: 600 },
        ]);

        dxfExporter.exportToDXF.mockReturnValue(null);

        // Execute
        exportToDXF();

        // Verify: Function should still attempt download even with null content
        expect(dxfExporter.downloadDXF).toHaveBeenCalledWith(null);
    });

    test("7. Integration: Verify console logging", () => {
        // Setup
        const consoleSpy = jest
            .spyOn(console, "log")
            .mockImplementation(() => {});
        bitsOnCanvas.push({
            name: "Test Bit",
            x: 100,
            y: 50,
            operation: "AL",
            color: "#cccccc",
            bitData: { diameter: 10 },
        });

        makerCalculateResultPolygon.mockReturnValue([
            { X: 0, Y: 0 },
            { X: 400, Y: 0 },
            { X: 400, Y: 600 },
            { X: 0, Y: 600 },
        ]);

        // Execute
        exportToDXF();

        // Verify
        expect(consoleSpy).toHaveBeenCalledWith(
            "DXF export completed. File downloaded."
        );
        consoleSpy.mockRestore();
    });

    test("8. Performance: Large number of bits", () => {
        // Setup: Add many bits
        for (let i = 0; i < 100; i++) {
            bitsOnCanvas.push({
                name: `Bit${i}`,
                x: Math.random() * 400,
                y: Math.random() * 600,
                operation: "AL",
                color: "#cccccc",
                bitData: { diameter: 10 },
            });
        }

        makerCalculateResultPolygon.mockReturnValue([
            { X: 0, Y: 0 },
            { X: 400, Y: 0 },
            { X: 400, Y: 600 },
            { X: 0, Y: 600 },
        ]);

        // Execute and measure time
        const startTime = Date.now();
        exportToDXF();
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Verify
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        expect(dxfExporter.exportToDXF).toHaveBeenCalledWith(
            expect.any(Array),
            expect.any(Array),
            expect.any(Object),
            expect.any(Array),
            19
        );
    });

    test("9. Edge case: Bits with invalid data", () => {
        // Setup: Add bits with missing or invalid properties
        bitsOnCanvas.push(
            {
                name: "Valid Bit",
                x: 100,
                y: 50,
                operation: "AL",
                color: "#cccccc",
                bitData: { diameter: 10 },
            },
            {
                name: undefined, // Missing name
                x: 200,
                y: 100,
                operation: "OU",
                color: null, // Invalid color
                bitData: {}, // Empty bitData
            }
        );

        makerCalculateResultPolygon.mockReturnValue([
            { X: 0, Y: 0 },
            { X: 400, Y: 0 },
            { X: 400, Y: 600 },
            { X: 0, Y: 600 },
        ]);

        // Execute
        exportToDXF();

        // Verify: Should not crash and should attempt export
        expect(global.alert).not.toHaveBeenCalled();
        expect(dxfExporter.exportToDXF).toHaveBeenCalled();
        expect(dxfExporter.downloadDXF).toHaveBeenCalled();
    });

    test("10. Edge case: makerCalculateResultPolygon throws error", () => {
        // Setup: Add bit and mock clipper function to throw error
        bitsOnCanvas.push({
            name: "Test Bit",
            x: 100,
            y: 50,
            operation: "AL",
            color: "#cccccc",
            bitData: { diameter: 10 },
        });

        makerCalculateResultPolygon.mockImplementation(() => {
            throw new Error("Clipper calculation failed");
        });

        // Execute and expect error handling
        expect(() => exportToDXF()).toThrow("Clipper calculation failed");
    });
});

// Additional integration tests that require browser environment
describe("Browser Integration Tests", () => {
    test("11. DOM element availability", () => {
        // Verify that required DOM elements exist
        expect(document.getElementById("panel-thickness")).toBeTruthy();
        expect(document.getElementById("canvas")).toBeTruthy();
    });

    test("12. Panel thickness value parsing", () => {
        // Setup different panel thickness values
        const testCases = ["19", "25.5", "0", "-5", "abc"];

        testCases.forEach((thickness) => {
            document.getElementById("panel-thickness").value = thickness;

            bitsOnCanvas.push({
                name: "Test Bit",
                x: 100,
                y: 50,
                operation: "AL",
                color: "#cccccc",
                bitData: { diameter: 10 },
            });

            makerCalculateResultPolygon.mockReturnValue([]);

            exportToDXF();

            // Verify the parsed thickness is passed to DXF exporter
            const expectedThickness = parseInt(thickness) || 19; // Default fallback
            expect(dxfExporter.exportToDXF).toHaveBeenCalledWith(
                expect.any(Array),
                expect.any(Array),
                expect.any(Object),
                expect.any(Array),
                expectedThickness
            );

            // Reset
            bitsOnCanvas.length = 0;
            jest.clearAllMocks();
        });
    });
});

// Export test results
export { runTests };

function runTests() {
    console.log("Running exportToDXF comprehensive tests...");

    // Run all tests and collect results
    const testResults = [];

    // Note: In a real implementation, you would use a test runner like Jest
    // This is a simplified version for demonstration

    console.log("Tests completed. Check individual test results above.");
    return testResults;
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests();
}
