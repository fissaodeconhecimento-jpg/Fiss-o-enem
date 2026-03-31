// ═══════════════════════════════════════════════════════════
// revisoes.js — Sistema de revisões espaçadas.
// ═══════════════════════════════════════════════════════════

import { AREAS } from './constants.js';
import { getState, setState } from './state.js';
import { todayISO, formatDate } from './utils.js';
import { renderAll, closeModal } from './dom.js';

let _revTab = 'pendentes';

export function getRevTab() {
  return _revTab;
}

export function setRevTab(tab) {
  _revTab = tab;
}

export function gerarRevisoes(dataErro, tema, area) {
  const state = getState();
  let maxId = state.revisions.reduce((m, r) => Math.max(m, r.id || 0), 0);

  const novas = [1, 7, 30].map(dias => {
    const d = new Date(dataErro + 'T12:00:00');
    d.setDate(d.getDate() + dias);
    maxId++;

    return {
      id: maxId,
      subject: tema,
      area,
      date: d.toISOString().split('T')[0],
      done: false,
      auto: true,
      intervalo: dias
    };
  });

  setState({
    revisions: [...state.revisions, ...novas]
  });
}

export function switchRevTab(t, el) {
  _revTab = t;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderRevisions();
}

export function toggleRevision(id) {
  const state = getState();

  setState({
    revisions: state.revisions.map(r =>
      r.id === id ? { ...r, done: !r.done } : r
    )
  });

  renderAll();
}

export function deleteRevision(id) {
  const state = getState();

  setState({
    revisions: state.revisions.filter(r => r.id !== id)
  });

  renderAll();
}

export function saveRevision() {
  const subject = document.getElementById('f-subject')?.value.trim() || '';
  if (!subject) {
    alert('Informe o assunto da revisão.');
    return;
  }

  const area = document.getElementById('f-area')?.value || 'cn';
  const date = document.getElementById('f-date')?.value;

  const state = getState();
  const maxId = state.revisions.reduce((m, r) => Math.max(m, r.id || 0), 0);

  const nova = {
    id: maxId + 1,
    subject,
    area,
    date,
    done: false,
    auto: false
  };

  setState({
    revisions: [...state.revisions, nova]
  });

  closeModal();
  renderAll();
}

export function renderRevisions() {
  const state = getState();
  const el = document.getElementById('revisionList');

  if (!el) {
    console.warn('[Fissão] renderRevisions: #revisionList não encontrado');
    return;
  }

  const today = todayISO();
  let list = [...state.revisions].sort((a, b) => a.date.localeCompare(b.date));

  if (_revTab === 'pendentes') list = list.filter(r => !r.done);
  else if (_revTab === 'hoje') list = list.filter(r => !r.done && r.date <= today);
  else if (_revTab === 'concluidas') list = list.filter(r => r.done);

  if (!list.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">🔄</div><p>Nenhuma revisão aqui.</p></div>`;
    return;
  }

  el.innerHTML = list.map(r => {
    const area = AREAS.find(a => a.id === r.area);
    const isLate = !r.done && r.date < today;
    const tag = r.done ? 'rt-d' : isLate ? 'rt-l' : r.auto ? 'rt-a' : 'rt-p';
    const lbl = r.done ? 'Concluída' : isLate ? 'Atrasada' : r.auto ? `Auto +${r.intervalo}d` : 'Pendente';

    return `<div class="rev-row">
      <div class="rev-date">${formatDate(r.date)}</div>
      <div class="rev-subj">${r.subject}<span style="color:${area?.color || 'var(--muted)'};font-size:9.5px;margin-left:5px">${area?.name || ''}</span></div>
      <div class="rev-tag ${tag}">${lbl}</div>
      <div class="rev-check ${r.done ? 'checked' : ''}" onclick="toggleRevision(${r.id})">${r.done ? '✓' : ''}</div>
      <button class="delbtn" onclick="deleteRevision(${r.id})">✕</button>
    </div>`;
  }).join('');
}