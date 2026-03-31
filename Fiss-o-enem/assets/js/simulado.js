// ═══════════════════════════════════════════════════════════
// simulado.js — Simulado inteligente.
//
// Funciona com e sem sessões registradas:
//   - COM sessões: prioriza temas com menor acerto + alta incidência
//   - SEM sessões: distribui por incidência do ENEM (mais útil que vazio)
// ═══════════════════════════════════════════════════════════
 
import { AREAS, INC_ENEM } from './constants.js';
import { getState }        from './state.js';
import { calcDesempenhoTema, calcPrioridade } from './diagnostico.js';
 
// ─── Labels e classes de incidência ──────────────────────
 
const NIVEL_LABEL = {
  'muito-alta': 'Muito Alta',
  'alta':       'Alta',
  'media':      'Média',
  'baixa':      'Baixa',
};
 
const NIVEL_CLASS = {
  'muito-alta': 't-mta',
  'alta':       't-alt',
  'media':      't-med',
  'baixa':      't-bax',
};
 
const NIVEL_PESO = { 'muito-alta': 4, 'alta': 3, 'media': 2, 'baixa': 1 };
 
// ─── Simulado baseado em dados reais do aluno ────────────
 
function calcSimuladoComDados(qtd, temas) {
  const top = temas
    .map(t => {
      const m = (INC_ENEM[t.area] || []).find(
        i => i.tema.toLowerCase() === t.tema.toLowerCase()
      );
      const inc = m ? m.nivel : 'media';
      return { ...t, incidencia: inc, prioridade: calcPrioridade(t, inc) };
    })
    .sort((a, b) => b.prioridade - a.prioridade)
    .slice(0, 5);
 
  const q = top.length ? Math.ceil(qtd / top.length) : 0;
 
  return top.map(t => ({
    ...t,
    prioridade: Number(t.prioridade.toFixed(1)),
    questoes:   q,
    temDados:   true,
  }));
}
 
// ─── Simulado baseado só na incidência (sem sessões) ─────
 
function calcSimuladoSemDados(qtd) {
  // Pega os temas de maior incidência de cada área
  const candidatos = [];
 
  Object.entries(INC_ENEM).forEach(([areaId, topicos]) => {
    const muitaAlta = topicos.filter(t => t.nivel === 'muito-alta');
    const alta      = topicos.filter(t => t.nivel === 'alta');
    const pool      = [...muitaAlta, ...alta].slice(0, 2);
 
    pool.forEach(t => {
      candidatos.push({
        tema:       t.tema,
        area:       areaId,
        acerto:     null,
        incidencia: t.nivel,
        prioridade: NIVEL_PESO[t.nivel] * 100,
        questoes:   0,
        temDados:   false,
        nota:       t.nota || '',
      });
    });
  });
 
  // Distribui questões igualmente entre os top 5
  const top = candidatos
    .sort((a, b) => b.prioridade - a.prioridade)
    .slice(0, 5);
 
  const q = Math.ceil(qtd / top.length);
  return top.map((t, i) => ({
    ...t,
    questoes: i === top.length - 1
      ? qtd - q * (top.length - 1)  // último recebe o resto
      : q,
  }));
}
 
// ─── Função principal de cálculo ─────────────────────────
 
export function calcSimulado(qtd = 20) {
  const state = getState();
  const temas = calcDesempenhoTema(state.sessions || []);
 
  if (temas.length >= 3) return calcSimuladoComDados(qtd, temas);
  return calcSimuladoSemDados(qtd);
}
 
// ─── Renderização ─────────────────────────────────────────
 
export function renderSimulado() {
  const el  = document.getElementById('simuladoBody');
  if (!el) {
    console.warn('[Fissão] renderSimulado: #simuladoBody não encontrado');
    return;
  }
 
  const qtd  = parseInt(document.getElementById('simQtd')?.value || '20');
  const sim  = calcSimulado(qtd);
  const tEl  = document.getElementById('simTotal');
  const semDados = sim.length > 0 && !sim[0].temDados;
 
  if (!sim.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">⚗️</div><p>Não foi possível gerar o simulado.</p></div>`;
    if (tEl) tEl.textContent = '';
    return;
  }
 
  const totalQ = sim.reduce((a, t) => a + t.questoes, 0);
  if (tEl) tEl.textContent = `${totalQ} QUESTÕES`;
 
  // Banner informativo diferente para cada modo
  const banner = semDados
    ? `<div style="background:var(--amb-bg);border:1px solid var(--amb-br);border-radius:var(--rsm);padding:10px 14px;margin-bottom:12px;font-size:12px;color:var(--amb);line-height:1.5">
        ⚡ Sem sessões ainda — distribuição baseada nos temas que <strong>mais caem no ENEM</strong>. Registre sessões para personalizar.
       </div>`
    : '';
 
  el.innerHTML = banner + sim.map((t, i) => {
    const area = AREAS.find(a => a.id === t.area);
    const corAcerto = t.acerto === null
      ? 'var(--muted)'
      : t.acerto >= 70 ? 'var(--ok)'
      : t.acerto >= 50 ? 'var(--amb)'
      : 'var(--danger)';
 
    const bw = Math.min((t.prioridade / 300) * 100, 100);
 
    return `
      <div class="sim-row">
        <div class="sim-rank">${i + 1}</div>
 
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span>${t.tema}</span>
            <span style="color:${area?.color || 'var(--muted)'};font-size:10.5px;font-weight:400">
              ${area?.name || ''}
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap">
            <div style="flex:1;max-width:130px">
              <div style="font-family:'JetBrains Mono',monospace;font-size:7.5px;color:var(--muted);margin-bottom:2px">
                PRIO ${t.prioridade}pts
              </div>
              <div class="bt">
                <div class="bf" style="background:var(--ind);width:${bw}%"></div>
              </div>
            </div>
            <span class="tag ${NIVEL_CLASS[t.incidencia]}">${NIVEL_LABEL[t.incidencia]}</span>
          </div>
          ${t.nota ? `<div style="font-size:11px;color:var(--muted2);margin-top:4px">${t.nota}</div>` : ''}
        </div>
 
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${corAcerto}">
            ${t.acerto !== null ? t.acerto + '%' : '—'}
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--muted)">
            ${t.acerto !== null ? 'acerto' : 'sem dados'}
          </div>
        </div>
 
        <div class="sim-qbox">
          <div class="sim-qnum">${t.questoes}</div>
          <div class="sim-qlbl">questões</div>
        </div>
      </div>`;
  }).join('') +
 
  `<div style="padding-top:13px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);margin-top:4px">
    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--muted)">TOTAL</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:600;color:var(--ind-l)">
      ${totalQ} <span style="font-size:12px;color:var(--muted)">questões</span>
    </div>
  </div>`;
}