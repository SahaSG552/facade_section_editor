/**
 * Platform Detection and Adaptation Module
 * Detects the current platform (web, android, ios) and provides platform-specific utilities
 */

import { Capacitor } from "@capacitor/core";

class PlatformModule {
    constructor() {
        this.platform = this.detectPlatform();
        this.isNative = Capacitor.isNativePlatform();
        this.isWeb = !this.isNative;
    }

    /**
     * Detect the current platform
     * @returns {string} 'web' | 'android' | 'ios'
     */
    detectPlatform() {
        if (Capacitor.isNativePlatform()) {
            return Capacitor.getPlatform();
        }
        return "web";
    }

    /**
     * Check if running on Android
     * @returns {boolean}
     */
    isAndroid() {
        return this.platform === "android";
    }

    /**
     * Check if running on iOS
     * @returns {boolean}
     */
    isIOS() {
        return this.platform === "ios";
    }

    /**
     * Check if running in web browser
     * @returns {boolean}
     */
    isWeb() {
        return this.platform === "web";
    }

    /**
     * Get platform-specific CSS class for body element
     * @returns {string}
     */
    getPlatformClass() {
        return `platform-${this.platform}`;
    }

    /**
     * Check if device supports touch
     * @returns {boolean}
     */
    supportsTouch() {
        return "ontouchstart" in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Get safe area insets for devices with notches
     * @returns {object} {top, bottom, left, right}
     */
    getSafeAreaInsets() {
        if (!this.isNative) {
            return { top: 0, bottom: 0, left: 0, right: 0 };
        }

        // Use CSS env() values if available
        const style = getComputedStyle(document.documentElement);
        return {
            top:
                parseInt(style.getPropertyValue("env(safe-area-inset-top)")) ||
                0,
            bottom:
                parseInt(
                    style.getPropertyValue("env(safe-area-inset-bottom)")
                ) || 0,
            left:
                parseInt(style.getPropertyValue("env(safe-area-inset-left)")) ||
                0,
            right:
                parseInt(
                    style.getPropertyValue("env(safe-area-inset-right)")
                ) || 0,
        };
    }

    /**
     * Apply platform-specific styling
     */
    applyPlatformStyling() {
        const body = document.body;

        // Add platform class
        body.classList.add(this.getPlatformClass());

        // Add touch class if device supports touch
        if (this.supportsTouch()) {
            body.classList.add("touch-device");
        }

        // Apply safe area insets for native platforms
        if (this.isNative) {
            const insets = this.getSafeAreaInsets();
            document.documentElement.style.setProperty(
                "--safe-area-inset-top",
                `${insets.top}px`
            );
            document.documentElement.style.setProperty(
                "--safe-area-inset-bottom",
                `${insets.bottom}px`
            );
            document.documentElement.style.setProperty(
                "--safe-area-inset-left",
                `${insets.left}px`
            );
            document.documentElement.style.setProperty(
                "--safe-area-inset-right",
                `${insets.right}px`
            );
        }
    }

    /**
     * Initialize platform-specific features
     */
    async initialize() {
        console.log(`Platform detected: ${this.platform}`);

        // Apply platform styling
        this.applyPlatformStyling();

        // Initialize platform-specific features
        if (this.isAndroid()) {
            await this.initializeAndroidFeatures();
        } else if (this.isIOS()) {
            await this.initializeIOSFeatures();
        } else {
            await this.initializeWebFeatures();
        }
    }

    /**
     * Initialize Android-specific features
     */
    async initializeAndroidFeatures() {
        try {
            // Import Android-specific plugins dynamically
            const { StatusBar } = await import("@capacitor/status-bar");

            // Configure status bar
            await StatusBar.setStyle({ style: "default" });
            await StatusBar.setBackgroundColor({ color: "#ffffff" });

            console.log("Android features initialized");
        } catch (error) {
            console.warn("Failed to initialize Android features:", error);
        }
    }

    /**
     * Initialize iOS-specific features
     */
    async initializeIOSFeatures() {
        try {
            // Import iOS-specific plugins dynamically
            const { StatusBar } = await import("@capacitor/status-bar");

            // Configure status bar for iOS
            await StatusBar.setStyle({ style: "default" });

            console.log("iOS features initialized");
        } catch (error) {
            console.warn("Failed to initialize iOS features:", error);
        }
    }

    /**
     * Initialize web-specific features
     */
    async initializeWebFeatures() {
        // Web-specific initialization
        console.log("Web features initialized");
    }

    /**
     * Handle back button (Android) or swipe gestures (iOS)
     * @param {function} callback - Function to call when back action is triggered
     */
    handleBackAction(callback) {
        if (this.isAndroid()) {
            // Android back button
            document.addEventListener("backbutton", callback);
        } else if (this.isIOS()) {
            // iOS swipe gesture (simplified)
            let startX = 0;
            let startY = 0;

            document.addEventListener("touchstart", (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            });

            document.addEventListener("touchend", (e) => {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = startX - endX;
                const diffY = Math.abs(startY - endY);

                // Detect left swipe (back gesture)
                if (diffX > 100 && diffY < 50) {
                    callback();
                }
            });
        }
    }

    /**
     * Get platform-specific file system directory
     * @returns {string}
     */
    getDefaultFileDirectory() {
        if (this.isAndroid()) {
            return "DOCUMENTS"; // Android documents directory
        } else if (this.isIOS()) {
            return "DOCUMENTS"; // iOS documents directory
        }
        return null; // Web uses browser downloads
    }

    /**
     * Check if file system access is available
     * @returns {boolean}
     */
    supportsFileSystem() {
        return this.isNative || "showSaveFilePicker" in window;
    }

    /**
     * Get user agent string for debugging
     * @returns {string}
     */
    getUserAgent() {
        return navigator.userAgent;
    }
}

// Singleton instance
const platform = new PlatformModule();

export default platform;
