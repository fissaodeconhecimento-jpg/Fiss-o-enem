// ═══════════════════════════════════════════════════════════
// redacao.js — Banco de repertórios, ideias e redação ENEM.
// Rodada 4: mais guiado, mais útil e com empty states vivos.
// ═══════════════════════════════════════════════════════════

import { TEMAS_REDACAO } from './constants.js';
import { getState, setState } from './state.js';
import { todayISO, escHtml } from './utils.js';
import { renderAll, closeModal } from './dom.js';

let _temaFiltro = 'todos';

export function getTemaFiltro() {
  return _temaFiltro;
}

export function setTemaFiltro(tema) {
  _temaFiltro = tema;
}

export function filtrarTema(tema, el) {
  _temaFiltro = tema;
  document.querySelectorAll('.tema-pill').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  renderRedacao();
}

export function mostrarMensagemRedacao(texto) {
  const s = document.getElementById('sec-redacao');
  if (!s) return;

  let msg = s.querySelector('.redacao-erro-msg');
  if (!msg) {
    msg = document.createElement('p');
    msg.className = 'redacao-erro-msg';
    msg.style.cssText = 'padding:24px;color:var(--muted2);font-size:13px;';
    s.appendChild(msg);
  }

  msg.textContent = texto;
}

function temaLabel(tema) {
  return TEMAS_REDACAO[tema] || tema || 'Geral';
}

function getRedacaoStats() {
  const state = getState();
  const repertorios = state.repertorios || [];
  const ideias = state.ideias || [];
  const temasRep = new Set(repertorios.map(r => r.tema).filter(Boolean));
  const temasIdeia = new Set(ideias.map(i => i.tema).filter(Boolean));
  const temasCobertos = new Set([...temasRep, ...temasIdeia]);
  const todosTemas = Object.keys(TEMAS_REDACAO);
  const temasSemRep = todosTemas.filter(t => !temasRep.has(t));
  const ideiasPorTipo = ideias.reduce((acc, item) => {
    acc[item.tipo] = (acc[item.tipo] || 0) + 1;
    return acc;
  }, {});

  let temaMaisForte = null;
  let melhorVolume = 0;

  Object.keys(TEMAS_REDACAO).forEach(tema => {
    const volume = repertorios.filter(r => r.tema === tema).length + ideias.filter(i => i.tema === tema).length;
    if (volume > melhorVolume) {
      melhorVolume = volume;
      temaMaisForte = tema;
    }
  });

  return {
    repertorios,
    ideias,
    temasCobertos,
    temasSemRep,
    ideiasPorTipo,
    temaMaisForte,
    totalTemas: todosTemas.length
  };
}

function ensureInsightsContainer() {
  const sec = document.getElementById('sec-redacao');
  if (!sec) return null;

  let wrap = document.getElementById('redacaoInsights');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'redacaoInsights';
    wrap.className = 'redacao-insights-wrap';

    const filtrosCard = document.getElementById('temaFiltros')?.closest('.card');
    if (filtrosCard?.parentNode) {
      filtrosCard.parentNode.insertBefore(wrap, filtrosCard.nextSibling);
    } else {
      sec.prepend(wrap);
    }
  }

  return wrap;
}

function buildStarterSuggestions(stats) {
  const pool = stats.temasSemRep.length ? stats.temasSemRep.slice(0, 3) : Object.keys(TEMAS_REDACAO).slice(0, 3);
  return pool.map(tema => `
    <button class="redacao-chip" onclick="openModal('repertorio'); setTimeout(() => { const t = document.getElementById('rTema'); if (t) t.value='${tema}'; }, 60)">
      ${escHtml(temaLabel(tema))}
    </button>
  `).join('');
}

function renderRedacaoInsights() {
  const wrap = ensureInsightsContainer();
  if (!wrap) return;

  const stats = getRedacaoStats();
  const repertorios = stats.repertorios.length;
  const ideias = stats.ideias.length;
  const cobertura = stats.totalTemas ? Math.round((stats.temasCobertos.size / stats.totalTemas) * 100) : 0;
  const tipoDominante = Object.entries(stats.ideiasPorTipo).sort((a, b) => b[1] - a[1])[0];
  const temaMaisForte = stats.temaMaisForte ? temaLabel(stats.temaMaisForte) : 'Nenhum ainda';

  let diagnostico = 'Seu repertório ainda está raso. O risco é escrever redações com argumento genérico e pouca sustentação.';
  if (repertorios >= 6 && ideias >= 6) {
    diagnostico = 'Sua base já começa a parecer sistema. Agora o ganho vem de conectar melhor repertório + tese + proposta de intervenção.';
  } else if (repertorios >= 3 || ideias >= 3) {
    diagnostico = 'Você já tem material inicial. O próximo salto é cobrir mais temas e parar de depender de improviso.';
  }

  wrap.innerHTML = `
    <div class="redacao-stats-grid">
      <div class="redacao-stat-card">
        <div class="redacao-stat-label">Repertórios salvos</div>
        <div class="redacao-stat-value">${repertorios}</div>
        <div class="redacao-stat-sub">Base sociocultural pronta para puxar na introdução e no desenvolvimento.</div>
      </div>

      <div class="redacao-stat-card">
        <div class="redacao-stat-label">Ideias e teses</div>
        <div class="redacao-stat-value">${ideias}</div>
        <div class="redacao-stat-sub">${tipoDominante ? `Tipo mais salvo: ${escHtml(tipoDominante[0])}` : 'Ainda faltam teses práticas para acelerar a escrita.'}</div>
      </div>

      <div class="redacao-stat-card">
        <div class="redacao-stat-label">Cobertura de temas</div>
        <div class="redacao-stat-value">${cobertura}%</div>
        <div class="redacao-stat-sub">Tema mais forte: ${escHtml(temaMaisForte)}</div>
      </div>
    </div>

    <div class="redacao-diagnostico">
      <div>
        <div class="redacao-diagnostico-title">Leitura estratégica</div>
        <div class="redacao-diagnostico-text">${diagnostico}</div>
      </div>
      <div class="redacao-diagnostico-actions">
        <button class="btn-s" onclick="openModal('repertorio')">+ Repertório</button>
        <button class="btn-s" onclick="openModal('ideia')">+ Ideia</button>
      </div>
    </div>

    <div class="redacao-gap-box">
      <div class="redacao-gap-title">Comece por estes temas</div>
      <div class="redacao-gap-sub">São lacunas óbvias na sua base atual. Ignorar isso agora custa repertório na hora da prova.</div>
      <div class="redacao-chip-row">
        ${buildStarterSuggestions(stats)}
      </div>
    </div>
  `;
}

function renderTemplateBox(containerId, html) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = html;
}

export function renderRedacao() {
  try {
    renderRedacaoInsights();
  } catch (e) {
    console.error('[Fissão] renderRedacaoInsights:', e);
  }

  try {
    renderRepertorios();
  } catch (e) {
    console.error('[Fissão] renderRepertorios:', e);
    mostrarMensagemRedacao('Erro ao carregar repertórios. Tente novamente.');
  }

  try {
    renderIdeias();
  } catch (e) {
    console.error('[Fissão] renderIdeias:', e);
    mostrarMensagemRedacao('Erro ao carregar ideias. Tente novamente.');
  }
}

export function renderRepertorios() {
  const state = getState();
  const el = document.getElementById('repertoriosList');
  const cnt = document.getElementById('repCount');

  if (!el) {
    console.warn('[Fissão] renderRepertorios: #repertoriosList não encontrado');
    return;
  }

  let reps = state.repertorios || [];
  if (_temaFiltro !== 'todos') reps = reps.filter(r => r.tema === _temaFiltro);

  if (cnt) cnt.textContent = reps.length + ' repertório' + (reps.length !== 1 ? 's' : '');

  if (!reps.length) {
    const filtroTxt = _temaFiltro !== 'todos' ? ` para ${escHtml(temaLabel(_temaFiltro))}` : '';
    el.innerHTML = `
      <div class="empty empty-strong">
        <div class="empty-icon">📚</div>
        <p><strong>Seu banco de repertórios está vazio${filtroTxt}.</strong></p>
        <p class="empty-sub">Sem repertório, sua redação tende a soar genérica. Comece salvando 2 ou 3 referências realmente reutilizáveis.</p>
        <div class="empty-actions">
          <button class="btn-s" onclick="openModal('repertorio')">Salvar repertório</button>
          <button class="btn-s" onclick="openModal('ideia')">Criar tese ligada a ele</button>
        </div>
        <div class="redacao-mini-guide">
          <div class="redacao-mini-guide-title">Modelo simples que já funciona</div>
          <div class="redacao-mini-guide-text">Autor/Fonte → ideia central → como isso prova o seu argumento no ENEM.</div>
        </div>
      </div>
    `;
    return;
  }

  el.innerHTML = reps.slice().reverse().map(r => {
    const palavras = (r.palavras || '').split(',').map(p => p.trim()).filter(Boolean);
    const uso = r.uso ? `<div class="rep-uso">💡 Como usar: ${escHtml(r.uso)}</div>` : '<div class="rep-uso rep-uso-soft">💡 Falta dizer como esse repertório entra no texto. Preencha isso e ele fica muito mais acionável.</div>';

    return `
      <div class="rep-card">
        <div class="rep-card-top">
          <div>
            <div class="rep-autor">${escHtml(r.autor)}</div>
            ${r.obra ? `<div class="rep-obra">${escHtml(r.obra)}</div>` : '<div class="rep-obra rep-obra-soft">Sem obra/contexto definido</div>'}
          </div>
          <div style="display:flex;gap:5px;align-items:center;flex-shrink:0">
            <span class="tema-pill active" style="font-size:10px;padding:3px 9px;cursor:default">${escHtml(temaLabel(r.tema))}</span>
            <button class="delbtn" onclick="deleteRepertorio('${r.id}')">✕</button>
          </div>
        </div>
        <div class="rep-label">Ideia central</div>
        <div class="rep-text">${escHtml(r.resumo)}</div>
        ${uso}
        ${palavras.length ? `<div class="rep-tags">${palavras.map(p => `<span class="rep-tag">${escHtml(p)}</span>`).join('')}</div>` : ''}
      </div>
    `;
  }).join('');
}

export function renderIdeias() {
  const state = getState();
  const el = document.getElementById('ideiasList');
  const cnt = document.getElementById('ideiasCount');

  if (!el) {
    console.warn('[Fissão] renderIdeias: #ideiasList não encontrado');
    return;
  }

  let ideas = state.ideias || [];
  if (_temaFiltro !== 'todos') ideas = ideas.filter(i => i.tema === _temaFiltro);

  if (cnt) cnt.textContent = ideas.length + ' ideia' + (ideas.length !== 1 ? 's' : '');

  if (!ideas.length) {
    el.innerHTML = `
      <div class="empty empty-strong">
        <div class="empty-icon">💡</div>
        <p><strong>Você ainda não transformou repertório em argumento.</strong></p>
        <p class="empty-sub">Guardar referência sem virar tese ou argumento é estudar pela metade.</p>
        <div class="empty-actions">
          <button class="btn-s" onclick="openModal('ideia')">Salvar ideia</button>
          <button class="btn-s" onclick="openModal('repertorio')">Adicionar repertório antes</button>
        </div>
      </div>
    `;
    return;
  }

  el.innerHTML = ideas.slice().reverse().map(i => `
    <div class="ideia-card">
      <div class="ideia-head">
        <div class="ideia-tipo ${i.tipo}">${i.tipo.charAt(0).toUpperCase() + i.tipo.slice(1)}${i.tema ? ` · ${escHtml(temaLabel(i.tema))}` : ''}</div>
        <button class="delbtn" onclick="deleteIdeia('${i.id}')">✕</button>
      </div>
      <div class="ideia-text">${escHtml(i.texto)}</div>
    </div>
  `).join('');
}

export function deleteRepertorio(id) {
  const state = getState();

  setState({
    repertorios: (state.repertorios || []).filter(r => r.id !== id)
  });

  renderRedacao();
}

export function deleteIdeia(id) {
  const state = getState();

  setState({
    ideias: (state.ideias || []).filter(i => i.id !== id)
  });

  renderIdeias();
}

function clearFieldError(ids = []) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.borderColor = '';
  });
}

export function saveRepertorio() {
  clearFieldError(['rAutor', 'rTema', 'rResumo']);

  const autorEl = document.getElementById('rAutor');
  const temaEl = document.getElementById('rTema');
  const resumoEl = document.getElementById('rResumo');

  if (!autorEl || !temaEl || !resumoEl) {
    console.error('[Fissão] saveRepertorio: campos não encontrados');
    return;
  }

  const autor = autorEl.value.trim();
  const tema = temaEl.value;
  const resumo = resumoEl.value.trim();

  if (!autor) {
    autorEl.focus();
    autorEl.style.borderColor = 'var(--danger)';
    return;
  }

  if (!tema) {
    temaEl.focus();
    temaEl.style.borderColor = 'var(--danger)';
    return;
  }

  if (!resumo) {
    resumoEl.focus();
    resumoEl.style.borderColor = 'var(--danger)';
    return;
  }

  const rep = {
    id: 'r' + Date.now(),
    autor,
    tema,
    resumo,
    obra: document.getElementById('rObra')?.value?.trim() || '',
    uso: document.getElementById('rUso')?.value?.trim() || '',
    palavras: document.getElementById('rPalavras')?.value?.trim() || '',
    data: todayISO()
  };

  const state = getState();

  setState({
    repertorios: [...(state.repertorios || []), rep]
  });

  closeModal();
  renderAll();
}

export function saveIdeia() {
  clearFieldError(['iaTipo', 'iaTexto']);

  const tipoEl = document.getElementById('iaTipo');
  const textoEl = document.getElementById('iaTexto');
  const temaEl2 = document.getElementById('iaTema');

  if (!tipoEl || !textoEl) {
    console.error('[Fissão] saveIdeia: campos não encontrados');
    return;
  }

  const texto = textoEl.value.trim();
  if (!texto) {
    textoEl.focus();
    textoEl.style.borderColor = 'var(--danger)';
    return;
  }

  const ideia = {
    id: 'i' + Date.now(),
    tipo: tipoEl.value,
    texto,
    tema: temaEl2 ? temaEl2.value : '',
    data: todayISO()
  };

  const state = getState();

  setState({
    ideias: [...(state.ideias || []), ideia]
  });

  closeModal();
  renderAll();
}

export function inicializarRedacao() {
  const rep = document.getElementById('repertoriosList');
  const ide = document.getElementById('ideiasList');

  if (!rep) console.warn('[Fissão] inicializarRedacao: #repertoriosList não encontrado');
  if (!ide) console.warn('[Fissão] inicializarRedacao: #ideiasList não encontrado');

  renderTemplateBox('repertoriosList', document.getElementById('repertoriosList')?.innerHTML || '');
}
