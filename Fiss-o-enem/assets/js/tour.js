// ═══════════════════════════════════════════════════════════
// tour.js — tour guiado da conta demo
// ═══════════════════════════════════════════════════════════

import { isDemoMode } from './demo.js';

let step = 0;

const steps = [
  {
    selector: '#focoHoje, .foco-card, #focoTema',
    text: 'Aqui está seu foco de hoje — o sistema tenta decidir por você o que estudar agora.'
  },
  {
    selector: '#pontosFracos, #pontosFracosDiag',
    text: 'Aqui aparecem seus pontos fracos — é onde o estudo começa a ficar estratégico.'
  },
  {
    selector: '#trilhaCardBody, #trilhaAreaLabel',
    text: 'Aqui está o próximo passo — a ideia é transformar seus dados em direção.'
  }
];

function removeTourNodes() {
  document.getElementById('tourOverlay')?.remove();
  document.getElementById('tourTooltip')?.remove();
  document.getElementById('tourFinish')?.remove();
}

function createOverlay(target) {
  const overlay = document.createElement('div');
  overlay.id = 'tourOverlay';
  overlay.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(7,10,20,.50);
    z-index:9997;
    pointer-events:none;
  `;

  if (target) {
    const r = target.getBoundingClientRect();
    const hole = document.createElement('div');
    hole.style.cssText = `
      position:fixed;
      left:${r.left - 8}px;
      top:${r.top - 8}px;
      width:${r.width + 16}px;
      height:${r.height + 16}px;
      border-radius:18px;
      box-shadow:0 0 0 9999px rgba(7,10,20,.50);
      outline:2px solid rgba(124,92,252,.8);
      z-index:9998;
      pointer-events:none;
    `;
    overlay.appendChild(hole);
  }

  document.body.appendChild(overlay);
}

function createTooltip(el, text, isLast = false) {
  const box = document.createElement('div');
  box.id = 'tourTooltip';
  box.style.cssText = `
    position:fixed;
    z-index:9999;
    width:min(320px, calc(100vw - 24px));
    padding:16px;
    background:linear-gradient(180deg,#14192f 0%, #101528 100%);
    color:#fff;
    border:1px solid rgba(255,255,255,.08);
    border-radius:16px;
    box-shadow:0 20px 50px rgba(0,0,0,.35);
    font-family:Inter,system-ui,sans-serif;
  `;

  box.innerHTML = `
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#bfb8ff;margin-bottom:8px">
      Tour da demo
    </div>
    <div style="font-size:14px;line-height:1.55;color:rgba(255,255,255,.92)">
      ${text}
    </div>
    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px">
      <button id="tourSkipBtn" style="
        border:none;background:rgba(255,255,255,.08);color:#fff;
        padding:9px 12px;border-radius:10px;cursor:pointer;font-weight:700
      ">Pular</button>
      <button id="tourNextBtn" style="
        border:none;background:linear-gradient(135deg,#7c5cfc,#9d82ff);color:#fff;
        padding:9px 12px;border-radius:10px;cursor:pointer;font-weight:700
      ">${isLast ? 'Finalizar' : 'Continuar'}</button>
    </div>
  `;

  document.body.appendChild(box);

  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = rect.bottom + 12;
  let left = rect.left;

  if (left + box.offsetWidth > vw - 12) {
    left = vw - box.offsetWidth - 12;
  }
  if (left < 12) left = 12;

  if (top + box.offsetHeight > vh - 12) {
    top = rect.top - box.offsetHeight - 12;
  }
  if (top < 12) top = 12;

  box.style.left = `${left}px`;
  box.style.top = `${top}px`;

  document.getElementById('tourSkipBtn')?.addEventListener('click', finishTour);
  document.getElementById('tourNextBtn')?.addEventListener('click', () => {
    box.remove();
    step++;
    runTour();
  });
}

function finishTour() {
  removeTourNodes();
  localStorage.setItem('tour_done', 'true');
}

function runTour() {
  removeTourNodes();

  if (step >= steps.length) {
    finishTour();
    return;
  }

  const item = steps[step];
  const el = document.querySelector(item.selector);

  if (!el) {
    step++;
    runTour();
    return;
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => {
    createOverlay(el);
    createTooltip(el, item.text, step === steps.length - 1);
  }, 350);
}

export function startTourIfDemo() {
  if (!isDemoMode()) return;
  if (localStorage.getItem('tour_done') === 'true') return;

  step = 0;
  setTimeout(() => {
    runTour();
  }, 800);
}
