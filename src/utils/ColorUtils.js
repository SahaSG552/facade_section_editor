import * as THREE from "three";

/**
 * ColorUtils
 * Helper functions for color generation and manipulation
 */
export default class ColorUtils {
    /**
     * Generate a harmonious background color for a given panel color
     * Uses various color harmony strategies (Analogous, Monochromatic, Triadic, Split-Complementary)
     * inspired by tools like Coolors.co
     * @param {THREE.Color} baseColor - The color of the panel
     * @returns {THREE.Color} The generated background color
     */
    static generateCompatibleBackgroundColor(baseColor) {
        const hsl = {};
        baseColor.getHSL(hsl);

        // Randomly select a harmony strategy
        const strategies = [
            'monochromatic',
            'analogous',
            'split-complementary',
            'triadic',
            'pastel-contrast'
        ];

        const strategy = strategies[Math.floor(Math.random() * strategies.length)];

        const newColor = new THREE.Color();

        switch (strategy) {
            case 'monochromatic':
                // Same hue, significantly different lightness/saturation
                // If base is light, go dark; if base is dark, go light
                const monoLightness = hsl.l > 0.5 ? Math.random() * 0.2 : 0.8 + Math.random() * 0.15;
                const monoSat = Math.max(0, hsl.s - 0.3 + (Math.random() * 0.2));
                newColor.setHSL(hsl.h, monoSat, monoLightness);
                break;

            case 'analogous':
                // Shift hue slightly (30-60 degrees)
                const analogShift = ((Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 30)) / 360;
                const analogHue = (hsl.h + analogShift + 1) % 1;
                // Ensure good contrast
                const analogLight = hsl.l > 0.5 ? Math.random() * 0.3 : 0.7 + Math.random() * 0.2;
                newColor.setHSL(analogHue, 0.4 + Math.random() * 0.3, analogLight);
                break;

            case 'split-complementary':
                // Shift hue by ~150-210 degrees
                const splitShift = (180 + (Math.random() < 0.5 ? -30 : 30) + (Math.random() * 20 - 10)) / 360;
                const splitHue = (hsl.h + splitShift + 1) % 1;
                const splitLight = hsl.l > 0.5 ? 0.15 + Math.random() * 0.15 : 0.8 + Math.random() * 0.15;
                newColor.setHSL(splitHue, 0.2 + Math.random() * 0.3, splitLight);
                break;

            case 'triadic':
                // Shift 120 degrees
                const triadShift = (120 * (Math.random() > 0.5 ? 1 : 2)) / 360;
                const triadHue = (hsl.h + triadShift + 1) % 1;
                const triadLight = hsl.l > 0.5 ? 0.2 + Math.random() * 0.2 : 0.75 + Math.random() * 0.2;
                newColor.setHSL(triadHue, 0.5, triadLight);
                break;

            case 'pastel-contrast':
            default:
                // Classic "Nice UI Background" strategy
                // Random hue, low saturation, high lightness (or very dark)
                const pastelHue = (hsl.h + 0.5) % 1; // Opposite hue
                const pastelSat = 0.1 + Math.random() * 0.2;
                const pastelLight = 0.85 + Math.random() * 0.1;
                newColor.setHSL(pastelHue, pastelSat, pastelLight);
                break;
        }

        return newColor;
    }

    /**
     * Get a random pleasing color
     * @returns {THREE.Color}
     */
    static getRandomColor() {
        return new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
    }
}
