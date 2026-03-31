// ═══════════════════════════════════════════════════════════
// navigation.js — Roteamento de seções e badges de navegação.
// ═══════════════════════════════════════════════════════════
 
import { getState } from './state.js';
import { todayISO } from './utils.js';
import { renderIncidencia } from './enem.js';
import { renderSimulado } from './simulado.js';
 
const SECTION_TITLES = {
  dashboard:   'Dashboard',
  sessoes:     'Sessões de Estudo',
  anki:        '🃏 Recuperação Ativa',
  erros:       '📓 Caderno de Erros',
  revisoes:    'Agenda de Revisões',
  diagnostico: '🧠 Diagnóstico',
  areas:       '📊 Análise por Área',
  enem:        '🎯 Mapa de Incidência ENEM',
  simulado:    '⚗️ Simulado Inteligente',
  redacao:     '✍️ Redação ENEM',
};
 
// Navega para uma seção pelo ID (sem o prefixo "sec-")
export function go(sectionId, clickedEl) {
  const sec = document.getElementById(`sec-${sectionId}`);
  if (!sec) {
    console.warn(`[Navigation] Seção não encontrada: sec-${sectionId}`);
    return;
  }
 
  // Desativa todos
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
 
  sec.classList.add('active');
  if (clickedEl) clickedEl.classList.add('active');
 
  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) titleEl.textContent = SECTION_TITLES[sectionId] || sectionId;
 
  // Renderiza seções que só carregam sob demanda
  if (sectionId === 'enem')    { try { renderIncidencia(); } catch(e) { console.error('[Nav] enem:', e); } }
  if (sectionId === 'simulado') { try { renderSimulado();   } catch(e) { console.error('[Nav] simulado:', e); } }
 
  // Dispara evento para que main.js saiba renderizar a seção correta
  window.dispatchEvent(new CustomEvent('section:change', { detail: { section: sectionId } }));
}
 
// Alias para compatibilidade com chamadas existentes
export function abrirPagina(nome) {
  const el = document.querySelector(`[data-section="${nome}"]`);
  go(nome, el);
}
 
// Atualiza os badges numéricos da navegação lateral
export function renderNavBadges() {
  const state = getState();
  const today = todayISO();
 
  const revCount = state.revisions.filter(r => !r.done && r.date <= today).length;
  const revBadge = document.getElementById('navBadge');
  if (revBadge) {
    revBadge.textContent = revCount;
    revBadge.style.display = revCount ? 'flex' : 'none';
  }
 
  const ankiCount = state.anki.filter(c => c.proximaRevisao <= today).length;
  const ankiBadge = document.getElementById('ankiBadge');
  if (ankiBadge) {
    ankiBadge.textContent = ankiCount;
    ankiBadge.style.display = ankiCount ? 'flex' : 'none';
  }
}
 
// Banner de revisões pendentes no topo do dashboard
export function renderRevBanner() {
  const state = getState();
  const today = todayISO();
  const hoje  = state.revisions.filter(r => !r.done && r.date === today);
  const atras = state.revisions.filter(r => !r.done && r.date < today);
  const total = hoje.length + atras.length;
 
  const el = document.getElementById('revBanner');
  if (!el) return;
 
  if (!total) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
 
  const countEl = document.getElementById('revBannerCount');
  if (countEl) countEl.textContent = total;
 
  const parts = [];
  if (hoje.length)  parts.push(`${hoje.length} para hoje`);
  if (atras.length) parts.push(`${atras.length} atrasada${atras.length > 1 ? 's' : ''}`);
 
  const textEl = document.getElementById('revBannerText');
  if (textEl) textEl.textContent = 'Você tem: ' + parts.join(' e ') + '.';
}
 