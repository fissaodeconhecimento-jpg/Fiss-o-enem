// ═══════════════════════════════════════════════════════════
// erros.js — Caderno de erros com filtros, busca e agrupamentos.
// ═══════════════════════════════════════════════════════════

import { AREAS } from './constants.js';
import { getState, setState } from './state.js';
import { todayISO, formatDate, escHtml } from './utils.js';
import { renderAll, closeModal } from './dom.js';
import { gerarRevisoes } from './revisoes.js';
import { criarCartaoDeErro } from './anki.js';

let _erroFiltroArea = 'todos';
let _erroFiltroTipo = 'todos';
let _erroBusca = '';
let _erroOrdenacao = 'recentes';

const emptyBox = (icon, text) => `<div class="empty"><div class="empty-icon">${icon}</div><p>${text}</p></div>`;

function norm(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getAreaInfo(id) {
  return AREAS.find(a => a.id === id);
}

function getErroStats(caderno) {
  const temas = new Map();
  const tipos = new Map();
  const conceitos = new Map();

  caderno.forEach(e => {
    const temaKey = norm(e.tema);
    if (temaKey) temas.set(temaKey, (temas.get(temaKey) || 0) + 1);

    const tipoKey = norm(e.tipoErro);
    if (tipoKey) tipos.set(tipoKey, (tipos.get(tipoKey) || 0) + 1);

    const conceitoKey = norm(e.conceito);
    if (conceitoKey) conceitos.set(conceitoKey, (conceitos.get(conceitoKey) || 0) + 1);
  });

  const repetidos = [...temas.values()].filter(v => v >= 2).length;
  const topTipo = [...tipos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const topConceito = [...conceitos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    temasUnicos: temas.size,
    repetidos,
    topTipo,
    topConceito
  };
}

function filtrarLista(caderno) {
  const busca = norm(_erroBusca);

  const filtrada = caderno.filter(e => {
    const passaArea = _erroFiltroArea === 'todos' || e.area === _erroFiltroArea;
    const passaTipo = _erroFiltroTipo === 'todos' || norm(e.tipoErro) === norm(_erroFiltroTipo);
    const texto = norm([e.tema, e.questao, e.meuRaciocinio, e.respostaCorreta, e.conceito].join(' '));
    const passaBusca = !busca || texto.includes(busca);
    return passaArea && passaTipo && passaBusca;
  });

  const sorted = [...filtrada].sort((a, b) => {
    if (_erroOrdenacao === 'antigos') return a.data.localeCompare(b.data);
    if (_erroOrdenacao === 'tema') return String(a.tema || '').localeCompare(String(b.tema || ''), 'pt-BR');
    if (_erroOrdenacao === 'area') return String(a.area || '').localeCompare(String(b.area || ''), 'pt-BR');
    return b.data.localeCompare(a.data);
  });

  return sorted;
}

export function filtrarErros(area, tipo, busca, ordenacao) {
  if (area !== undefined) _erroFiltroArea = area;
  if (tipo !== undefined) _erroFiltroTipo = tipo;
  if (busca !== undefined) _erroBusca = busca;
  if (ordenacao !== undefined) _erroOrdenacao = ordenacao;
  renderCaderno();
  renderConceitos();
}

export function limparFiltroErros() {
  _erroFiltroArea = 'todos';
  _erroFiltroTipo = 'todos';
  _erroBusca = '';
  _erroOrdenacao = 'recentes';
  renderCaderno();
  renderConceitos();
}

export function aplicarFiltroConceito(conceito) {
  _erroBusca = conceito || '';
  renderCaderno();
  renderConceitos();
}

export function saveErro() {
  const area = document.getElementById('f-area')?.value || 'cn';
  const data = document.getElementById('f-date')?.value || todayISO();
  const tema = document.getElementById('f-tema')?.value.trim() || 'Geral';
  const questao = document.getElementById('f-questao')?.value.trim() || '';
  const raciocinio = document.getElementById('f-raciocinio')?.value.trim() || '';
  const resposta = document.getElementById('f-resposta')?.value.trim() || '';
  const tipo = document.getElementById('f-tipo')?.value || '';
  const conceito = document.getElementById('f-conceito')?.value.trim() || '';

  if (!tema) {
    alert('Informe o tema do erro.');
    return;
  }

  const state = getState();
  const id = 'e' + Date.now();

  const erro = {
    id,
    area,
    tema,
    questao,
    meuRaciocinio: raciocinio,
    respostaCorreta: resposta,
    tipoErro: tipo,
    conceito,
    data
  };

  setState({
    caderno: [erro, ...state.caderno],
    errosDiag: [
      ...state.errosDiag,
      { tipo, date: data, area, tema }
    ]
  });

  gerarRevisoes(data, tema, area);
  criarCartaoDeErro(erro);

  closeModal();
  renderAll();
}

export function deleteErro(id) {
  const state = getState();

  setState({
    caderno: state.caderno.filter(e => e.id !== id)
  });

  renderAll();
}

export function renderCaderno() {
  const state = getState();
  const el = document.getElementById('errosList');
  if (!el) {
    console.warn('[Fissão] renderCaderno: #errosList não encontrado');
    return;
  }

  const countEl = document.getElementById('errosCount');
  if (countEl) countEl.textContent = `${state.caderno.length} registrados`;

  if (!state.caderno.length) {
    el.innerHTML = emptyBox('📓', 'Nenhum erro registrado ainda. Seus erros mais úteis precisam morar aqui, não só na sua cabeça.');
    return;
  }

  const tiposDisponiveis = [...new Set(state.caderno.map(e => e.tipoErro).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const stats = getErroStats(state.caderno);
  const filtrados = filtrarLista(state.caderno);

  const statsHtml = `
    <div class="erros-insights">
      <div class="erro-insight-card">
        <div class="erro-insight-label">Total</div>
        <div class="erro-insight-value">${state.caderno.length}</div>
      </div>
      <div class="erro-insight-card">
        <div class="erro-insight-label">Temas únicos</div>
        <div class="erro-insight-value">${stats.temasUnicos}</div>
      </div>
      <div class="erro-insight-card">
        <div class="erro-insight-label">Temas repetidos</div>
        <div class="erro-insight-value">${stats.repetidos}</div>
      </div>
      <div class="erro-insight-card ${stats.topTipo ? '' : 'is-muted'}">
        <div class="erro-insight-label">Erro mais comum</div>
        <div class="erro-insight-mini">${stats.topTipo ? escHtml(stats.topTipo) : 'Sem padrão ainda'}</div>
      </div>
    </div>`;

  const filtrosHtml = `
    <div class="erros-toolbar">
      <input
        class="erro-search"
        type="text"
        placeholder="Buscar tema, questão ou conceito..."
        value="${escHtml(_erroBusca)}"
        oninput="filtrarErros(undefined, undefined, this.value, undefined)"
      >
      <select class="erro-select" onchange="filtrarErros(this.value, undefined, undefined, undefined)">
        <option value="todos" ${_erroFiltroArea === 'todos' ? 'selected' : ''}>Todas as áreas</option>
        ${AREAS.map(a => `<option value="${a.id}" ${_erroFiltroArea === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
      </select>
      <select class="erro-select" onchange="filtrarErros(undefined, this.value, undefined, undefined)">
        <option value="todos" ${_erroFiltroTipo === 'todos' ? 'selected' : ''}>Todos os tipos</option>
        ${tiposDisponiveis.map(tipo => `<option value="${escHtml(tipo)}" ${_erroFiltroTipo === tipo ? 'selected' : ''}>${escHtml(tipo)}</option>`).join('')}
      </select>
      <select class="erro-select" onchange="filtrarErros(undefined, undefined, undefined, this.value)">
        <option value="recentes" ${_erroOrdenacao === 'recentes' ? 'selected' : ''}>Mais recentes</option>
        <option value="antigos" ${_erroOrdenacao === 'antigos' ? 'selected' : ''}>Mais antigos</option>
        <option value="tema" ${_erroOrdenacao === 'tema' ? 'selected' : ''}>Tema A–Z</option>
        <option value="area" ${_erroOrdenacao === 'area' ? 'selected' : ''}>Área</option>
      </select>
      <button class="erro-clear-btn" onclick="limparFiltroErros()">Limpar</button>
    </div>`;

  const topHint = stats.topConceito
    ? `<div class="erros-hint">💡 Conceito mais repetido no seu caderno: <strong>${escHtml(stats.topConceito)}</strong></div>`
    : '';

  if (!filtrados.length) {
    el.innerHTML = statsHtml + filtrosHtml + topHint + emptyBox('🔎', 'Nenhum erro encontrado para esse filtro. Isso não significa progresso — pode ser só filtro demais.');
    return;
  }

  const listaHtml = filtrados.map(e => {
    const area = getAreaInfo(e.area);
    const tipoTag = e.tipoErro ? `<span class="tag t-med">${escHtml(e.tipoErro)}</span>` : '';
    const tema = escHtml(e.tema || 'Geral');
    const questao = escHtml(e.questao);
    const raciocinio = escHtml(e.meuRaciocinio);
    const resposta = escHtml(e.respostaCorreta);
    const conceito = escHtml(e.conceito);

    return `<div class="erro-card">
      <div class="erro-card-top">
        <div>
          <div class="erro-tema">${tema}</div>
          <div class="erro-area-tag" style="color:${area?.color || 'var(--muted)'}">${area?.name || ''} · ${formatDate(e.data)}</div>
        </div>
        <div class="erro-tags">
          ${tipoTag}
          <button class="erro-delete-btn" onclick="deleteErro('${e.id}')" title="Excluir erro">✕</button>
        </div>
      </div>
      ${questao ? `<div class="erro-campo">QUESTÃO</div><div class="erro-texto">${questao}</div>` : ''}
      ${raciocinio ? `<div class="erro-campo">MEU RACIOCÍNIO</div><div class="erro-texto erro-texto-danger">${raciocinio}</div>` : ''}
      ${resposta ? `<div class="erro-campo">RESPOSTA CORRETA</div><div class="erro-texto erro-texto-ok">${resposta}</div>` : ''}
      ${conceito ? `<div class="erro-campo">CONCEITO-CHAVE</div><button class="erro-conceito-chip" onclick="aplicarFiltroConceito('${conceito.replace(/'/g, "\\'")}')">💡 ${conceito}</button>` : ''}
    </div>`;
  }).join('');

  el.innerHTML = statsHtml + filtrosHtml + topHint + `<div class="erros-result-count">${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''}</div>` + listaHtml;
}

export function renderConceitos() {
  const state = getState();
  const el = document.getElementById('conceitosList');
  if (!el) {
    console.warn('[Fissão] renderConceitos: #conceitosList não encontrado');
    return;
  }

  if (!state.caderno.length) {
    el.innerHTML = emptyBox('🔀', 'Registre erros com conceito para ver onde você confunde as bases.');
    return;
  }

  const contagem = {};

  state.caderno.forEach(e => {
    if (!e.conceito) return;
    const k = norm(e.conceito);

    if (!contagem[k]) {
      contagem[k] = {
        conceito: e.conceito,
        count: 0,
        area: e.area,
        ultimaData: e.data,
        temas: new Set()
      };
    }

    contagem[k].count++;
    contagem[k].temas.add(e.tema || 'Geral');
    if (e.data > contagem[k].ultimaData) contagem[k].ultimaData = e.data;
  });

  const sorted = Object.values(contagem).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.ultimaData.localeCompare(a.ultimaData);
  });

  if (!sorted.length) {
    el.innerHTML = emptyBox('🔀', 'Preencha o campo “Conceito-chave” ao registrar erros para criar sua biblioteca de confusões recorrentes.');
    return;
  }

  el.innerHTML = `
    <div class="conceitos-head">
      <div class="conceitos-sub">Os conceitos mais repetidos devem virar revisão e treino dirigido.</div>
    </div>
    <div class="conceitos-stack">
      ${sorted.slice(0, 12).map(c => {
        const area = getAreaInfo(c.area);
        return `<button class="confuso-item" onclick="aplicarFiltroConceito('${escHtml(c.conceito).replace(/'/g, "\\'")}')">
          <div>
            <div class="confuso-title">${escHtml(c.conceito)}</div>
            <div class="confuso-meta" style="color:${area?.color || 'var(--muted)'}">${area?.name || ''} · ${c.temas.size} tema${c.temas.size !== 1 ? 's' : ''}</div>
          </div>
          <div class="confuso-num">${c.count}x</div>
        </button>`;
      }).join('')}
    </div>`;
}
