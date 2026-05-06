import { iconLoader } from "./IconLoader.js";
import LoggerFactory from "../core/LoggerFactory.js";

const log = LoggerFactory.createLogger("IconButton");

/**
 * Создать кнопку с загружаемой SVG иконкой и fallback символом
 * @param {object} options
 * @param {string} options.id - ID кнопки
 * @param {string} options.iconName - имя иконки
 * @param {string} [options.category] - категория иконки (например, "editor")
 * @param {string} options.title - tooltip текст
 * @param {string} [options.className] - дополнительные CSS классы
 * @param {string} [options.fallback] - fallback символ (если не указан, берется из IconLoader)
 * @returns {Promise<HTMLButtonElement>}
 */
export async function createIconButton({ id, iconName, category, title, className = "", fallback }) {
    const button = document.createElement("button");
    button.id = id;
    button.title = title;
    if (className) button.className = className;
    
    // Устанавливаем fallback сразу
    const fallbackText = fallback || iconLoader.getFallback(iconName);
    button.innerHTML = `<span class="icon-fallback">${fallbackText}</span>`;
    
    // Загружаем SVG асинхронно
    try {
        const svgContent = await iconLoader.loadIcon(iconName, category);
        button.innerHTML = svgContent;
    } catch (error) {
        log.warn(`Failed to load icon for button ${id}`, error);
        // Fallback уже установлен
    }
    
    return button;
}

/**
 * Обновить иконку в существующей кнопке
 * @param {HTMLButtonElement} button
 * @param {string} iconName
 * @param {string} [category]
 */
export async function updateButtonIcon(button, iconName, category) {
    if (!button) return;
    
    // Устанавливаем fallback
    const fallbackText = iconLoader.getFallback(iconName);
    button.innerHTML = `<span class="icon-fallback">${fallbackText}</span>`;
    
    // Загружаем SVG
    try {
        const svgContent = await iconLoader.loadIcon(iconName, category);
        button.innerHTML = svgContent;
    } catch (error) {
        log.warn(`Failed to update icon for button`, error);
    }
}

/**
 * Загрузить иконки для всех кнопок с data-icon атрибутом
 * @param {HTMLElement} container - контейнер с кнопками
 */
export async function loadIconsForButtons(container) {
    const buttons = container.querySelectorAll("button[data-icon]");
    
    const promises = Array.from(buttons).map(async (button) => {
        const iconName = button.dataset.icon;
        const category = button.dataset.iconCategory || "";
        
        if (!iconName) return;
        
        await updateButtonIcon(button, iconName, category);
    });
    
    await Promise.all(promises);
    log.debug(`Loaded icons for ${buttons.length} buttons`);
}
