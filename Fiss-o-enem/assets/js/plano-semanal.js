// ═══════════════════════════════════════════════════════════
// plano-semanal.js — Plano de estudos semanal por motor local.
//
// Gera agenda personalizada para os próximos 7 dias
// analisando dados reais do aluno — sem API, sem custo.
// ═══════════════════════════════════════════════════════════
 
import { getState }           from './state.js';
import { todayISO }           from './utils.js';
import { calcDesempenhoTema } from './diagnostico.js';
import { cartoesPendentes }   from './anki.js';
 
const PLANO_KEY = 'fissao_plano_semanal_v1';
 
// ─── Dicas por tipo de dia ────────────────────────────────
 
const DICAS = {
  revisao: [
    'Releia suas anotações antes de começar as questões.',
    'Foque em entender o padrão do erro, não só a resposta certa.',
    'Use o caderno de erros para registrar o que ainda confunde.',
  ],
  estudo: [
    'Faça as questões em blocos de 5 e analise cada erro antes de continuar.',
    'Anote o conceito-chave de cada erro para criar um cartão Anki.',
    'Priorize questões do ENEM dos últimos 3 anos nesse tema.',
    'Se errar mais de 40%, releia o conceito antes de continuar.',
    'Cronometre: máximo 3 minutos por questão do ENEM.',
  ],
  simulado: [
    'Simule condições reais: sem pausas, sem consulta.',
    'Resolva por área, começando pela que tem mais confiança.',
    'Após o simulado, anote o tema de cada erro no caderno.',
  ],
};
 
const RESUMOS = [
  'Semana focada nos seus pontos fracos — cada questão conta.',
  'Consistência esta semana vai fazer diferença no resultado final.',
  'Plano calibrado para o seu desempenho atual. Vai nessa!',
  'Foco nos temas que mais caem no ENEM e onde você mais perde pontos.',
  'Uma semana bem executada já muda seu score significativamente.',
];
 
const TEMAS_PADRAO = [
  { tema: 'Funções (1º e 2º grau)',      area: 'mat', questoes: 15, tempo: 40 },
  { tema: 'Interpretação de Texto',       area: 'lc',  questoes: 15, tempo: 35 },
  { tema: 'Ecologia e Biomas',            area: 'cn',  questoes: 15, tempo: 35 },
  { tema: 'Brasil República',             area: 'ch',  questoes: 12, tempo: 30 },
  { tema: 'Estrutura Dissertativa',       area: 'red', questoes: 1,  tempo: 60 },
  { tema: 'Probabilidade e Estatística',  area: 'mat', questoes: 12, tempo: 35 },
  { tema: 'Genética Mendeliana',          area: 'cn',  questoes: 12, tempo: 30 },
];
 
function dicaAleatoria(tipo) {
  const lista = DICAS[tipo] || DICAS.estudo;
  return lista[Math.floor(Math.random() * lista.length)];
}
 
// ─── Motor local de geração ───────────────────────────────
 
function gerarPlanoLocal() {
  const state   = getState();
  const hoje    = todayISO();
  const temas   = calcDesempenhoTema(state.sessions || []);
  const revPend = (state.revisions || []).filter(r => !r.done && r.date <= hoje);
 
  const fila = [];
 
  // 1. Revisões atrasadas primeiro (máx 2 dias)
  revPend.slice(0, 2).forEach(r => {
    fila.push({ tipo: 'revisao', tema: r.subject, area: r.area || 'cn', questoes: 10, tempo: 25 });
  });
 
  // 2. Pontos fracos com dados reais do aluno
  temas.slice(0, 5).forEach(t => {
    fila.push({
      tipo:     'estudo',
      tema:     t.tema,
      area:     t.area,
      questoes: t.acerto < 40 ? 20 : 15,
      tempo:    t.acerto < 40 ? 50 : 35,
    });
  });
 
  // 3. Completa com temas padrão se necessário
  TEMAS_PADRAO.forEach(t => {
    if (fila.length < 6) fila.push({ tipo: 'estudo', ...t });
  });
 
  // 4. Último dia sempre simulado
  fila[6] = { tipo: 'simulado', tema: 'Simulado misto ENEM', area: 'mat', questoes: 20, tempo: 60 };
 
  const nomes = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const dias  = [];
 
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const item = fila[i] || { tipo: 'estudo', ...TEMAS_PADRAO[i % TEMAS_PADRAO.length] };
 
    dias.push({
      data:     d.toISOString().split('T')[0],
      nome:     nomes[d.getDay()],
      tipo:     item.tipo,
      tema:     item.tema,
      area:     item.area,
      questoes: item.questoes,
      tempo:    item.tempo,
      dica:     dicaAleatoria(item.tipo),
    });
  }
 
  return {
    resumo: RESUMOS[Math.floor(Math.random() * RESUMOS.length)],
    dias,
  };
}
 
// ─── Cache ────────────────────────────────────────────────
 
function salvarPlanoCache(plano) {
  try {
    localStorage.setItem(PLANO_KEY, JSON.stringify({ plano, geradoEm: todayISO() }));
  } catch (e) {
    console.warn('[Plano] Erro ao salvar cache:', e);
  }
}
 
function carregarPlanoCache() {
  try {
    const raw = localStorage.getItem(PLANO_KEY);
    if (!raw) return null;
    const { plano, geradoEm } = JSON.parse(raw);
    const diff = (new Date(todayISO()) - new Date(geradoEm)) / 86400000;
    if (diff > 7) return null;
    return plano;
  } catch (e) {
    return null;
  }
}
 
// ─── Renderização ─────────────────────────────────────────
 
const AREA_CORES = {
  cn:  '#10d9a0',
  ch:  '#4f9ef8',
  lc:  '#c084fc',
  mat: '#f5c518',
  red: '#f472b6'
};
 
const TIPO_ICONS = { estudo: '📖', revisao: '🔄', simulado: '⚗️' };
 
function renderizarPlano(plano) {
  const el = document.getElementById('planoSemanalBody');
  if (!el) return;
 
  const hoje = todayISO();
 
  el.innerHTML = `
    <div style="background:var(--ind-bg);border:1px solid var(--ind-br);border-radius:var(--rsm);padding:10px 14px;margin-bottom:16px;font-size:13px;color:var(--ind-l);line-height:1.5">
      ⚛️ ${plano.resumo}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${plano.dias.map(dia => {
        const isHoje = dia.data === hoje;
        const isPast = dia.data < hoje;
        const cor    = AREA_CORES[dia.area] || 'var(--ind)';
        const icon   = TIPO_ICONS[dia.tipo] || '📖';
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:${isHoje ? 'var(--ind-bg)' : 'var(--surface2)'};border:1px solid ${isHoje ? 'var(--ind-br)' : 'var(--border)'};border-radius:var(--rsm);opacity:${isPast ? '.45' : '1'};transition:opacity .2s">
            <div style="min-width:44px;text-align:center">
              <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--muted2);text-transform:uppercase;letter-spacing:.08em">${dia.nome.substring(0,3).toUpperCase()}</div>
              <div style="font-size:18px;font-weight:800;color:${isHoje ? 'var(--ind-l)' : 'var(--tx)'};line-height:1.2">${dia.data.split('-')[2]}</div>
            </div>
            <div style="width:3px;height:40px;background:${cor};border-radius:99px;flex-shrink:0;opacity:.7"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--tx);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${icon} ${dia.tema}
                ${isHoje ? '<span style="font-size:9px;background:var(--ind);color:#fff;padding:2px 6px;border-radius:20px;margin-left:6px;font-weight:700">HOJE</span>' : ''}
              </div>
              <div style="font-size:11.5px;color:var(--muted2);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">💡 ${dia.dica}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${cor}">${dia.questoes}q</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--muted)">${dia.tempo}min</div>
            </div>
          </div>`;
      }).join('')}
    </div>
    <div style="margin-top:12px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--muted);text-align:right;letter-spacing:.06em">GERADO PELO ATOMINHO · ${new Date().toLocaleDateString('pt-BR')}</div>
  `;
}
 
// ─── Exportações ──────────────────────────────────────────
 
export function gerarPlanoSemanal(forcar = false) {
  const btn = document.getElementById('planoGerarBtn');
  const el  = document.getElementById('planoSemanalBody');
  if (!el) return;
 
  if (!forcar) {
    const cache = carregarPlanoCache();
    if (cache) { renderizarPlano(cache); return; }
  }
 
  if (btn) { btn.disabled = true; btn.textContent = '⚛️ Gerando...'; }
 
  try {
    const plano = gerarPlanoLocal();
    salvarPlanoCache(plano);
    renderizarPlano(plano);
  } catch (e) {
    console.error('[Plano] Erro ao gerar:', e);
    if (el) el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--danger);font-size:13px">⚠️ Não foi possível gerar o plano. Tente novamente.</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '↺ Regerar'; }
  }
}
 
export function inicializarPlanoSemanal() {
  const cache = carregarPlanoCache();
  if (cache) renderizarPlano(cache);
}