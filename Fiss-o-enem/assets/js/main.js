// ═══════════════════════════════════════════════════════════
// main.js — Ponto de entrada. Inicializa tudo após o DOM carregar.
// Corrigido para tratar retorno de autenticação do Supabase.
// ═══════════════════════════════════════════════════════════
 
import { supabase } from './supabase.js';
import { loadTheme, toggleTheme } from './theme.js';
import { resetData } from './storage.js';
import { checkOnboarding } from './onboarding.js';
import { startTourIfDemo } from './tour.js';

function enterDemoApp(username) {
  prepararUIUsuario(username, true);
  initState();
  renderAll();
  startCountdown();

  setTimeout(() => {
    startTourIfDemo();
  }, 700);
}
import {
  checkAutoLogin,
  inicializarLoginKeys,
  doLogin,
  doSignup,
  demoLogin,
  showLogoutMenu
} from './login.js';
import {
  inicializarAnki,
  renderAnki,
  responderCartao,
  deleteAnki,
  flipCard,
  saveAnki
} from './anki.js';
import {
  inicializarAssistente,
  sendMessage,
  sendQuick,
  toggleAssistant,
  clearChat,
  handleAsstKey
} from './assistente.js';
import {
  inicializarRedacao,
  filtrarTema,
  deleteRepertorio,
  deleteIdeia,
  saveRepertorio,
  saveIdeia
} from './redacao.js';
import { go } from './navigation.js';
import { openModal, closeModal, handleOverlay, renderAll } from './dom.js';
import {
  exportPDF,
  cronStart,
  cronStop,
  cronReset,
  renderCalendar,
  changeMonth,
  startCountdown,
} from './dashboard.js';
import { renderSimulado } from './simulado.js';
import {
  switchRevTab,
  toggleRevision,
  deleteRevision,
  saveRevision
} from './revisoes.js';
import { saveSession, deleteSession, filtrarSessoes } from './sessions.js';
import { saveErro, deleteErro, filtrarErros, limparFiltroErros, aplicarFiltroConceito } from './erros.js';
import { gerarPlanoSemanal, inicializarPlanoSemanal } from './plano-semanal.js';
import { filtrarIncidencia } from './enem.js';
import { renderGraficoEvolucao } from './diagnostico.js';
console.log('[Supabase] conectado:', supabase);
 
Object.assign(window, {
  doLogin,
  doSignup,
  demoLogin,
  showLogoutMenu,
  resetData,
  toggleTheme,
  go,
  openModal,
  closeModal,
  handleOverlay,
  renderAll,
  exportPDF,
  cronStart,
  cronStop,
  cronReset,
  renderCalendar,
  changeMonth,
  renderAnki,
  renderSimulado,
  sendMessage,
  sendQuick,
  toggleAssistant,
  clearChat,
  handleAsstKey,
  filtrarTema,
  switchRevTab,
  toggleRevision,
  deleteRevision,
  saveRevision,
  saveSession,
  deleteSession,
  filtrarSessoes,
  saveErro,
  deleteErro,
  filtrarErros,
  limparFiltroErros,
  aplicarFiltroConceito,
  saveAnki,
  responderCartao,
  deleteAnki,
  flipCard,
  deleteRepertorio,
  deleteIdeia,
  saveRepertorio,
  saveIdeia,
  gerarPlanoSemanal,
  filtrarIncidencia,
  renderGraficoEvolucao
});
 
export function inicializarNavegacao() {
  document.querySelectorAll('.nav-item[data-section]').forEach(el => {
    el.addEventListener('click', () => go(el.dataset.section, el));
  });
  console.log(
    '[Main] Navegação inicializada:',
    document.querySelectorAll('.nav-item').length,
    'itens'
  );
}
 
export function inicializarTudo() {
  try { inicializarNavegacao(); }     catch (e) { console.error('[Main] nav:', e); }
  try { inicializarAnki(); }          catch (e) { console.error('[Main] anki:', e); }
  try { inicializarAssistente(); }    catch (e) { console.error('[Main] asst:', e); }
  try { inicializarRedacao(); }       catch (e) { console.error('[Main] red:', e); }
  try { inicializarLoginKeys(); }     catch (e) { console.error('[Main] login:', e); }
  try { checkOnboarding(); }          catch (e) { console.error('[Main] onboarding:', e); }
  try { inicializarPlanoSemanal(); }  catch (e) { console.error('[Main] plano:', e); }
}
 
function bootstrap() {
  loadTheme();
  inicializarTudo();
  startCountdown();
 setTimeout(() => {
  startTourIfDemo();
}, 500);
  checkAutoLogin();
  registrarServiceWorker();
}
 
// ── PWA ───────────────────────────────────────────────────
function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(reg => {
        console.log('[PWA] SW registrado:', reg.scope);
        // Verifica revisões pendentes 3s após carregar
        setTimeout(() => verificarNotificacaoPendentes(reg), 3000);
      })
      .catch(err => console.warn('[PWA] Falha no SW:', err));
  }
}
 
async function verificarNotificacaoPendentes(reg) {
  try {
    // Só notifica se o app estiver em segundo plano ou fechado
    if (document.visibilityState === 'visible') return;
 
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
 
    const { getState } = await import('./state.js');
    const state = getState();
    const hoje  = new Date().toISOString().split('T')[0];
 
    const pendentes = (state.revisions || []).filter(r => !r.done && r.date <= hoje).length;
    const anki      = (state.anki || []).filter(c => c.proximaRevisao <= hoje).length;
 
    if (reg.active && (pendentes > 0 || anki > 0)) {
      reg.active.postMessage({ tipo: 'verificar-revisoes', pendentes, anki });
    }
  } catch (e) {
    console.warn('[PWA] Notificação:', e);
  }
}
 
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}