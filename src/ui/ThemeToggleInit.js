import { themeManager } from '../shared/theme/ThemeManager.js';
import { addUnifiedPressListener } from './pressEvents.js';

const SUN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;

const MOON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const isDark = theme === 'dark';
  btn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
  btn.innerHTML = isDark ? MOON_SVG : SUN_SVG;
}

export function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  
  updateThemeIcon(themeManager.getCurrentTheme());
  
  addUnifiedPressListener(btn, () => {
    themeManager.toggleTheme();
  });
  
  window.addEventListener('themechange', (e) => {
    if (e.detail?.theme) updateThemeIcon(e.detail.theme);
  });
}

initThemeToggle();
