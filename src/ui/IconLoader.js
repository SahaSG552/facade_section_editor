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
        
        // Проверяем кэш
        if (this._cache.has(cacheKey)) {
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
            
            log.debug(`Loading icon: ${path}`);
            
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load icon: ${response.status}`);
            }
            
            const svgContent = await response.text();
            
            // Кэшируем
            this._cache.set(cacheKey, svgContent);
            
            return svgContent;
        } catch (error) {
            log.warn(`Failed to load SVG icon "${name}", using fallback`, error);
            
            // Возвращаем fallback символ
            const fallback = this._fallbacks.get(name) || "?";
            return `<span class="icon-fallback">${fallback}</span>`;
        }
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
