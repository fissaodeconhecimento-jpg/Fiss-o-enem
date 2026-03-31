// ═══════════════════════════════════════════════════════════
// sessions.js — Sessões de estudo: salvar, deletar, renderizar.
// ═══════════════════════════════════════════════════════════
 
import { AREAS } from './constants.js';
import { getState, setState } from './state.js';
import { formatDate, calcScore, todayISO } from './utils.js';
import { renderAll, openModal } from './dom.js';
import { decidirProximoPasso } from './decision.js';
import { gerarRevisoes } from './revisoes.js';
import { criarCartaoDeErro } from './anki.js';
 
export async function getFocoSugerido() {
  const state = getState();
  const decisao = decidirProximoPasso(state);
 
  if (!decisao || decisao.tipo === 'manual') return null;
 
  return {
    area: decisao.area,
    topic: decisao.topic,
    total: decisao.total,
    tempo: decisao.tempo,
    origem: decisao.origem,
    tipo: decisao.tipo,
    titulo: decisao.titulo,
    descricao: decisao.descricao
  };
}
 
export function buildSessionInsights(state, novaSessao) {
  const hoje = todayISO();
  const pct = novaSessao.total ? Math.round((novaSessao.correct / novaSessao.total) * 100) : 0;
  const score = calcScore(novaSessao.correct, novaSessao.total);
  const tempoPorQuestao = novaSessao.tempo ? Number((novaSessao.tempo / Math.max(novaSessao.total, 1)).toFixed(1)) : null;

  const revisoesGeradas = novaSessao.correct < novaSessao.total ? 3 : 0;
  const ankiGerado = novaSessao.correct < novaSessao.total;
  const revisoesHoje = (state.revisions || []).filter(r => !r.done && r.date <= hoje).length;
  const atrasadas = (state.revisions || []).filter(r => !r.done && r.date < hoje).length;

  const historicoTema = (state.sessions || []).filter(s =>
    s.area === novaSessao.area &&
    String(s.topic || '').trim().toLowerCase() === String(novaSessao.topic || '').trim().toLowerCase()
  );

  const tentativasTema = historicoTema.length;
  const totalTema = historicoTema.reduce((acc, s) => acc + (s.total || 0), 0);
  const corretasTema = historicoTema.reduce((acc, s) => acc + (s.correct || 0), 0);
  const mediaTema = totalTema ? Math.round((corretasTema / totalTema) * 100) : pct;

  let tendencia = 'primeiro registro deste tópico';
  if (tentativasTema > 1) {
    const anteriores = historicoTema.slice(1);
    const totalAnt = anteriores.reduce((acc, s) => acc + (s.total || 0), 0);
    const corAnt = anteriores.reduce((acc, s) => acc + (s.correct || 0), 0);
    const mediaAnt = totalAnt ? Math.round((corAnt / totalAnt) * 100) : pct;
    const delta = pct - mediaAnt;
    tendencia = delta >= 8
      ? `evolução de +${delta} pontos neste tópico`
      : delta <= -8
        ? `queda de ${Math.abs(delta)} pontos neste tópico`
        : 'desempenho estável neste tópico';
  }

  return {
    pct,
    score,
    tempoPorQuestao,
    revisoesGeradas,
    ankiGerado,
    revisoesHoje,
    atrasadas,
    tentativasTema,
    mediaTema,
    tendencia
  };
}

export function saveSession() {
  const area = document.getElementById('f-area')?.value || 'cn';
  const topic = document.getElementById('f-topic')?.value.trim() || 'Geral';
  const total = parseInt(document.getElementById('f-total')?.value);
  const correct = parseInt(document.getElementById('f-correct')?.value);
  const date = document.getElementById('f-date')?.value;
  const tipoErro = document.getElementById('f-erro')?.value || '';
  const tEl = document.getElementById('f-tempo');
  const tempo = tEl && tEl.value ? parseFloat(tEl.value) : null;
 
  if (!total || isNaN(total) || total < 1) {
    alert('Informe o total de questões.');
    return;
  }
 
  if (isNaN(correct) || correct < 0 || correct > total) {
    alert('Questões corretas inválidas.');
    return;
  }
 
  const state = getState();
  const maxId = state.sessions.reduce((m, s) => Math.max(m, s.id || 0), 0);
 
  const novaSessao = {
    id: maxId + 1,
    area,
    topic,
    total,
    correct,
    date,
    tipoErro: tipoErro || null,
    tempo
  };
 
  let novosErrosDiag = [...state.errosDiag];
 
  if (correct < total && tipoErro) {
    novosErrosDiag.push({
      tipo: tipoErro,
      date,
      area,
      tema: topic
    });
  }
 
  setState({
    sessions: [novaSessao, ...state.sessions],
    errosDiag: novosErrosDiag
  });
 
  if (correct < total) {
    gerarRevisoes(date, topic, area);
 
    const cardErro = {
      questao: topic,
      area,
      tema: topic,
      conceito: '',
      respostaCorreta: '',
      tipoErro
    };
 
    criarCartaoDeErro(cardErro);
  }
 
  renderAll();
 
  const areaInfo = AREAS.find(a => a.id === area);
  const stateAtualizado = getState();
  const insights = buildSessionInsights(stateAtualizado, novaSessao);
 
  openModal('sessionSummary', {
    area,
    areaLabel: areaInfo?.name || 'Área',
    topic,
    total,
    correct,
    tempo,
    tipoErro: tipoErro || null,
    date,
    ...insights
  });
}
 
export function deleteSession(id) {
  const state = getState();
  setState({ sessions: state.sessions.filter(s => s.id !== id) });
  renderAll();
}
 
// ─── Estado dos filtros ───────────────────────────────────
let _filtroArea  = 'todos';
let _filtroBusca = '';
 
export function filtrarSessoes(area, busca) {
  if (area  !== undefined) _filtroArea  = area;
  if (busca !== undefined) _filtroBusca = busca.toLowerCase().trim();
  renderSessions();
}
 
export function renderSessions() {
  const state  = getState();
  const dashEl = document.getElementById('sessionListDash');
  const fullEl = document.getElementById('sessionListFull');
 
  if (!dashEl && !fullEl) {
    console.warn('[Fissão] renderSessions: elementos não encontrados');
    return;
  }
 
  const sorted = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date));
 
  // Aplica filtros apenas na lista completa
  const filtradas = sorted.filter(s => {
    const passaArea  = _filtroArea === 'todos' || s.area === _filtroArea;
    const passaBusca = !_filtroBusca || s.topic.toLowerCase().includes(_filtroBusca);
    return passaArea && passaBusca;
  });
 
  const renderItem = s => {
    const area = AREAS.find(a => a.id === s.area);
    const pct  = Math.round((s.correct / s.total) * 100);
    const c    = pct >= 70 ? 'var(--ok)' : pct >= 50 ? 'var(--amb)' : 'var(--danger)';
    const eTag = s.tipoErro
      ? `<span style="font-size:8px;color:var(--info);border:1px solid rgba(79,158,248,.3);padding:1px 5px;border-radius:3px;margin-left:4px">${s.tipoErro}</span>`
      : '';
 
    return `<div class="sitem">
      <div class="sdot" style="background:${area?.color || 'var(--muted)'}"></div>
      <div class="sinfo">
        <div class="stitle">${area?.name || 'Área'}<span style="color:var(--muted);font-weight:400"> — ${s.topic}</span>${eTag}</div>
        <div class="smeta">${formatDate(s.date)} · ${s.correct}/${s.total} acertos · score ${calcScore(s.correct, s.total)}${s.tempo ? ` · ${(s.tempo / s.total).toFixed(1)}min/q` : ''}</div>
      </div>
      <div class="spct" style="color:${c}">${pct}%</div>
      <button class="delbtn" onclick="deleteSession(${s.id})">✕</button>
    </div>`;
  };
 
  const empty = msg => `<div class="empty"><div class="empty-icon">📋</div><p>${msg}</p></div>`;
 
  if (dashEl) {
    dashEl.innerHTML = sorted.length
      ? sorted.slice(0, 5).map(renderItem).join('')
      : empty('Nenhuma sessão registrada.');
  }
 
  if (fullEl) {
    // Controles de filtro
    const totalFiltradas = filtradas.length;
    const controles = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
        <input
          id="sessoesBusca"
          type="text"
          placeholder="Buscar tópico..."
          value="${_filtroBusca}"
          oninput="filtrarSessoes(undefined, this.value)"
          style="
            flex:1;min-width:160px;
            background:var(--surface2);
            border:1.5px solid var(--border2);
            color:var(--tx);
            padding:8px 12px;
            border-radius:var(--rsm);
            font-size:13px;
            outline:none;
            font-family:'Outfit',sans-serif;
          "
        >
        <select
          onchange="filtrarSessoes(this.value, undefined)"
          style="
            background:var(--surface2);
            border:1.5px solid var(--border2);
            color:var(--tx);
            padding:8px 12px;
            border-radius:var(--rsm);
            font-size:13px;
            outline:none;
            font-family:'Outfit',sans-serif;
          "
        >
          <option value="todos" ${_filtroArea === 'todos' ? 'selected' : ''}>Todas as áreas</option>
          ${AREAS.map(a => `<option value="${a.id}" ${_filtroArea === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
        </select>
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);white-space:nowrap">
          ${totalFiltradas} sessão${totalFiltradas !== 1 ? 'ões' : ''}
        </span>
      </div>`;
 
    if (!sorted.length) {
      fullEl.innerHTML = empty('Nenhuma sessão registrada ainda.');
      return;
    }
 
    if (!filtradas.length) {
      fullEl.innerHTML = controles + empty('Nenhuma sessão encontrada para este filtro.');
      return;
    }
 
    fullEl.innerHTML = controles + filtradas.map(renderItem).join('');
  }
}