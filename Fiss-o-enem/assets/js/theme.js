// ═══════════════════════════════════════════════════════════
// theme.js — Alternância e persistência do tema visual.
// ═══════════════════════════════════════════════════════════

const THEME_KEY = 'fissao_theme';

export function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeBtn(saved);
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeBtn(next);
}

export function updateThemeBtn(theme) {
  const btn = document.getElementById('themeBtn');
  if (!btn) return;
  btn.textContent = theme === 'dark' ? '☀️ Claro' : '🌙 Escuro';
}
