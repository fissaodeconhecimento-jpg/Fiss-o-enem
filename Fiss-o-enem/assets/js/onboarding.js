// ═══════════════════════════════════════════════════════════
// onboarding.js — Onboarding guiado premium de 3 passos
// Foco em ação, recompensa e direção.
// ═══════════════════════════════════════════════════════════

import { supabase } from './supabase.js';
import { getState } from './state.js';
import { go } from './navigation.js';

const ONBOARDING_KEY = 'fissao_onboarding_v2';

const PASSOS = [
  {
    id: 'acao',
    tag: 'Passo 1',
    icone: '⚡',
    titulo: 'Registre sua primeira sessão',
    descricao: 'O sistema só fica inteligente quando você registra o que realmente estudou. Não espere ficar perfeito para começar.',
    mini: [
      'Área + tópico',
      'Total de questões',
      'Acertos reais'
    ],
    cta: 'Registrar primeira sessão',
    sideTitle: 'O que acontece agora',
    sideText: 'Ao registrar sua primeira sessão, o painel sai do vazio e começa a construir seu diagnóstico.',
    badge: 'Ação imediata'
  },
  {
    id: 'recompensa',
    tag: 'Passo 2',
    icone: '🧠',
    titulo: 'Veja seu diagnóstico nascer',
    descricao: 'Depois da primeira sessão, o dashboard começa a mostrar direção. Não é só beleza: é clareza sobre onde agir.',
    mini: [
      'Foco de hoje',
      'Pontos fracos',
      'Leitura do sistema'
    ],
    cta: 'Ir para o dashboard',
    sideTitle: 'A recompensa',
    sideText: 'Seu estudo deixa de ser genérico e começa a apontar o próximo passo com base nos seus dados.',
    badge: 'Valor rápido'
  },
  {
    id: 'direcao',
    tag: 'Passo 3',
    icone: '🎯',
    titulo: 'Siga o próximo passo inteligente',
    descricao: 'O objetivo aqui não é lotar a plataforma de cliques. É te mostrar o que fazer agora, com menos desperdício.',
    mini: [
      'Próxima ação',
      'Revisões pendentes',
      'Constância real'
    ],
    cta: 'Começar com clareza',
    sideTitle: 'O que sustenta resultado',
    sideText: 'Quem registra, revisa e segue o próximo passo tende a crescer mais do que quem apenas “estuda mais”.',
    badge: 'Direção'
  }
];

async function jaViuOnboarding() {
  if (localStorage.getItem(ONBOARDING_KEY) === 'done') return true;

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return false;

    const { data } = await supabase
      .from('user_access')
      .select('onboarding_done')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (data?.onboarding_done) {
      localStorage.setItem(ONBOARDING_KEY, 'done');
      return true;
    }
  } catch (e) {
    console.warn('[Onboarding] Falha ao checar persistência remota:', e);
  }

  return false;
}

async function marcarOnboardingConcluido() {
  localStorage.setItem(ONBOARDING_KEY, 'done');

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;

    await supabase
      .from('user_access')
      .update({ onboarding_done: true })
      .eq('user_id', authData.user.id);
  } catch (e) {
    console.warn('[Onboarding] Falha ao salvar persistência remota:', e);
  }
}

export async function checkOnboarding() {
  const visto = await jaViuOnboarding();
  if (visto) return;

  setTimeout(() => abrirOnboarding(), 650);
}

function abrirOnboarding() {
  document.getElementById('onboardingOverlay')?.remove();

  let passoAtual = 0;

  const overlay = document.createElement('div');
  overlay.id = 'onboardingOverlay';
  overlay.innerHTML = getTemplate();

  document.body.appendChild(overlay);

  const fechar = async (concluir = false) => {
    overlay.classList.add('closing');
    setTimeout(() => overlay.remove(), 180);
    if (concluir) await marcarOnboardingConcluido();
    limparGlobais();
  };

  const proximo = async () => {
    if (passoAtual < PASSOS.length - 1) {
      passoAtual++;
      render();
      return;
    }
    await fechar(true);
  };

  const voltar = () => {
    if (passoAtual <= 0) return;
    passoAtual--;
    render();
  };

  const abrirSessao = async () => {
    await fechar(true);
    if (typeof window.openModal === 'function') {
      window.openModal('session');
    }
  };

  const irDashboard = () => {
    if (typeof go === 'function') go('dashboard');
    if (typeof window.renderAll === 'function') window.renderAll();
  };

  const acaoPrincipal = async () => {
    const passo = PASSOS[passoAtual];

    if (passo.id === 'acao') {
      await abrirSessao();
      return;
    }

    if (passo.id === 'recompensa') {
      irDashboard();
      await proximo();
      return;
    }

    await fechar(true);
  };

  const pular = async () => {
    await fechar(true);
  };

  function limparGlobais() {
    delete window.__onbNext;
    delete window.__onbPrev;
    delete window.__onbSkip;
    delete window.__onbAction;
  }

  function render() {
    const passo = PASSOS[passoAtual];
    const state = getState();
    const total = PASSOS.length;
    const progresso = Math.round(((passoAtual + 1) / total) * 100);
    const jaTemSessao = (state.sessions || []).length > 0;

    const titleEl = overlay.querySelector('[data-onb-title]');
    const descEl = overlay.querySelector('[data-onb-desc]');
    const iconEl = overlay.querySelector('[data-onb-icon]');
    const tagEl = overlay.querySelector('[data-onb-tag]');
    const badgeEl = overlay.querySelector('[data-onb-badge]');
    const sideTitleEl = overlay.querySelector('[data-onb-side-title]');
    const sideTextEl = overlay.querySelector('[data-onb-side-text]');
    const miniEl = overlay.querySelector('[data-onb-mini]');
    const stepEl = overlay.querySelector('[data-onb-step]');
    const progressFill = overlay.querySelector('[data-onb-progress]');
    const dotsEl = overlay.querySelector('[data-onb-dots]');
    const actionBtn = overlay.querySelector('[data-onb-action]');
    const prevBtn = overlay.querySelector('[data-onb-prev]');
    const helperEl = overlay.querySelector('[data-onb-helper]');

    if (titleEl) titleEl.textContent = passo.titulo;
    if (descEl) descEl.textContent = passo.descricao;
    if (iconEl) iconEl.textContent = passo.icone;
    if (tagEl) tagEl.textContent = passo.tag;
    if (badgeEl) badgeEl.textContent = passo.badge;
    if (sideTitleEl) sideTitleEl.textContent = passo.sideTitle;
    if (sideTextEl) sideTextEl.textContent = passo.sideText;
    if (stepEl) stepEl.textContent = `${passoAtual + 1} de ${total}`;
    if (progressFill) progressFill.style.width = `${progresso}%`;

    if (miniEl) {
      miniEl.innerHTML = passo.mini.map(item => `
        <div class="onb-mini-item">
          <span class="onb-mini-dot"></span>
          <span>${item}</span>
        </div>
      `).join('');
    }

    if (dotsEl) {
      dotsEl.innerHTML = PASSOS.map((_, i) => `
        <span class="onb-dot ${i === passoAtual ? 'active' : ''}"></span>
      `).join('');
    }

    if (actionBtn) {
      actionBtn.textContent = passo.id === 'acao' && jaTemSessao
        ? 'Registrar nova sessão'
        : passo.cta;
    }

    if (prevBtn) {
      prevBtn.style.visibility = passoAtual === 0 ? 'hidden' : 'visible';
    }

    if (helperEl) {
      helperEl.textContent = passo.id === 'acao'
        ? 'Quanto mais real for seu registro, mais útil fica a plataforma.'
        : passo.id === 'recompensa'
          ? 'O valor do sistema aparece quando o painel responde ao que você fez.'
          : 'Seu objetivo não é mexer na plataforma. É usar a plataforma para decidir melhor.';
    }

    overlay.querySelectorAll('[data-onb-card]').forEach((card, idx) => {
      card.classList.toggle('active', idx === passoAtual);
    });
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) pular();
  });

  window.__onbNext = proximo;
  window.__onbPrev = voltar;
  window.__onbSkip = pular;
  window.__onbAction = acaoPrincipal;

  render();
}

function getTemplate() {
  return `
    <style>
      #onboardingOverlay{
        position:fixed;
        inset:0;
        z-index:9999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:24px;
        background:rgba(5,7,16,.72);
        backdrop-filter:blur(10px);
        animation:onbFade .18s ease;
      }
      #onboardingOverlay.closing{ animation:onbFadeOut .18s ease forwards; }
      #onboardingOverlay *{ box-sizing:border-box; }
      .onb-shell{
        width:min(980px, 100%);
        display:grid;
        grid-template-columns: 1.15fr .85fr;
        background:linear-gradient(180deg,#11162c 0%, #0d1328 100%);
        border:1px solid rgba(255,255,255,.08);
        border-radius:28px;
        overflow:hidden;
        box-shadow:0 30px 90px rgba(0,0,0,.45);
        color:#fff;
        font-family:Inter, system-ui, sans-serif;
      }
      .onb-left{
        padding:30px;
        background:
          radial-gradient(circle at top left, rgba(124,92,252,.18), transparent 34%),
          linear-gradient(180deg,#121831 0%, #0e142b 100%);
      }
      .onb-right{
        padding:30px;
        border-left:1px solid rgba(255,255,255,.06);
        background:
          radial-gradient(circle at top right, rgba(16,217,160,.14), transparent 30%),
          linear-gradient(180deg,#0f1530 0%, #0b1023 100%);
      }
      .onb-topbar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:20px;
      }
      .onb-brand{
        display:flex;
        align-items:center;
        gap:10px;
        font-weight:800;
        letter-spacing:.02em;
      }
      .onb-brand-mark{
        width:38px;
        height:38px;
        border-radius:12px;
        display:grid;
        place-items:center;
        background:linear-gradient(135deg,#7c5cfc,#9c7bff);
        box-shadow:0 10px 24px rgba(124,92,252,.28);
      }
      .onb-skip{
        border:none;
        background:rgba(255,255,255,.06);
        color:rgba(255,255,255,.72);
        border-radius:12px;
        padding:10px 14px;
        font-size:12px;
        font-weight:700;
        cursor:pointer;
      }
      .onb-tag{
        display:inline-flex;
        align-items:center;
        gap:8px;
        border:1px solid rgba(255,255,255,.1);
        background:rgba(255,255,255,.04);
        color:#d9d3ff;
        border-radius:999px;
        padding:8px 12px;
        font-size:11px;
        text-transform:uppercase;
        letter-spacing:.14em;
      }
      .onb-icon{
        font-size:56px;
        line-height:1;
        margin:18px 0 14px;
      }
      .onb-title{
        font-size:32px;
        line-height:1.08;
        font-weight:900;
        margin:0 0 12px;
        max-width:540px;
      }
      .onb-desc{
        margin:0;
        color:rgba(255,255,255,.76);
        font-size:15px;
        line-height:1.65;
        max-width:560px;
      }
      .onb-badge{
        margin-top:18px;
        display:inline-flex;
        align-items:center;
        padding:8px 12px;
        border-radius:999px;
        background:rgba(16,217,160,.12);
        border:1px solid rgba(16,217,160,.24);
        color:#b8ffea;
        font-size:12px;
        font-weight:700;
      }
      .onb-mini-grid{
        margin-top:22px;
        display:grid;
        grid-template-columns:repeat(3, minmax(0,1fr));
        gap:10px;
      }
      .onb-mini-item{
        min-height:82px;
        border-radius:18px;
        padding:14px;
        background:rgba(255,255,255,.05);
        border:1px solid rgba(255,255,255,.08);
        display:flex;
        flex-direction:column;
        justify-content:flex-start;
        gap:10px;
        color:rgba(255,255,255,.9);
        font-size:13px;
        font-weight:700;
      }
      .onb-mini-dot{
        width:10px;
        height:10px;
        border-radius:50%;
        background:linear-gradient(135deg,#7c5cfc,#10d9a0);
        box-shadow:0 0 0 4px rgba(124,92,252,.18);
      }
      .onb-footer{
        margin-top:22px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
      }
      .onb-helper{
        color:rgba(255,255,255,.58);
        font-size:12px;
        max-width:430px;
        line-height:1.55;
      }
      .onb-actions{
        display:flex;
        justify-content:flex-end;
        gap:10px;
      }
      .onb-btn{
        border:none;
        border-radius:14px;
        padding:13px 18px;
        font-weight:800;
        cursor:pointer;
        font-size:14px;
      }
      .onb-btn.secondary{
        background:rgba(255,255,255,.06);
        color:#fff;
        border:1px solid rgba(255,255,255,.08);
      }
      .onb-btn.primary{
        background:linear-gradient(135deg,#7c5cfc 0%, #9e82ff 100%);
        color:#fff;
        min-width:220px;
        box-shadow:0 12px 26px rgba(124,92,252,.28);
      }
      .onb-progress-top{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
      }
      .onb-step{
        color:rgba(255,255,255,.7);
        font-size:12px;
        font-weight:700;
      }
      .onb-dots{
        display:flex;
        gap:6px;
      }
      .onb-dot{
        width:8px;
        height:8px;
        border-radius:50%;
        background:rgba(255,255,255,.14);
      }
      .onb-dot.active{
        background:#9e82ff;
        box-shadow:0 0 0 4px rgba(124,92,252,.14);
      }
      .onb-progress{
        height:10px;
        border-radius:999px;
        background:rgba(255,255,255,.07);
        overflow:hidden;
        margin:16px 0 20px;
      }
      .onb-progress-fill{
        height:100%;
        width:33%;
        border-radius:999px;
        background:linear-gradient(90deg,#7c5cfc,#10d9a0);
        transition:width .25s ease;
      }
      .onb-side-card{
        border-radius:22px;
        padding:18px;
        background:rgba(255,255,255,.05);
        border:1px solid rgba(255,255,255,.08);
        margin-top:14px;
      }
      .onb-side-label{
        font-size:11px;
        text-transform:uppercase;
        letter-spacing:.14em;
        color:#9ca7d8;
        margin-bottom:10px;
      }
      .onb-side-title{
        font-size:20px;
        font-weight:900;
        line-height:1.2;
        margin-bottom:8px;
      }
      .onb-side-text{
        color:rgba(255,255,255,.74);
        font-size:14px;
        line-height:1.65;
      }
      .onb-side-stack{
        display:grid;
        gap:12px;
        margin-top:18px;
      }
      .onb-preview{
        display:grid;
        gap:10px;
      }
      .onb-preview-card{
        border-radius:16px;
        padding:14px;
        background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));
        border:1px solid rgba(255,255,255,.08);
      }
      .onb-preview-top{
        display:flex;
        justify-content:space-between;
        gap:8px;
        margin-bottom:8px;
        color:#cfd5f8;
        font-size:12px;
      }
      .onb-preview-title{
        font-weight:800;
        color:#fff;
        font-size:14px;
      }
      .onb-preview-sub{
        margin-top:4px;
        color:rgba(255,255,255,.64);
        font-size:12px;
      }
      .onb-bar{
        margin-top:10px;
        height:8px;
        background:rgba(255,255,255,.08);
        border-radius:999px;
        overflow:hidden;
      }
      .onb-bar > span{
        display:block;
        height:100%;
        width:68%;
        border-radius:999px;
        background:linear-gradient(90deg,#10d9a0,#7c5cfc);
      }
      @keyframes onbFade{
        from{opacity:0}
        to{opacity:1}
      }
      @keyframes onbFadeOut{
        from{opacity:1}
        to{opacity:0}
      }
      @media (max-width: 860px){
        .onb-shell{ grid-template-columns:1fr; }
        .onb-right{ border-left:none; border-top:1px solid rgba(255,255,255,.06); }
      }
      @media (max-width: 640px){
        #onboardingOverlay{ padding:14px; align-items:flex-start; overflow:auto; }
        .onb-left, .onb-right{ padding:20px; }
        .onb-title{ font-size:26px; }
        .onb-mini-grid{ grid-template-columns:1fr; }
        .onb-footer{ flex-direction:column; align-items:stretch; }
        .onb-actions{ width:100%; }
        .onb-btn.primary{ min-width:0; flex:1; }
      }
    </style>

    <div class="onb-shell" role="dialog" aria-modal="true" aria-label="Onboarding do Fissão">
      <section class="onb-left">
        <div class="onb-topbar">
          <div class="onb-brand">
            <div class="onb-brand-mark">⚛️</div>
            <div>Fissão de Conhecimento</div>
          </div>
          <button class="onb-skip" onclick="window.__onbSkip()">Pular</button>
        </div>

        <div class="onb-tag" data-onb-tag></div>
        <div class="onb-icon" data-onb-icon></div>
        <h2 class="onb-title" data-onb-title></h2>
        <p class="onb-desc" data-onb-desc></p>
        <div class="onb-badge" data-onb-badge></div>

        <div class="onb-mini-grid" data-onb-mini></div>

        <div class="onb-footer">
          <div class="onb-helper" data-onb-helper></div>
          <div class="onb-actions">
            <button class="onb-btn secondary" data-onb-prev onclick="window.__onbPrev()">Voltar</button>
            <button class="onb-btn primary" data-onb-action onclick="window.__onbAction()"></button>
          </div>
        </div>
      </section>

      <aside class="onb-right">
        <div class="onb-progress-top">
          <div class="onb-step" data-onb-step></div>
          <div class="onb-dots" data-onb-dots></div>
        </div>
        <div class="onb-progress">
          <div class="onb-progress-fill" data-onb-progress></div>
        </div>

        <div class="onb-side-card">
          <div class="onb-side-label">Leitura rápida</div>
          <div class="onb-side-title" data-onb-side-title></div>
          <div class="onb-side-text" data-onb-side-text></div>
        </div>

        <div class="onb-side-stack">
          <div class="onb-preview" data-onb-card>
            <div class="onb-preview-card">
              <div class="onb-preview-top">
                <span>Dashboard</span>
                <span>Foco de hoje</span>
              </div>
              <div class="onb-preview-title">Estude o que mais move sua nota</div>
              <div class="onb-preview-sub">Evite estudar no escuro. O sistema existe para reduzir desperdício.</div>
              <div class="onb-bar"><span></span></div>
            </div>

            <div class="onb-preview-card">
              <div class="onb-preview-top">
                <span>Diagnóstico</span>
                <span>Padrões</span>
              </div>
              <div class="onb-preview-title">Seus erros começam a ter nome</div>
              <div class="onb-preview-sub">É aqui que o estudo deixa de ser só esforço e vira estratégia.</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `;
}
