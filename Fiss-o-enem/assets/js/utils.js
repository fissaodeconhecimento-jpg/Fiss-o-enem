// ═══════════════════════════════════════════════════════════
// utils.js — Funções utilitárias puras (sem efeitos colaterais).
// ═══════════════════════════════════════════════════════════

// Retorna a data de hoje no formato YYYY-MM-DD
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// Formata uma string ISO para DD/MM/AAAA
export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Escapa HTML para evitar XSS em conteúdo dinâmico
export function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Calcula o percentual de acerto ponderado (log) de uma sessão
export function calcScore(acertos, total) {
  if (!total) return 0;
  const pct = acertos / total;
  return Number((pct * 100 * (1 + Math.log10(Math.max(total, 1)) / 3)).toFixed(1));
}

// Score geral sobre todas as sessões do state
export function scoreGeral(sessions) {
  const tot = sessions.reduce((a, s) => a + s.total, 0);
  const cor = sessions.reduce((a, s) => a + s.correct, 0);
  return tot ? calcScore(cor, tot) : 0;
}

// Converte score numérico em letra de nível
export function scoreLetter(score) {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

// Dias até o ENEM
export function calcDaysToEnem() {
  const enem = new Date('2026-11-08T00:00:00');
  const diff = enem - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Gera um ID incremental a partir de um array de objetos com .id
export function nextId(arr) {
  return (arr.reduce((max, item) => Math.max(max, item.id ?? 0), 0)) + 1;
}
