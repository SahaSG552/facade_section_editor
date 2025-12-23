/**
 * Main Application Module
 * Integrates all modules and provides main application entry point
 */
import app from "../core/app.js";
import CanvasModule from "../canvas/CanvasModule.js";
import BitsModule from "../bits/BitsModule.js";
import ExportModule from "../export/ExportModule.js";
import UIModule from "../ui/UIModule.js";

// Register all modules
app.registerModule((container) => new CanvasModule(), "canvas");
app.registerModule((container) => new BitsModule(), "bits");
app.registerModule((container) => new ExportModule(), "export");
app.registerModule((container) => new UIModule(), "ui");

// Export main app instance and modules for use in main script
export { app };
export { default as CanvasModule } from "../canvas/CanvasModule.js";
export { default as BitsModule } from "../bits/BitsModule.js";
export { default as ExportModule } from "../export/ExportModule.js";
export { default as UIModule } from "../ui/UIModule.js";
