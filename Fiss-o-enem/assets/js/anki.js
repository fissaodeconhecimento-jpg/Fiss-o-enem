// ═══════════════════════════════════════════════════════════
// anki.js — Sistema de flashcards com repetição espaçada.
// ═══════════════════════════════════════════════════════════

import { AREAS, ANKI_INTERVALOS } from './constants.js';
import { getState, setState } from './state.js';
import { todayISO } from './utils.js';
import { renderAll, closeModal } from './dom.js';

// Estado interno
let _estadoCartao = 'pergunta';
let _cardAtualId = null;

export function gerarProximaRevisao(dataAtual, nivel) {
  const dias = ANKI_INTERVALOS[Math.min(nivel, ANKI_INTERVALOS.length - 1)] || 30;
  const d = new Date(dataAtual + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

export function criarCartao(pergunta, resposta, tema, area, dificuldade = 'media') {
  const state = getState();
  const maxId = state.anki.reduce((m, c) => Math.max(m, c.id || 0), 0);

  const card = {
    id: maxId + 1,
    pergunta: pergunta || '',
    resposta: resposta || '',
    tema: tema || '',
    area: area || 'cn',
    dificuldade,
    nivel: 0,
    ultimaRevisao: todayISO(),
    proximaRevisao: todayISO(),
    createdAt: todayISO()
  };

  setState({
    anki: [...state.anki, card]
  });

  return card;
}

export function responderCartao(id, resultado) {
  const state = getState();
  const card = state.anki.find(c => c.id === id);
  if (!card) return;

  let novoNivel = card.nivel;

  if (resultado === 'easy')        novoNivel = Math.min(card.nivel + 1, 4);
  else if (resultado === 'medium') novoNivel = card.nivel; // mantém nível, mas atualiza data
  else if (resultado === 'hard')   novoNivel = Math.max(card.nivel - 1, 0);

  setState({
    anki: state.anki.map(c =>
      c.id === id
        ? {
            ...c,
            nivel: novoNivel,
            ultimaRevisao: todayISO(),
            proximaRevisao: gerarProximaRevisao(todayISO(), novoNivel)
          }
        : c
    )
  });

  _estadoCartao = 'pergunta';
  _cardAtualId = null;
  renderAll();
}

export function cartoesPendentes() {
  const state = getState();
  return state.anki.filter(c => c.proximaRevisao <= todayISO());
}

export function criarCartaoDeErro(erro) {
  if (!erro.conceito && !erro.questao) return;

  const perg = erro.questao || `Qual o conceito de: ${erro.conceito}?`;
  const resp =
    (erro.respostaCorreta || '') +
    (erro.conceito ? `\n\n💡 Conceito-chave: ${erro.conceito}` : '');

  criarCartao(
    perg,
    resp,
    erro.tema || '',
    erro.area || 'cn',
    erro.tipoErro === 'Conteúdo' ? 'dificil' : 'media'
  );
}

export function deleteAnki(id) {
  const ok = confirm('Excluir este cartão?');
  if (!ok) return;

  const state = getState();

  setState({
    anki: state.anki.filter(c => c.id !== id)
  });

  if (_cardAtualId === id) {
    _cardAtualId = null;
    _estadoCartao = 'pergunta';
  }

  renderAll();
}

export function saveAnki() {
  const area = document.getElementById('f-area')?.value || 'cn';
  const tema = document.getElementById('f-tema')?.value.trim() || '';
  const pergunta = document.getElementById('f-pergunta')?.value.trim() || '';
  const resposta = document.getElementById('f-resposta')?.value.trim() || '';
  const dif = document.getElementById('f-dif')?.value || 'media';

  if (!pergunta) {
    alert('Informe a pergunta do cartão.');
    return;
  }

  criarCartao(pergunta, resposta, tema, area, dif);
  closeModal();
  renderAll();
}

export function renderAnki() {
  const state = getState();
  const listEl = document.getElementById('ankiList');
  if (!listEl) return;

  const totalEl = document.getElementById('ankiTotal');
  const hojeEl = document.getElementById('ankiHoje');
  const domEl = document.getElementById('ankiDom');

  if (totalEl) totalEl.textContent = state.anki.length;
  if (hojeEl) hojeEl.textContent = cartoesPendentes().length;
  if (domEl) domEl.textContent = state.anki.filter(c => c.nivel >= 4).length;

  const filtro = document.getElementById('ankiFiltro')?.value || 'hoje';
  let cards = [...state.anki];

  if (filtro === 'hoje') cards = cards.filter(c => c.proximaRevisao <= todayISO());
  else if (filtro === 'dificeis') cards = cards.filter(c => c.nivel <= 1);

  cards.sort((a, b) => a.proximaRevisao.localeCompare(b.proximaRevisao));

  if (!cards.length) {
    listEl.innerHTML = `<div class="empty"><div class="empty-icon">🃏</div><p>${
      filtro === 'hoje'
        ? 'Nenhum cartão para revisar agora. Você está em dia! ✓'
        : 'Nenhum cartão encontrado.'
    }</p></div>`;
    return;
  }

  listEl.innerHTML = cards.map(c => renderCartao(c)).join('');
}

export function renderAnkiDash() {
  const el = document.getElementById('ankiDash');
  if (!el) return;

  const cards = cartoesPendentes().slice(0, 4);

  if (!cards.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">🃏</div><p>Nenhum cartão para hoje. Em dia! ✓</p></div>`;
    return;
  }

  el.innerHTML = cards.map(c => renderCartao(c)).join('');
}

export function renderCartao(c) {
  const area = AREAS.find(a => a.id === c.area);
  const isOverdue = c.proximaRevisao < todayISO();
  const nivLabel = ['Novo', 'Iniciante', 'Básico', 'Intermediário', 'Dominado'][Math.min(c.nivel, 4)];

  return `
    <div class="anki-card-wrap">
      <div class="anki-card" id="card-${c.id}" onclick="flipCard(${c.id})">
        <div class="anki-card-inner">
          <div class="anki-face anki-front">
            <div class="anki-card-header">
              <div class="anki-card-tags">
                ${c.tema ? `<span class="anki-tag">${c.tema}</span>` : ''}
                ${area ? `<span class="anki-tag" style="color:${area.color}">${area.name}</span>` : ''}
              </div>
              <span class="anki-due-badge ${isOverdue ? 'overdue' : ''}">
                ${isOverdue ? '⚠ VENCIDO' : nivLabel}
              </span>
            </div>

            <div class="anki-q">${c.pergunta}</div>
            <div class="anki-flip-hint">Toque para revelar →</div>
          </div>

          <div class="anki-face anki-back">
            <div class="anki-back-top">
              <div class="anki-back-label">✓ RESPOSTA</div>
              <button
                type="button"
                class="anki-del-btn"
                onclick="event.stopPropagation(); deleteAnki(${c.id})"
                title="Excluir cartão"
              >
                ✕
              </button>
            </div>

            <div class="anki-resp">${c.resposta}</div>

            <div class="anki-actions" onclick="event.stopPropagation()">
              <button type="button" class="anki-btn hard" onclick="responderCartao(${c.id}, 'hard')">
                😓 Difícil
              </button>
              <button type="button" class="anki-btn medium" onclick="responderCartao(${c.id}, 'medium')">
                🤔 Médio
              </button>
              <button type="button" class="anki-btn easy" onclick="responderCartao(${c.id}, 'easy')">
                ✅ Fácil
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function flipCard(id) {
  const el = document.getElementById(`card-${id}`);
  if (!el) {
    console.warn('[Fissão] flipCard: cartão não encontrado', id);
    return;
  }

  if (_cardAtualId && _cardAtualId !== id) {
    const prev = document.getElementById(`card-${_cardAtualId}`);
    if (prev) prev.classList.remove('flipped');
  }

  el.classList.toggle('flipped');

  if (el.classList.contains('flipped')) {
    _estadoCartao = 'resposta';
    _cardAtualId = id;
  } else {
    _estadoCartao = 'pergunta';
    _cardAtualId = null;
  }
}

export function virarCartao(id) {
  _cardAtualId = id;

  if (_estadoCartao === 'pergunta') {
    try {
      flipCard(id);
      _estadoCartao = 'resposta';
    } catch (e) {
      console.error('[Fissão] virarCartao revelar:', e);
    }
  } else {
    try {
      const el = document.getElementById('card-' + id);
      if (el) el.classList.remove('flipped');
      _estadoCartao = 'pergunta';
      _cardAtualId = null;
    } catch (e) {
      console.error('[Fissão] virarCartao avançar:', e);
    }
  }
}

export function inicializarAnki() {
  const wrap = document.getElementById('ankiList');
  if (!wrap) {
    console.warn('[Fissão] inicializarAnki: #ankiList não encontrado');
  }
}