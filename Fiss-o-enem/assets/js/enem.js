// ═══════════════════════════════════════════════════════════
// enem.js — Mapa de incidência de temas no ENEM.
//
// Melhorias:
//   - Aparece completo mesmo sem sessões registradas
//   - Filtros por área e por nível de incidência
//   - Barra de prioridade visual (combina incidência + desempenho)
//   - Legenda clara com explicação de cada coluna
//   - Contador de temas por área
//   - Ordenação: prioridade primeiro
// ═══════════════════════════════════════════════════════════
 
import { calcIncidencia } from './diagnostico.js';
 
// ─── Estado do filtro ─────────────────────────────────────
let _filtroArea  = 'todos';
let _filtroNivel = 'todos';
 
// ─── Labels e cores ───────────────────────────────────────
const NIVEL_LABEL = {
  'muito-alta': 'Muito Alta',
  'alta':       'Alta',
  'media':      'Média',
  'baixa':      'Baixa'
};
 
const NIVEL_CLASS = {
  'muito-alta': 't-mta',
  'alta':       't-alt',
  'media':      't-med',
  'baixa':      't-bax'
};
 
const NIVEL_ICON = {
  'muito-alta': '🔴',
  'alta':       '🟠',
  'media':      '🟡',
  'baixa':      '🟢'
};
 
const NIVEL_PESO = {
  'muito-alta': 4,
  'alta':       3,
  'media':      2,
  'baixa':      1
};
 
const AREA_ICON = {
  cn:  '🔬',
  ch:  '🌍',
  lc:  '📖',
  mat: '📐',
  red: '✍️'
};
 
// ─── Calcula prioridade do tema (0–100) ───────────────────
// Combina incidência no ENEM com deficit de desempenho do aluno.
// Quanto maior, mais urgente estudar.
 
function calcPrioridadeVisual(nivel, desempenho) {
  const pesoInc = NIVEL_PESO[nivel] || 1;
 
  if (!desempenho) {
    // Sem dados: prioridade só pela incidência
    return pesoInc * 20;
  }
 
  const deficit = Math.max(0, 70 - desempenho.acerto); // quanto falta para 70%
  return Math.min(100, pesoInc * 15 + deficit * 0.7);
}
 
// ─── Renderiza os filtros ─────────────────────────────────
 
function renderFiltros(mapa) {
  const totalTemas = mapa.reduce((a, { topicos }) => a + topicos.length, 0);
 
  return `
    <div class="inc-filtros" style="
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 20px;
      align-items: center;
    ">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button
          class="inc-filtro-btn ${_filtroArea === 'todos' ? 'active' : ''}"
          onclick="filtrarIncidencia('area','todos')"
        >Todas as áreas</button>
        ${mapa.map(({ area }) => `
          <button
            class="inc-filtro-btn ${_filtroArea === area.id ? 'active' : ''}"
            onclick="filtrarIncidencia('area','${area.id}')"
            style="border-color:${area.color}20;color:${_filtroArea === area.id ? '#fff' : area.color}"
          >
            ${AREA_ICON[area.id]} ${area.name.split(' ').pop()}
          </button>
        `).join('')}
      </div>
 
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto">
        <button class="inc-filtro-btn ${_filtroNivel === 'todos' ? 'active' : ''}"
          onclick="filtrarIncidencia('nivel','todos')">Todos</button>
        <button class="inc-filtro-btn t-mta ${_filtroNivel === 'muito-alta' ? 'active' : ''}"
          onclick="filtrarIncidencia('nivel','muito-alta')">🔴 Muito Alta</button>
        <button class="inc-filtro-btn t-alt ${_filtroNivel === 'alta' ? 'active' : ''}"
          onclick="filtrarIncidencia('nivel','alta')">🟠 Alta</button>
      </div>
    </div>
 
    <div style="
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 10px 14px;
      background: var(--surface2);
      border-radius: var(--rsm);
      margin-bottom: 16px;
      font-size: 11px;
      color: var(--muted2);
      flex-wrap: wrap;
    ">
      <span style="font-weight:600;color:var(--tx2)">📊 ${totalTemas} temas mapeados</span>
      <span>🔴 Muito Alta = aparece 8–20× por prova</span>
      <span>🟠 Alta = aparece 4–8× por prova</span>
      <span>🟡 Média = aparece 2–4× por prova</span>
      <span>★ = prioridade: alta incidência + seu déficit</span>
    </div>
  `;
}
 
// ─── Renderiza um card de área ────────────────────────────
 
function renderCardArea({ area, topicos }) {
  // Filtra por nível se necessário
  const topicosFiltrados = _filtroNivel === 'todos'
    ? topicos
    : topicos.filter(t => t.nivel === _filtroNivel);
 
  if (!topicosFiltrados.length) return '';
 
  // Ordena: prioridade ★ primeiro, depois por incidência
  const ordenados = [...topicosFiltrados].sort((a, b) => {
    const pA = calcPrioridadeVisual(a.nivel, a.desempenho);
    const pB = calcPrioridadeVisual(b.nivel, b.desempenho);
    return pB - pA;
  });
 
  const comDesempenho = topicosFiltrados.filter(t => t.desempenho).length;
 
  return `
    <div class="card ai" style="margin-bottom:16px">
      <div class="card-h">
        <div class="card-t" style="color:${area.color}">
          <span style="font-size:18px">${AREA_ICON[area.id]}</span>
          ${area.name}
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          ${comDesempenho > 0 ? `
            <span style="font-size:10px;color:var(--ok);font-family:'JetBrains Mono',monospace">
              ${comDesempenho} com dados
            </span>
          ` : `
            <span style="font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace">
              sem sessões ainda
            </span>
          `}
          <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--muted)">
            ${topicosFiltrados.length} TEMAS
          </span>
        </div>
      </div>
      <div class="card-b" style="padding:4px 14px 14px">
 
        <!-- Cabeçalho da tabela -->
        <div style="
          display:flex;
          justify-content:space-between;
          padding:6px 0 8px;
          border-bottom:1px solid var(--border);
          font-family:'JetBrains Mono',monospace;
          font-size:9px;
          color:var(--muted);
          letter-spacing:.08em;
          text-transform:uppercase;
        ">
          <span>Tema</span>
          <div style="display:flex;gap:24px">
            <span>Frequência</span>
            <span>Incidência</span>
            <span style="min-width:36px;text-align:right">Acerto</span>
          </div>
        </div>
 
        ${ordenados.map(t => {
          const prio = calcPrioridadeVisual(t.nivel, t.desempenho);
          const isPrio = prio >= 55;
 
          const corAcerto = !t.desempenho
            ? 'var(--muted)'
            : t.desempenho.acerto >= 70
            ? 'var(--ok)'
            : t.desempenho.acerto >= 50
            ? 'var(--amb)'
            : 'var(--danger)';
 
          // Barra de prioridade visual
          const barColor = prio >= 70
            ? 'var(--danger)'
            : prio >= 45
            ? 'var(--amb)'
            : 'var(--ind)';
 
          return `
            <div class="inc-row ${isPrio ? 'inc-row-prio' : ''}">
              <div class="inc-row-main">
                <div class="inc-row-tema">
                  ${NIVEL_ICON[t.nivel]}
                  <span>${t.tema}</span>
                  ${isPrio ? '<span class="inc-prio-badge">★ PRIORIDADE</span>' : ''}
                </div>
                ${t.nota ? `<div class="inc-row-nota">${t.nota}</div>` : ''}
 
                <!-- Barra de prioridade -->
                <div style="
                  margin-top:5px;
                  height:2px;
                  background:var(--border);
                  border-radius:99px;
                  overflow:hidden;
                  max-width:200px;
                ">
                  <div style="
                    height:100%;
                    width:${prio}%;
                    background:${barColor};
                    border-radius:99px;
                    transition:width .4s ease;
                  "></div>
                </div>
              </div>
 
              <div class="inc-row-right">
                <span class="tag ${NIVEL_CLASS[t.nivel]}">${NIVEL_LABEL[t.nivel]}</span>
                ${t.freq ? `<span class="inc-freq">${t.freq}</span>` : ''}
                <span style="
                  font-family:'JetBrains Mono',monospace;
                  font-size:12px;
                  font-weight:700;
                  color:${corAcerto};
                  min-width:36px;
                  text-align:right;
                ">
                  ${t.desempenho ? t.desempenho.acerto + '%' : '—'}
                </span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
 
// ─── Função principal exportada ───────────────────────────
 
export function renderIncidencia() {
  const el = document.getElementById('mapaIncidencia');
  if (!el) {
    console.warn('[Fissão] renderIncidencia: #mapaIncidencia não encontrado');
    return;
  }
 
  const mapa = calcIncidencia();
  if (!mapa.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">🎯</div><p>Nenhum dado disponível.</p></div>`;
    return;
  }
 
  // Filtra por área se necessário
  const mapaFiltrado = _filtroArea === 'todos'
    ? mapa
    : mapa.filter(({ area }) => area.id === _filtroArea);
 
  const cards = mapaFiltrado.map(renderCardArea).join('');
  const semResultados = !cards.trim();
 
  el.innerHTML = renderFiltros(mapa) + (
    semResultados
      ? `<div class="empty"><div class="empty-icon">🔍</div><p>Nenhum tema encontrado para este filtro.</p></div>`
      : cards
  );
}
 
// ─── Filtros interativos (chamados pelo HTML via window) ──
 
export function filtrarIncidencia(tipo, valor) {
  if (tipo === 'area')  _filtroArea  = valor;
  if (tipo === 'nivel') _filtroNivel = valor;
  renderIncidencia();
}