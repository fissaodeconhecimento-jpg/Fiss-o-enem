// ═══════════════════════════════════════════════════════════
// dashboard.js — KPIs, foco, alertas, calendário, cronômetro e exportPDF.
// Versão com PDF premium melhorado.
// ═══════════════════════════════════════════════════════════

import { AREAS } from './constants.js';
import { getState } from './state.js';
import { todayISO, scoreGeral, scoreLetter } from './utils.js';
import { cartoesPendentes } from './anki.js';
import { calcDesempenhoTema, calcAlertas } from './diagnostico.js';
import { decidirProximoPasso, getTrilhaStatus } from './decision.js';

export function getCalYear()  { return _calYear;  }
export function getCalMonth() { return _calMonth; }

let _calYear  = new Date().getFullYear();
let _calMonth = new Date().getMonth();
let _ci = null, _cs = 0, _cr = false;

function getAreaName(areaId) {
  const area = AREAS.find(a => a.id === areaId);
  return area?.name || 'Área';
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderStarterState() {
  const temaEl = document.getElementById('focoTema');
  const metaEl = document.getElementById('focoMeta');
  const questoesEl = document.getElementById('focoQuestoes');

  if (!temaEl || !metaEl || !questoesEl) return;

  temaEl.textContent = 'Comece pelo seu primeiro bloco inteligente';
  metaEl.innerHTML = `
    <span class="foco-pill">1 sessão já destrava o diagnóstico</span>
    <span class="foco-pill">3 sessões já revelam padrões</span>
    <span class="foco-pill">Comece por um tópico real, não perfeito</span>
  `;
  questoesEl.textContent = '10';
  renderTrilha(null);
}

export function renderFoco() {
  const state = getState();
  const decisao = decidirProximoPasso(state);
  const pend = state.revisions.filter(r => !r.done && r.date <= todayISO()).length;
  const ankiP = cartoesPendentes().length;

  (document.getElementById('focoPendentes') || {}).textContent = pend;
  (document.getElementById('focoAnki') || {}).textContent = ankiP;

  if (!state.sessions.length) {
    renderStarterState();
    return;
  }

  const temaEl = document.getElementById('focoTema');
  const metaEl = document.getElementById('focoMeta');
  const questoesEl = document.getElementById('focoQuestoes');

  if (!temaEl || !metaEl || !questoesEl) return;

  if (!decisao || decisao.tipo === 'manual') {
    temaEl.textContent = 'Seu painel já tem dados — falta manter ritmo';
    metaEl.innerHTML = `
      <span class="foco-pill">Registre hoje para liberar novas sugestões</span>
      <span class="foco-pill">Consistência > intensidade</span>
    `;
    questoesEl.textContent = '10';
    renderTrilha(null);
    return;
  }

  let subtags = [];

  if (decisao.tipo === 'revisao') {
    temaEl.textContent = `Revisão pendente — ${decisao.topic}`;
    subtags = [
      `<span class="foco-pill">Prioridade alta</span>`,
      `<span class="foco-pill">Tipo: revisão</span>`
    ];
  } else {
    temaEl.textContent = `${decisao.area ? getAreaName(decisao.area) + ' — ' : ''}${decisao.topic}`;
    subtags = [
      decisao.tipo === 'reforco'
        ? `<span class="foco-pill">Reforço necessário</span>`
        : decisao.tipo === 'sequencia'
          ? `<span class="foco-pill">Sequência da trilha</span>`
          : `<span class="foco-pill">Próximo estudo</span>`
    ];

    if (typeof decisao.acerto === 'number') {
      subtags.push(`<span class="foco-pill">Acerto: ${decisao.acerto}%</span>`);
    }
    if (typeof decisao.score !== 'undefined') {
      subtags.push(`<span class="foco-pill">Score: ${decisao.score}</span>`);
    }
  }

  metaEl.innerHTML = subtags.join('');
  questoesEl.textContent = decisao.total || 10;

  renderTrilha(decisao.area);
}

function renderTrilha(area) {
  const bodyEl = document.getElementById('trilhaCardBody');
  const areaLabelEl = document.getElementById('trilhaAreaLabel');
  if (!bodyEl || !areaLabelEl) return;

  if (!area) {
    areaLabelEl.textContent = 'primeiro passo';
    bodyEl.innerHTML = `
      <div class="empty empty-rich">
        <div class="empty-icon">🧭</div>
        <p>A trilha nasce quando você registra sessões com <strong>área</strong> e <strong>tópico</strong>.</p>
        <div class="empty-actions">
          <button class="btn-p" onclick="openModal('session')">Registrar 1ª sessão</button>
        </div>
      </div>
    `;
    return;
  }

  const state = getState();
  const trilha = getTrilhaStatus(state, area);
  areaLabelEl.textContent = getAreaName(area);

  if (!trilha.length) {
    bodyEl.innerHTML = `
      <div class="empty empty-rich">
        <div class="empty-icon">🧭</div>
        <p>Sem trilha configurada para esta área ainda. Registre mais tópicos para o sistema montar o caminho.</p>
      </div>
    `;
    return;
  }

  bodyEl.innerHTML = `
    <div class="trilha-card-wrap">
      ${trilha.map((item, index) => `
        <div class="trilha-card-item ${item.status}">
          <div class="trilha-card-top">
            <div class="trilha-card-index">${index + 1}</div>
            <div class="trilha-card-status">${getStatusLabel(item.status)}</div>
          </div>

          <div class="trilha-card-title">${escapeHtml(item.tema)}</div>

          <div class="trilha-card-bottom">
            ${
              typeof item.acerto === 'number'
                ? `<span class="trilha-card-pct">${item.acerto}%</span>`
                : `<span class="trilha-card-pct">—</span>`
            }
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function getStatusLabel(status) {
  if (status === 'done') return 'concluído';
  if (status === 'progress') return 'em progresso';
  if (status === 'review') return 'revisar';
  if (status === 'next') return 'próximo';
  return 'bloqueado';
}

export function calcStreak(sessions) {
  if (!sessions || !sessions.length) return 0;

  const diasComSessao = new Set(sessions.map(s => s.date));
  const hoje = new Date();
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];

    if (diasComSessao.has(iso)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

export function renderStreak() {
  const state  = getState();
  const streak = calcStreak(state.sessions);
  const el     = document.getElementById('streakCount');
  const label  = document.getElementById('streakLabel');
  const badge  = document.getElementById('streakBadge');

  if (!el) return;

  el.textContent = streak;

  if (label) {
    label.textContent = streak === 1 ? 'dia seguido' : 'dias seguidos';
  }

  if (badge) {
    if      (streak >= 30) { badge.textContent = '🔥 Mestre';      badge.style.display = 'inline'; }
    else if (streak >= 14) { badge.textContent = '⚡ Em chamas';   badge.style.display = 'inline'; }
    else if (streak >= 7)  { badge.textContent = '✨ Consistente'; badge.style.display = 'inline'; }
    else if (streak >= 3)  { badge.textContent = '🌱 Crescendo';   badge.style.display = 'inline'; }
    else                   { badge.style.display = 'none'; }
  }
}

export function renderKPIs() {
  const state = getState();
  const tot   = state.sessions.reduce((a,s)=>a+s.total,0);
  const cor   = state.sessions.reduce((a,s)=>a+s.correct,0);
  const pct   = tot ? Math.round(cor/tot*100) : null;
  const score = scoreGeral(state.sessions), sl = scoreLetter(score);
  const ankiP = cartoesPendentes().length;
  const revP  = state.revisions.filter(r=>!r.done).length;
  const _set  = (id,val) => { const el=document.getElementById(id); if(el) el.textContent=val; };

  _set('kpiAcerto',    pct!==null ? pct+'%' : '—%');
  _set('kpiAcertoSub', pct!==null ? (pct>=70?'▲ acima da média recente':'▼ abaixo da média recente') : 'registre 1 sessão para abrir');
  _set('kpiTotal',     tot);
  _set('kpiTotalSub',  tot ? cor+' acertos acumulados' : 'o painel começa a ler a partir do 1º bloco');
  _set('kpiScore',     tot ? score : '—');
  _set('kpiScoreSub',  tot ? `Nível ${sl} · log-ponderado` : 'sobe quando há volume + acerto');
  _set('kpiAnki',      ankiP);
  _set('kpiAnkiSub',   ankiP ? `de ${state.anki.length} cartões` : state.anki.length ? 'em dia ✓' : 'erros viram cartões depois');
  _set('kpiRevisoes',  revP);
  _set('sessoesCount', `${state.sessions.length} registradas`);
  _set('ankiTotal', state.anki.length);
  _set('ankiHoje',  ankiP);
  _set('ankiDom',   state.anki.filter(c=>c.nivel>=4).length);

  renderStreak();
}

export function renderAlertas() {
  const el=document.getElementById('alertasGrid');if(!el)return;
  const state = getState();
  const alertas=calcAlertas();
  if(!alertas.length){
    el.innerHTML=`
      <div class="empty empty-rich">
        <div class="empty-icon">🧬</div>
        <p>${state.sessions.length < 3 ? 'Com 3 sessões o sistema começa a detectar padrões cognitivos.' : 'Ainda não há padrão crítico. Continue registrando sessões para o sistema ficar mais preciso.'}</p>
        <div class="empty-mini-grid">
          <div class="empty-mini-card"><strong>1</strong><span>registre área</span></div>
          <div class="empty-mini-card"><strong>2</strong><span>adicione tópico</span></div>
          <div class="empty-mini-card"><strong>3</strong><span>salve seus erros</span></div>
        </div>
      </div>`;
    return;
  }
  const icons={'ilusao':'⚠️','falso':'⚡','dominio':'✅'};
  const labels={'ilusao':'Ilusão de Conhecimento','falso':'Falso Domínio','dominio':'Domínio Consolidado'};
  const details={'ilusao':'Estudou bastante mas ainda erra muito.','falso':'Acerto alto com poucas questões.','dominio':'Desempenho consistente e sólido.'};
  el.innerHTML=alertas.slice(0,9).map(a=>{
    return`<div class="alerta-card ${a.tipo}"><div class="alerta-icon">${icons[a.tipo]}</div><div><div class="alerta-tema">${escapeHtml(a.tema)}</div><div class="alerta-tipo">${labels[a.tipo]}</div><div class="alerta-detalhe">${details[a.tipo]} <span style="color:${a.color||'var(--muted2)'}">${a.acerto}% acerto</span></div></div></div>`;
  }).join('');
}

export function renderPontosFracos() {
  const state = getState();
  const temas=calcDesempenhoTema(state.sessions).slice(0,6);
  ['pontosFracos','pontosFracosDiag'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    if(!temas.length){
      el.innerHTML=`
        <div class="empty empty-rich">
          <div class="empty-icon">📊</div>
          <p>Seus pontos fracos aparecem quando você registra sessões com <strong>tópico</strong>, não só com área.</p>
          <div class="empty-actions">
            <button class="btn-p" onclick="openModal('session')">Registrar sessão completa</button>
          </div>
        </div>`;
      return;
    }
    el.innerHTML=temas.map(t=>{
      const area=AREAS.find(a=>a.id===t.area);
      const c=t.acerto>=70?'var(--ok)':t.acerto>=50?'var(--amb)':'var(--danger)';
      const sl=scoreLetter(t.score);
      return`<div class="fr-row"><div class="fr-h"><div><div class="fr-tema">${escapeHtml(t.tema)}<span class="badge b${sl.toLowerCase()}">${sl}</span></div><div class="fr-sub" style="color:${area?.color}">${area?.name||''}</div></div><div style="text-align:right"><div class="fr-pct" style="color:${c}">${t.acerto}%</div><div style="font-family:'JetBrains Mono',monospace;font-size:7.5px;color:var(--muted)">score ${t.score}</div></div></div><div class="bt"><div class="bf" style="background:${c};width:${t.acerto}%"></div></div></div>`;
    }).join('');
  });
}

export function renderWeekChart() {
  const el = document.getElementById('weekChart');
  if (!el) return;

  const state = getState();
  const today = new Date();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);

    const ds = d.toISOString().split('T')[0];
    const ss = state.sessions.filter(s => s.date === ds);
    const tot = ss.reduce((a, s) => a + s.total, 0);
    const cor = ss.reduce((a, s) => a + s.correct, 0);

    days.push({
      label: ['D','S','T','Q','Q','S','S'][d.getDay()],
      iso: ds,
      total: tot,
      sessions: ss.length,
      pct: tot ? Math.round(cor / tot * 100) : 0,
      hasData: tot > 0
    });
  }

  if (!days.some(d => d.hasData)) {
    el.innerHTML = `
      <div class="empty empty-rich" style="padding:22px 12px;min-height:120px">
        <div class="empty-icon">📆</div>
        <p>Quando você estudar, a sua última semana aparece aqui com ritmo e desempenho por dia.</p>
      </div>
    `;
    return;
  }

  el.innerHTML = days.map(d => {
    const c = d.pct >= 70 ? 'var(--ok)' : d.pct >= 50 ? 'var(--amb)' : d.hasData ? 'var(--danger)' : 'var(--surface3)';
    const tt = d.hasData
      ? `${d.iso} • ${d.sessions} sessão(ões) • ${d.total} questões • ${d.pct}%`
      : `${d.iso} • sem atividade`;
    return `<div class="wday" title="${tt}"><div class="wday-pct">${d.hasData ? d.pct + '%' : ''}</div><div class="wday-bar" style="background:${c};height:${d.hasData ? Math.max(d.pct,8) : 8}%;opacity:${d.hasData ? .95 : .22}"></div><div class="wday-lbl">${d.label}</div></div>`;
  }).join('');
}

export function renderHeatmap() {
  const el = document.getElementById('heatmap');
  if (!el) return;

  const state = getState();
  const by = {};
  state.sessions.forEach(s => { by[s.date] = (by[s.date] || 0) + s.total; });

  if (!state.sessions.length) {
    el.innerHTML = `
      <div class="empty empty-rich" style="padding:18px 10px;width:100%">
        <div class="empty-icon">🔥</div>
        <p>Seu heatmap vai mostrar constância real dos últimos dias. Hoje ele está vazio porque ainda não há sessões registradas.</p>
      </div>
    `;
    return;
  }

  const today = new Date();
  let cur = new Date(today);
  cur.setDate(cur.getDate() - 83);
  cur.setDate(cur.getDate() - cur.getDay());

  const weeks = [];
  const monthMarks = [];
  for (let w = 0; w < 12; w++) {
    const wk = [];
    for (let d = 0; d < 7; d++) {
      const ds = cur.toISOString().split('T')[0];
      const cnt = by[ds] || 0;
      const isToday = ds === today.toISOString().split('T')[0];
      wk.push({ ds, cnt, isToday, lv: cnt === 0 ? '' : cnt < 10 ? 'l1' : cnt < 20 ? 'l2' : cnt < 35 ? 'l3' : 'l4' });
      if (d === 0) {
        monthMarks.push(cur.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''));
      }
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(wk);
  }

  const DL = ['D','S','T','Q','Q','S','S'];
  let html = '<div class="hm-months">' + monthMarks.map(m => `<span>${m}</span>`).join('') + '</div>';
  for (let d = 0; d < 7; d++) {
    html += `<div class="hm-row"><div class="hm-lbl">${DL[d]}</div>`;
    for (let w = 0; w < 12; w++) {
      const c = weeks[w][d];
      const title = `${c.ds} • ${c.cnt} questão(ões)`;
      html += `<div class="hm-cell ${c.lv} ${c.isToday ? 'today' : ''}" title="${title}"></div>`;
    }
    html += '</div>';
  }

  el.innerHTML = html;
}

export function renderCalendar() {
  const state = getState();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const calYear = _calYear;
  const calMonth = _calMonth;

  const MN = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const cmEl = document.getElementById('calMonth');
  if (cmEl) cmEl.textContent = `${MN[calMonth]} ${calYear}`;

  const fD = new Date(calYear, calMonth, 1).getDay();
  const dim = new Date(calYear, calMonth + 1, 0).getDate();

  const sd = new Set(
    state.sessions
      .filter(s => {
        const d = new Date(s.date + 'T12:00:00');
        return d.getFullYear() === calYear && d.getMonth() === calMonth;
      })
      .map(s => +s.date.split('-')[2])
  );

  const rd = new Set(
    state.revisions
      .filter(r => {
        const d = new Date(r.date + 'T12:00:00');
        return d.getFullYear() === calYear && d.getMonth() === calMonth;
      })
      .map(r => +r.date.split('-')[2])
  );

  let c = '';
  for (let i = 0; i < fD; i++) c += `<div class="cal-cell cal-empty"></div>`;

  for (let d = 1; d <= dim; d++) {
    const cellDate = new Date(calYear, calMonth, d);
    const isToday = d === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
    const isPast = cellDate < today && !isToday;
    const hasSession = sd.has(d);
    const hasRevision = rd.has(d);
    const title = [
      `${d}/${String(calMonth + 1).padStart(2, '0')}/${calYear}`,
      hasSession ? 'sessão registrada' : null,
      hasRevision ? 'revisão agendada' : null
    ].filter(Boolean).join(' • ');

    c += `<div class="cal-cell ${isToday ? 'today' : ''} ${hasSession ? 'has-session' : ''} ${hasRevision ? 'has-revision' : ''} ${isPast ? 'past' : ''}" title="${title}">${d}</div>`;
  }

  const grid = document.getElementById('calGrid');
  if (grid) grid.innerHTML = c;
}

export function changeMonth(dir) {
  _calMonth += dir;
  if (_calMonth > 11) { _calMonth = 0; _calYear++; }
  if (_calMonth < 0) { _calMonth = 11; _calYear--; }
  renderCalendar();
}

let _countdownInterval = null;
const ENEM_DATE = '2026-11-08T08:00:00';

export function startCountdown() {
  const footerEl = document.querySelector('.footer-info');
  if (footerEl) {
    const now = new Date();
    const mes = now.toLocaleString('pt-BR', { month: 'short' });
    footerEl.textContent = `${mes.charAt(0).toUpperCase() + mes.slice(1)} · ${now.getFullYear()}`;
  }

  const target = new Date(ENEM_DATE);

  function _tick() {
    const now  = new Date();
    const diff = target - now;

    const dEl    = document.getElementById('cdDias');
    const hEl    = document.getElementById('cdHoras');
    const mEl    = document.getElementById('cdMin');
    const sEl    = document.getElementById('cdSec');
    const diasEl = document.getElementById('diasEnem');

    if (diff <= 0) {
      if (dEl) dEl.textContent = '0';
      if (hEl) hEl.textContent = '00';
      if (mEl) mEl.textContent = '00';
      if (sEl) sEl.textContent = '00';
      if (diasEl) diasEl.textContent = '0';
      return;
    }

    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);
    const secs  = Math.floor((diff % 60000) / 1000);

    if (dEl) dEl.textContent = String(days);
    if (hEl) hEl.textContent = String(hours).padStart(2, '0');
    if (mEl) mEl.textContent = String(mins).padStart(2, '0');
    if (sEl) sEl.textContent = String(secs).padStart(2, '0');
    if (diasEl) diasEl.textContent = String(days);
  }

  _tick();

  if (_countdownInterval) clearInterval(_countdownInterval);
  _countdownInterval = setInterval(_tick, 1000);
}

export function exportPDF() {
  const state = getState();
  const totalQuestoes = state.sessions.reduce((a, s) => a + s.total, 0);
  const totalAcertos = state.sessions.reduce((a, s) => a + s.correct, 0);
  const pct = totalQuestoes ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;
  const score = scoreGeral(state.sessions);
  const scoreNivel = scoreLetter(score);
  const pendentes = state.revisions.filter(r => !r.done).length;
  const ankiPendentes = cartoesPendentes().length;
  const streak = calcStreak(state.sessions);
  const temas = calcDesempenhoTema(state.sessions);
  const decisao = decidirProximoPasso(state);
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const areaStats = AREAS.map(area => {
    const ss = state.sessions.filter(s => s.area === area.id);
    const total = ss.reduce((a, s) => a + s.total, 0);
    const correct = ss.reduce((a, s) => a + s.correct, 0);
    const pctArea = total ? Math.round((correct / total) * 100) : null;
    return { ...area, total, correct, pct: pctArea };
  }).filter(a => a.total > 0).sort((a, b) => (b.total - a.total));

  const leitura = !state.sessions.length
    ? 'Ainda não há sessões suficientes para leitura estratégica. O sistema fica inteligente quando você registra o que realmente estudou.'
    : pct >= 70
      ? 'Você está acima da média recente. O risco agora não é capacidade: é perder consistência.'
      : pct >= 50
        ? 'Seu desempenho tem potencial, mas ainda oscila. O maior ganho está em revisar erros com método.'
        : 'Seu padrão atual indica base fraca ou estudo pouco consolidado. Avançar sem corrigir isso custa tempo e confiança.';

  const projecao = !state.sessions.length
    ? 'Sem dados ainda para projeção confiável.'
    : pct >= 70
      ? 'Se mantiver ritmo e revisão, há uma boa trajetória para desempenho competitivo.'
      : pct >= 50
        ? 'Há espaço real de crescimento, mas ele depende mais de constância do que de intensidade isolada.'
        : 'A projeção atual é frágil. Antes de aumentar volume, você precisa estabilizar fundamentos.';

  const proximoPasso = !state.sessions.length
    ? 'Registrar a primeira sessão completa com área, tópico, total e acertos.'
    : decisao?.tipo === 'revisao'
      ? `Fazer revisão pendente de ${decisao.topic}.`
      : decisao?.topic
        ? `Focar em ${decisao.topic}${decisao.area ? ` (${getAreaName(decisao.area)})` : ''}.`
        : temas[0]
          ? `Reforçar ${temas[0].tema} (${temas[0].acerto}% de acerto).`
          : 'Manter o ritmo e registrar a próxima sessão.';

  const topPontosFracos = temas.slice(0, 5);
  const melhoresTemas = [...temas].sort((a, b) => b.acerto - a.acerto).slice(0, 3);
  const sessoesRecentes = [...state.sessions]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 6);

  const pfHtml = topPontosFracos.length
    ? topPontosFracos.map(t => `
      <div class="topic-row">
        <div>
          <div class="topic-title">${escapeHtml(t.tema)}</div>
          <div class="topic-sub">${escapeHtml(getAreaName(t.area))}</div>
        </div>
        <div class="topic-metric ${t.acerto >= 70 ? 'ok' : t.acerto >= 50 ? 'mid' : 'bad'}">${t.acerto}%</div>
      </div>
    `).join('')
    : `<div class="empty-box">Nenhum dado suficiente ainda.</div>`;

  const fortesHtml = melhoresTemas.length
    ? melhoresTemas.map(t => `
      <div class="topic-row">
        <div>
          <div class="topic-title">${escapeHtml(t.tema)}</div>
          <div class="topic-sub">${escapeHtml(getAreaName(t.area))}</div>
        </div>
        <div class="topic-metric ok">${t.acerto}%</div>
      </div>
    `).join('')
    : `<div class="empty-box">Sem temas fortes definidos ainda.</div>`;

  const areasHtml = areaStats.length
    ? areaStats.map(a => `
      <div class="area-row">
        <div class="area-head">
          <span>${escapeHtml(a.name)}</span>
          <strong>${a.pct}%</strong>
        </div>
        <div class="bar"><div class="fill" style="width:${Math.max(6, a.pct)}%; background:${escapeHtml(a.color || '#7c5cfc')}"></div></div>
        <div class="area-sub">${a.total} questões • ${a.correct} acertos</div>
      </div>
    `).join('')
    : `<div class="empty-box">As áreas aparecem aqui quando você começa a registrar sessões.</div>`;

  const recentesHtml = sessoesRecentes.length
    ? sessoesRecentes.map(s => `
      <tr>
        <td>${escapeHtml(s.date || '—')}</td>
        <td>${escapeHtml(getAreaName(s.area))}</td>
        <td>${escapeHtml(s.topic || 'Sem tópico')}</td>
        <td>${Number(s.total || 0)}</td>
        <td>${Number(s.correct || 0)}</td>
        <td>${s.total ? Math.round((s.correct / s.total) * 100) : 0}%</td>
      </tr>
    `).join('')
    : `<tr><td colspan="6">Nenhuma sessão registrada ainda.</td></tr>`;

  const w = window.open('', '_blank');
  if (!w) return;

  w.document.write(`<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Relatório de Diagnóstico Cognitivo</title>
    <style>
      *{box-sizing:border-box}
      body{
        margin:0;
        font-family:Inter,Arial,sans-serif;
        background:#f4f5fb;
        color:#151826;
        line-height:1.5;
      }
      .page{
        max-width:920px;
        margin:0 auto;
        padding:28px;
      }
      .hero{
        background:linear-gradient(135deg,#171332 0%, #25205a 100%);
        color:#fff;
        border-radius:24px;
        padding:26px 28px;
        box-shadow:0 16px 40px rgba(22,19,50,.18);
      }
      .eyebrow{
        font-size:11px;
        letter-spacing:.16em;
        text-transform:uppercase;
        opacity:.72;
        margin-bottom:8px;
      }
      h1{
        margin:0 0 8px;
        font-size:30px;
        line-height:1.1;
      }
      .hero-sub{
        margin:0;
        color:rgba(255,255,255,.78);
        max-width:640px;
        font-size:14px;
      }
      .hero-meta{
        margin-top:18px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:14px;
        flex-wrap:wrap;
      }
      .hero-badges{
        display:flex;
        gap:10px;
        flex-wrap:wrap;
      }
      .pill{
        border:1px solid rgba(255,255,255,.14);
        background:rgba(255,255,255,.08);
        color:#fff;
        border-radius:999px;
        padding:8px 12px;
        font-size:12px;
        font-weight:700;
      }
      .grid{
        display:grid;
        gap:16px;
        margin-top:18px;
      }
      .grid-4{ grid-template-columns:repeat(4,1fr); }
      .grid-2{ grid-template-columns:repeat(2,1fr); }
      .card{
        background:#fff;
        border:1px solid #e6e8f2;
        border-radius:20px;
        padding:18px;
        box-shadow:0 8px 22px rgba(30,27,75,.05);
      }
      .kpi-label{
        font-size:11px;
        text-transform:uppercase;
        letter-spacing:.12em;
        color:#6f7590;
        margin-bottom:8px;
      }
      .kpi-value{
        font-size:30px;
        font-weight:800;
        color:#221d4e;
        line-height:1;
      }
      .kpi-sub{
        margin-top:8px;
        color:#666d87;
        font-size:12px;
      }
      .section-title{
        margin:0 0 10px;
        font-size:13px;
        text-transform:uppercase;
        letter-spacing:.14em;
        color:#656b86;
      }
      .highlight{
        background:linear-gradient(180deg,#f8f7ff 0%, #f2f0ff 100%);
        border:1px solid #e4dfff;
      }
      .big-text{
        font-size:17px;
        font-weight:700;
        color:#261f57;
        margin-bottom:6px;
      }
      .muted{
        color:#666d87;
        font-size:13px;
      }
      .topic-row{
        display:flex;
        justify-content:space-between;
        gap:12px;
        align-items:center;
        padding:12px 0;
        border-top:1px solid #eef0f6;
      }
      .topic-row:first-child{ border-top:none; padding-top:0; }
      .topic-title{
        font-weight:700;
        color:#1d2140;
      }
      .topic-sub{
        font-size:12px;
        color:#7c829d;
        margin-top:2px;
      }
      .topic-metric{
        min-width:58px;
        text-align:right;
        font-weight:800;
      }
      .topic-metric.ok{ color:#12805c; }
      .topic-metric.mid{ color:#b06b00; }
      .topic-metric.bad{ color:#c23b3b; }
      .area-row{
        margin-bottom:14px;
      }
      .area-head{
        display:flex;
        justify-content:space-between;
        gap:12px;
        font-size:14px;
        font-weight:700;
        margin-bottom:6px;
        color:#1d2140;
      }
      .area-sub{
        margin-top:6px;
        color:#7c829d;
        font-size:12px;
      }
      .bar{
        height:10px;
        background:#eef0f6;
        border-radius:999px;
        overflow:hidden;
      }
      .fill{
        height:100%;
        border-radius:999px;
      }
      table{
        width:100%;
        border-collapse:collapse;
        font-size:12px;
      }
      th, td{
        padding:10px 8px;
        border-bottom:1px solid #eef0f6;
        text-align:left;
      }
      th{
        color:#656b86;
        font-size:11px;
        text-transform:uppercase;
        letter-spacing:.08em;
      }
      .footer{
        margin-top:20px;
        text-align:center;
        font-size:11px;
        color:#868ca5;
      }
      .empty-box{
        padding:14px;
        border-radius:14px;
        background:#f7f8fc;
        color:#727994;
        font-size:13px;
      }
      @media print{
        body{ background:#fff; }
        .page{ max-width:none; padding:0; }
        .hero, .card{ box-shadow:none; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <section class="hero">
        <div class="eyebrow">Fissão de Conhecimento • ENEM</div>
        <h1>Relatório de Diagnóstico Cognitivo</h1>
        <p class="hero-sub">Um retrato claro do seu momento atual, do que está funcionando e do custo de continuar estudando sem ajustar a rota.</p>
        <div class="hero-meta">
          <div class="hero-badges">
            <span class="pill">${escapeHtml(hoje)}</span>
            <span class="pill">Score ${escapeHtml(scoreNivel)}</span>
            <span class="pill">${state.sessions.length} sessões</span>
          </div>
          <div class="pill">${streak} dia(s) de sequência</div>
        </div>
      </section>

      <section class="grid grid-4">
        <div class="card">
          <div class="kpi-label">Acerto Geral</div>
          <div class="kpi-value">${pct}%</div>
          <div class="kpi-sub">${totalAcertos} acertos em ${totalQuestoes} questões</div>
        </div>
        <div class="card">
          <div class="kpi-label">Score</div>
          <div class="kpi-value">${score}</div>
          <div class="kpi-sub">Nível ${escapeHtml(scoreNivel)}</div>
        </div>
        <div class="card">
          <div class="kpi-label">Revisões Pendentes</div>
          <div class="kpi-value">${pendentes}</div>
          <div class="kpi-sub">Anki pendente: ${ankiPendentes}</div>
        </div>
        <div class="card">
          <div class="kpi-label">Constância</div>
          <div class="kpi-value">${streak}</div>
          <div class="kpi-sub">${streak === 1 ? 'dia seguido' : 'dias seguidos'}</div>
        </div>
      </section>

      <section class="grid grid-2">
        <div class="card highlight">
          <div class="section-title">Leitura do Sistema</div>
          <div class="big-text">${escapeHtml(leitura)}</div>
          <div class="muted">O ponto central não é estudar mais por impulso, e sim corrigir a parte que mais trava sua evolução.</div>
        </div>
        <div class="card highlight">
          <div class="section-title">Próximo Passo Recomendado</div>
          <div class="big-text">${escapeHtml(proximoPasso)}</div>
          <div class="muted">${escapeHtml(projecao)}</div>
        </div>
      </section>

      <section class="grid grid-2">
        <div class="card">
          <div class="section-title">Pontos Fracos Prioritários</div>
          ${pfHtml}
        </div>
        <div class="card">
          <div class="section-title">Temas Mais Fortes</div>
          ${fortesHtml}
        </div>
      </section>

      <section class="card" style="margin-top:18px">
        <div class="section-title">Desempenho por Área</div>
        ${areasHtml}
      </section>

      <section class="card" style="margin-top:18px">
        <div class="section-title">Sessões Recentes</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Área</th>
              <th>Tópico</th>
              <th>Total</th>
              <th>Acertos</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            ${recentesHtml}
          </tbody>
        </table>
      </section>

      <div class="footer">Fissão de Conhecimento • Relatório automático gerado em ${escapeHtml(hoje)}</div>
    </div>
  </body>
  </html>`);

  w.document.close();
  w.print();
}

export function cronStart(){if(_cr)return;_cr=true;_ci=setInterval(()=>{_cs++;const m=String(Math.floor(_cs/60)).padStart(2,'0'),s=String(_cs%60).padStart(2,'0');const el=document.getElementById('cronDisplay');if(el)el.textContent=`${m}:${s}`;},1000);}
export function cronStop(){_cr=false;clearInterval(_ci);}
export function cronReset(){cronStop();_cs=0;const el=document.getElementById('cronDisplay');if(el)el.textContent='00:00';}
