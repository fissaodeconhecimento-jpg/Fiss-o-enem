// ═══════════════════════════════════════════════════════════
// diagnostico.js — Algoritmos de análise e renderização de diagnóstico.
// ═══════════════════════════════════════════════════════════
 
import { AREAS, TIPOS_ERRO, INC_ENEM, PESOS_INC } from './constants.js';
import { getState } from './state.js';
import { calcScore, scoreGeral, scoreLetter } from './utils.js';
 
export function calcDesempenhoTema(sessoes) {
  const t = {};
 
  sessoes.forEach(s => {
    const k = s.topic + '||' + s.area;
    if (!t[k]) t[k] = { tema: s.topic, area: s.area, acertos: 0, total: 0 };
    t[k].acertos += s.correct;
    t[k].total += s.total;
  });
 
  return Object.values(t)
    .map(x => ({
      ...x,
      acerto: Number(((x.acertos / x.total) * 100).toFixed(1)),
      score: calcScore(x.acertos, x.total)
    }))
    .sort((a, b) => a.acerto - b.acerto);
}
 
export function calcPrioridade(t, inc) {
  return (PESOS_INC[inc] || 1) * (100 - t.acerto);
}
 
export function gerarFoco(temas) {
  if (!temas.length) return null;
 
  let melhor = null;
  let pMax = -1;
 
  temas.forEach(t => {
    const m = (INC_ENEM[t.area] || []).find(i => i.tema.toLowerCase() === t.tema.toLowerCase());
    const inc = m ? m.nivel : 'media';
    const p = calcPrioridade(t, inc);
 
    if (p > pMax) {
      pMax = p;
      melhor = { ...t, incidencia: inc, prioridade: p };
    }
  });
 
  return melhor;
}
 
// Alertas Cognitivos
export function calcAlertas() {
  const state = getState();
  const temas = calcDesempenhoTema(state.sessions);
 
  return temas
    .map(t => {
      const ilusao = t.total >= 8 && t.acerto < 55;
      const falso = t.total <= 4 && t.acerto >= 80;
      const dom = t.total >= 6 && t.acerto >= 70;
 
      let tipo = null;
      if (ilusao) tipo = 'ilusao';
      else if (falso) tipo = 'falso';
      else if (dom) tipo = 'dominio';
 
      return tipo ? { ...t, tipo } : null;
    })
    .filter(Boolean);
}
 
// Evolução semanal
export function calcEvoSemanal(sessoes) {
  const s = {};
 
  sessoes.forEach(x => {
    const d = new Date(x.date + 'T12:00:00');
    const yr = d.getFullYear();
    const wk = Math.ceil((d.getDate() + new Date(yr, d.getMonth(), 1).getDay()) / 7);
    const k = `${yr}-S${wk < 10 ? '0' + wk : wk}`;
 
    if (!s[k]) s[k] = { acertos: 0, total: 0, label: `S${wk}` };
    s[k].acertos += x.correct;
    s[k].total += x.total;
  });
 
  return Object.entries(s)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({
      semana: k,
      label: v.label,
      acerto: v.total ? Number(((v.acertos / v.total) * 100).toFixed(1)) : 0
    }));
}
 
export function calcEvoPorArea(sessoes) {
  const r = {};
  AREAS.forEach(a => {
    r[a.id] = [];
  });
 
  const semanas = calcEvoSemanal(sessoes).map(s => s.semana);
 
  semanas.forEach(sem => {
    AREAS.forEach(a => {
      const ss = sessoes.filter(s => {
        const d = new Date(s.date + 'T12:00:00');
        const yr = d.getFullYear();
        const wk = Math.ceil((d.getDate() + new Date(yr, d.getMonth(), 1).getDay()) / 7);
        return s.area === a.id && `${yr}-S${wk < 10 ? '0' + wk : wk}` === sem;
      });
 
      const tot = ss.reduce((x, s) => x + s.total, 0);
      const cor = ss.reduce((x, s) => x + s.correct, 0);
 
      if (tot) r[a.id].push({ semana: sem, acerto: Math.round(cor / tot * 100) });
    });
  });
 
  return r;
}
 
export function calcTempoMedio() {
  const state = getState();
  const c = state.sessions.filter(s => s.tempo && s.total > 0);
  if (!c.length) return null;
 
  return Number(
    (
      c.reduce((a, s) => a + s.tempo, 0) /
      c.reduce((a, s) => a + s.total, 0)
    ).toFixed(2)
  );
}
 
// Revisões / Erros
export function calcMapaErros() {
  const state = getState();
  if (!state.errosDiag.length) return [];
 
  const c = {};
  TIPOS_ERRO.forEach(t => (c[t] = 0));
  state.errosDiag.forEach(e => {
    if (c[e.tipo] !== undefined) c[e.tipo]++;
  });
 
  const tot = state.errosDiag.length;
 
  return TIPOS_ERRO
    .map(t => ({
      tipo: t,
      count: c[t],
      pct: tot ? Math.round((c[t] / tot) * 100) : 0
    }))
    .sort((a, b) => b.pct - a.pct);
}
 
export function calcIncidencia() {
  const state = getState();
  const temas = calcDesempenhoTema(state.sessions);
 
  return AREAS.map(area => ({
    area,
    topicos: (INC_ENEM[area.id] || []).map(item => ({
      ...item,
      desempenho:
        temas.find(
          t => t.area === area.id && t.tema.toLowerCase() === item.tema.toLowerCase()
        ) || null
    }))
  }));
}
 
export function getAreaStats() {
  const state = getState();
 
  return AREAS.map(a => {
    const ss = state.sessions.filter(s => s.area === a.id);
    if (!ss.length) return null;
 
    const total = ss.reduce((x, s) => x + s.total, 0);
    const correct = ss.reduce((x, s) => x + s.correct, 0);
 
    return { ...a, total, correct };
  }).filter(Boolean);
}
 
export function renderDiagnostico() {
  const state = getState();
  const diagEl = document.getElementById('diagErros');
  if (!diagEl) {
    console.warn('[Fissão] renderDiagnostico: #diagErros não encontrado');
    return;
  }
 
  const mapa = calcMapaErros();
  const tot = state.errosDiag.length;
  const score = scoreGeral(state.sessions);
  const sl = scoreLetter(score);
 
  const diagErrosEl = document.getElementById('diagErros');
  const diagScoreEl = document.getElementById('diagScore');
  const diagScoreLabelEl = document.getElementById('diagScoreLabel');
 
  if (diagErrosEl) diagErrosEl.textContent = tot;
  if (diagScoreEl) diagScoreEl.textContent = tot ? score : '—';
  if (diagScoreLabelEl) diagScoreLabelEl.textContent = `Nível ${sl}`;
 
  const topTipoEl = document.getElementById('diagTipoTop');
  const topTipoPctEl = document.getElementById('diagTipoTopPct');
 
  if (mapa.length && mapa[0].count > 0) {
    if (topTipoEl) topTipoEl.textContent = mapa[0].tipo;
    if (topTipoPctEl) topTipoPctEl.textContent = mapa[0].pct + '% dos erros';
  } else {
    if (topTipoEl) topTipoEl.textContent = '—';
    if (topTipoPctEl) topTipoPctEl.textContent = 'sem dados';
  }
 
  const el = document.getElementById('mapaErros');
  if (!el) return;
 
  if (!tot) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">🧠</div><p>Registre sessões com tipo de erro.</p></div>`;
    return;
  }
 
  const cores = {
    'Conteúdo': '#f0637a',
    'Interpretação': '#4f9ef8',
    'Atenção': '#f5c518',
    'Cálculo': '#c084fc',
    'Estratégia': '#10d9a0'
  };
 
  el.innerHTML = mapa
    .map(
      m => `<div class="em-row"><div class="em-tipo">${m.tipo}</div><div class="em-bar"><div class="bt"><div class="bf" style="background:${cores[m.tipo] || 'var(--ind)'};width:${m.pct}%"></div></div></div><div class="em-pct">${m.pct}%</div></div>`
    )
    .join('');
}
 
export function renderAreaKPIs() {
  const el = document.getElementById('areaKpis');
  if (!el) {
    console.warn('[Fissão] renderAreaKPIs: #areaKpis não encontrado');
    return;
  }
 
  const stats = getAreaStats();
 
  if (!stats.length) {
    el.innerHTML = `<div style="grid-column:1/-1" class="empty"><p>Sem dados.</p></div>`;
    return;
  }
 
  el.innerHTML = stats
    .map(s => {
      const pct = Math.round((s.correct / s.total) * 100);
      const sc = calcScore(s.correct, s.total);
      const sl = scoreLetter(sc);
 
      return `<div class="kpi" style="border-top:2px solid ${s.color}"><div class="kpi-lbl">${s.name.split(' ').pop()}</div><div class="kpi-val" style="color:${s.color};font-size:22px">${pct}%</div><div class="kpi-sub">${s.correct}/${s.total} · <span class="badge b${sl.toLowerCase()}">${sl}</span></div></div>`;
    })
    .join('');
}
 
export function renderAreaEvolution() {
  const state = getState();
  const el = document.getElementById('areaEvolution');
  if (!el) return;
 
  if (!state.sessions.length) {
    el.innerHTML = `<div class="empty" style="padding:18px"><p>Sem dados.</p></div>`;
    return;
  }
 
  const evo = calcEvoPorArea(state.sessions);
  const stats = getAreaStats();
 
  if (!stats.length) {
    el.innerHTML = `<div class="empty" style="padding:18px"><p>Sem dados.</p></div>`;
    return;
  }
 
  el.innerHTML = stats
    .map(a => {
      const bars = evo[a.id] || [];
      const pct = a.total ? Math.round((a.correct / a.total) * 100) : 0;
      const c = pct >= 70 ? 'var(--ok)' : pct >= 50 ? 'var(--amb)' : 'var(--danger)';
 
      const bh = bars.length
        ? bars
            .map(
              b => `<div class="ae-bar" style="background:${a.color};height:${Math.max(b.acerto, 4)}%;opacity:${b.acerto >= 70 ? 0.9 : 0.55}" title="${b.semana}: ${b.acerto}%"></div>`
            )
            .join('')
        : `<div style="flex:1;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--muted)">sem histórico</div>`;
 
      return `<div class="ae-row"><div class="ae-name" style="color:${a.color}">${a.name}</div><div class="ae-bars">${bh}</div><div class="ae-pct" style="color:${c}">${pct}%</div></div>`;
    })
    .join('');
}
// ─── Gráfico de evolução semanal do acerto ────────────────
// Renderiza um gráfico de linha/barras simples no elemento
// #graficoEvolucao mostrando a taxa de acerto semana a semana.
 
export function renderGraficoEvolucao() {
  const el = document.getElementById('graficoEvolucao');
  if (!el) return;
 
  const state = getState();
  const evo   = calcEvoSemanal(state.sessions);
 
  if (!evo.length) {
    el.innerHTML = `<div class="empty" style="padding:18px"><div class="empty-icon">📈</div><p>Registre sessões para ver a evolução.</p></div>`;
    return;
  }
 
  const maxPct = 100;
  const h      = 120; // altura da área do gráfico em px
  const pontos = evo.slice(-8); // últimas 8 semanas
 
  // Gera pontos SVG
  const n   = pontos.length;
  const gap = n > 1 ? 100 / (n - 1) : 50;
 
  const coords = pontos.map((p, i) => ({
    x: n === 1 ? 50 : i * gap,
    y: 100 - (p.acerto / maxPct) * 100,
    acerto: p.acerto,
    semana: p.semana,
  }));
 
  const polyline = coords.map(p => `${p.x},${p.y}`).join(' ');
 
  const linha = `<polyline
    points="${polyline}"
    fill="none"
    stroke="var(--ind)"
    stroke-width="2"
    stroke-linejoin="round"
    stroke-linecap="round"
  />`;
 
  // Área preenchida sob a linha
  const areaPoints = `0,100 ${polyline} 100,100`;
  const area = `<polygon
    points="${areaPoints}"
    fill="rgba(99,102,241,0.08)"
  />`;
 
  // Linha de 70% (meta)
  const y70 = 100 - 70;
  const meta = `
    <line x1="0" y1="${y70}" x2="100" y2="${y70}"
      stroke="rgba(34,197,94,0.3)" stroke-width="0.8" stroke-dasharray="2 2"/>
    <text x="1" y="${y70 - 1.5}" font-size="4" fill="rgba(34,197,94,0.6)" font-family="monospace">meta 70%</text>
  `;
 
  // Pontos e tooltips
  const dots = coords.map(p => `
    <g>
      <circle cx="${p.x}" cy="${p.y}" r="2.5"
        fill="${p.acerto >= 70 ? 'var(--ok)' : p.acerto >= 50 ? 'var(--amb)' : 'var(--danger)'}"
        stroke="var(--bg)" stroke-width="1"
      />
      <title>${p.semana}: ${p.acerto}%</title>
    </g>
  `).join('');
 
  // Labels do eixo X (semanas)
  const labelsX = coords.map(p => `
    <text x="${p.x}" y="108" text-anchor="middle"
      font-size="3.5" fill="rgba(255,255,255,0.3)" font-family="monospace">
      ${p.semana.replace('Semana ', 'S')}
    </text>
  `).join('');
 
  // Último valor em destaque
  const ultimo  = coords[coords.length - 1];
  const corUlt  = ultimo.acerto >= 70 ? 'var(--ok)' : ultimo.acerto >= 50 ? 'var(--amb)' : 'var(--danger)';
 
  el.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:11px;color:var(--muted2)">Acerto % por semana (últimas ${pontos.length})</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:${corUlt}">
        ${ultimo.acerto}%
        <span style="font-size:9px;color:var(--muted);font-weight:400">atual</span>
      </div>
    </div>
    <svg viewBox="0 0 100 115" width="100%" style="overflow:visible">
      ${area}
      ${meta}
      ${linha}
      ${dots}
      ${labelsX}
    </svg>
  `;
}
 