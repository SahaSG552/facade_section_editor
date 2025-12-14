// Polyfill for ClipperLib to make it available globally
import ClipperLib from "clipper-lib";

// Make ClipperLib globally available for backward compatibility
window.ClipperLib = ClipperLib;
