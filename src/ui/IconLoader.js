import LoggerFactory from "../core/LoggerFactory.js";

const log = LoggerFactory.createLogger("IconLoader");

/**
 * IconLoader - система загрузки SVG иконок с fallback на текстовые символы
 * 
 * Поддерживает:
 * - Загрузку SVG из assets/icons/
 * - Icon packs (можно переключать наборы иконок)
 * - Fallback на Unicode символы
 * - Кэширование загруженных иконок
 */
export default class IconLoader {
    constructor() {
        /** @type {Map<string, string>} */
        this._cache = new Map();
        
        /** @type {string} */
        this._currentPack = "default";
        
        /** @type {Map<string, string>} Fallback текстовые символы */
        this._fallbacks = new Map([
            // Main toolbar
            ["zoom-in", "+"],
            ["zoom-out", "−"],
            ["fit-scale", "⊡"],
            ["zoom-selected", "⊙"],
            ["part", "▭"],
            ["bits", "◉"],
            ["shank", "⊥"],
            ["export-dxf", "📄"],
            ["grid", "⊞"],
            ["save", "💾"],
            ["save-as", "💾↗"],
            ["load", "📂"],
            ["clear", "🗑"],
            
            // Editor draw tools
            ["cursor", "↖"],
            ["move", "✥"],
            ["rotate", "⟳"],
            ["mirror", "⊳"],
            ["flip", "⇄"],
            ["line", "╱"],
            ["arc", "⌒"],
            ["circle", "○"],
            ["rect", "▭"],
            ["ellipse", "⬭"],
            ["group", "◫"],
            
            // Editor edit tools
            ["fillet", "⌔"],
            ["chamfer", "⌐"],
            ["trim", "✂"],
            ["extend", "↔"],
            ["offset", "⊙"],
            ["clipperOffset", "◉"],
            ["join", "⊕"],
            ["explode", "⊗"],
            ["close", "⬡"],
            ["bool", "⊔"],
            ["aux", "⋯"],
        ]);
    }

    /**
     * Загрузить иконку по имени
     * @param {string} name - имя иконки (например, "zoom-in", "cursor")
     * @param {string} [category=""] - категория (например, "editor" для editor/)
     * @returns {Promise<string>} SVG разметка или fallback символ
     */
    async loadIcon(name, category = "") {
        const cacheKey = category ? `${category}/${name}` : name;
        
        // Проверяем кэш (только в production)
        const isDev = import.meta.env?.DEV || window.location.hostname === 'localhost';
        if (!isDev && this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }

        try {
            // Маппинг для зарезервированных имен Windows и camelCase → kebab-case
            const fileNameMap = {
                'aux': 'aux-line',  // aux.svg → aux-line.svg (Windows reserved name)
                'clipperOffset': 'clipper-offset'  // clipperOffset → clipper-offset.svg
            };
            
            const fileName = fileNameMap[name] || name;
            
            // Формируем путь к SVG файлу
            const path = category 
                ? `assets/icons/${this._currentPack}/${category}/${fileName}.svg`
                : `assets/icons/${this._currentPack}/${fileName}.svg`;
            
            // Добавляем cache-busting параметр в dev режиме
            const url = isDev ? `${path}?t=${Date.now()}` : path;
            
            log.debug(`Loading icon: ${url} (dev mode: ${isDev})`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load icon: ${response.status}`);
            }
            
            let svgContent = await response.text();
            
            // Sanitize SVG: replace hardcoded fill/stroke with currentColor so icons adapt to theme
            svgContent = this._sanitizeSVG(svgContent);
            
            log.debug(`Loaded icon ${name}, length: ${svgContent.length}, first 100 chars: ${svgContent.substring(0, 100)}`);
            
            // Кэшируем только в production
            if (!isDev) {
                this._cache.set(cacheKey, svgContent);
            }
            
            return svgContent;
        } catch (error) {
            log.warn(`Failed to load SVG icon "${name}", using fallback`, error);
            
            // Возвращаем fallback символ
            const fallback = this._fallbacks.get(name) || "?";
            return `<span class="icon-fallback">${fallback}</span>`;
        }
    }

    /**
     * Sanitize SVG content to replace hardcoded colors with currentColor
     * This ensures icons adapt to the current theme (light/dark)
     * @param {string} svgContent - Raw SVG markup
     * @returns {string} Sanitized SVG markup
     */
    _sanitizeSVG(svgContent) {
        // Match fill="..." or stroke="..." where the value is NOT "none", "currentColor", or "transparent"
        // Preserve intentionally colored icons by skipping those with only non-black fills
        // Use a simple approach: strip fill attributes entirely (let CSS control fill),
        // and convert stroke colors to currentColor
        return svgContent
            // Remove fill attributes (except fill="none" and fill="transparent")
            .replace(/\s+fill="(?!none|transparent|currentColor)([^"]*)"/gi, '')
            // Convert stroke to currentColor (preserve stroke="none")
            .replace(/\s+stroke="(?!none|transparent|currentColor)([^"]*)"/gi, ' stroke="currentColor"')
            // Also handle single-quoted attributes
            .replace(/\s+fill='(?!none|transparent|currentColor)([^']*)'/gi, '')
            .replace(/\s+stroke='(?!none|transparent|currentColor)([^']*)'/gi, " stroke='currentColor'");
    }

    /**
     * Загрузить несколько иконок параллельно
     * @param {Array<{name: string, category?: string}>} icons
     * @returns {Promise<Map<string, string>>}
     */
    async loadIcons(icons) {
        const promises = icons.map(async ({ name, category }) => {
            const content = await this.loadIcon(name, category);
            return [name, content];
        });
        
        const results = await Promise.all(promises);
        return new Map(results);
    }

    /**
     * Переключить icon pack
     * @param {string} packName - имя пакета ("default", "minimal", "colorful" и т.д.)
     */
    async switchPack(packName) {
        log.info(`Switching icon pack to: ${packName}`);
        this._currentPack = packName;
        this._cache.clear(); // Очищаем кэш при смене пакета
    }

    /**
     * Получить текущий icon pack
     * @returns {string}
     */
    getCurrentPack() {
        return this._currentPack;
    }

    /**
     * Очистить кэш
     */
    clearCache() {
        this._cache.clear();
        log.debug("Icon cache cleared");
    }

    /**
     * Получить fallback символ для иконки
     * @param {string} name
     * @returns {string}
     */
    getFallback(name) {
        return this._fallbacks.get(name) || "?";
    }
}

// Singleton instance
export const iconLoader = new IconLoader();

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.iconLoader = iconLoader;
}
