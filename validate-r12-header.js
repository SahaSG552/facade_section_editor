import ExportModule from "./src/export/ExportModule.js";

// Create exporter
const exportModule = new ExportModule();
const exporter = exportModule.dxfExporter;

// Generate R12 header
exporter.dxfContent = [];
exporter.writer.dxfContent = exporter.dxfContent;
exporter.writeHeader_R12();

const dxfString = exporter.dxfContent.join("\r\n");

console.log("=== R12 HEADER VALIDATION ===\n");

// Test 1: AC1009 present
const hasAC1009 = dxfString.includes("AC1009");
console.log(`✓ AC1009 present: ${hasAC1009}`);

// Test 2: No AC1015+ variables
const forbiddenVars = [
    "$CELWEIGHT",
    "$LWDISPLAY",
    "$DIMASSOC",
    "$XCLIPFRAME",
    "$FILLMODE",
    "$TILEMODE",
    "$ATTMODE",
    "$PDMODE",
    "$PDSIZE",
    "$UCSORG",
    "$UCSXDIR",
    "$UCSYDIR"
];

let hasForbidden = false;
forbiddenVars.forEach(varName => {
    if (dxfString.includes(varName)) {
        console.log(`✗ Found forbidden variable: ${varName}`);
        hasForbidden = true;
    }
});
if (!hasForbidden) {
    console.log("✓ No AC1015+ variables found");
}

// Test 3: $HANDLING = 1
const hasHandling = dxfString.includes("$HANDLING") && dxfString.includes("70\r\n1");
console.log(`✓ $HANDLING = 1: ${hasHandling}`);

// Test 4: $DWGCODEPAGE = ANSI_1252
const hasCodepage = dxfString.includes("ANSI_1252");
console.log(`✓ $DWGCODEPAGE = ANSI_1252: ${hasCodepage}`);

// Test 5: $INSUNITS = 4
const hasInsunits = dxfString.includes("$INSUNITS") && dxfString.includes("70\r\n4");
console.log(`✓ $INSUNITS = 4: ${hasInsunits}`);

// Test 6: HEADER section structure
const hasHeaderStart = dxfString.includes("SECTION") && dxfString.includes("HEADER");
const hasHeaderEnd = dxfString.includes("ENDSEC");
console.log(`✓ HEADER section structure: ${hasHeaderStart && hasHeaderEnd}`);

console.log("\n=== SUMMARY ===");
const allPass = hasAC1009 && !hasForbidden && hasHandling && hasCodepage && hasInsunits && hasHeaderStart && hasHeaderEnd;
console.log(`Result: ${allPass ? "✓ ALL TESTS PASS" : "✗ SOME TESTS FAILED"}`);

process.exit(allPass ? 0 : 1);
