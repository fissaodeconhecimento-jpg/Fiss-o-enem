// ═══════════════════════════════════════════════════════════
// dom.js — Modal, overlay e orquestrador de renderização.
// renderAll() chama todos os renders de seção via subscribers.
// ═══════════════════════════════════════════════════════════
 
import { AREAS, TIPOS_ERRO, TEMAS_REDACAO } from './constants.js';
import { todayISO } from './utils.js';
import { renderNavBadges, renderRevBanner }     from './navigation.js';
import { renderFoco, renderKPIs, renderAlertas,
         renderPontosFracos, renderWeekChart,
         renderHeatmap, renderCalendar,
         renderStreak }                          from './dashboard.js';
import { renderSessions }                        from './sessions.js';
import { renderRevisions }                       from './revisoes.js';
import { renderDiagnostico, renderAreaKPIs,
         renderAreaEvolution, renderGraficoEvolucao } from './diagnostico.js';
import { renderIncidencia }                      from './enem.js';
import { renderSimulado }                        from './simulado.js';
import { renderAnki, renderAnkiDash }            from './anki.js';
import { renderCaderno, renderConceitos }        from './erros.js';
import { renderRedacao }                         from './redacao.js';
import { decidirProximoPasso }                   from './decision.js';
import { getState }                              from './state.js';
 
// Orquestra todos os renders — cada um isola seu próprio erro.
// renderAll() sempre atualiza badges e KPIs (globais).
// Renders pesados (heatmap, simulado, incidência) só rodam
// se a seção correspondente estiver visível — economiza CPU em mobile.
export function renderAll() {
  const _r = (fn, name) => {
    try { fn(); } catch (e) { console.error(`[DOM] ${name}:`, e); }
  };
 
  // Sempre renderiza — são leves e globais
  _r(renderNavBadges,     'renderNavBadges');
  _r(renderRevBanner,     'renderRevBanner');
  _r(renderFoco,          'renderFoco');
  _r(renderKPIs,          'renderKPIs');
  _r(renderStreak,        'renderStreak');
  _r(renderAlertas,       'renderAlertas');
  _r(renderPontosFracos,  'renderPontosFracos');
  _r(renderCalendar,      'renderCalendar');
  _r(renderSessions,      'renderSessions');
  _r(renderRevisions,     'renderRevisions');
 
  // Só renderiza se a seção estiver visível (evita lag em mobile)
  const secaoAtiva = (id) =>
    document.getElementById(`sec-${id}`)?.classList.contains('active');
 
  if (secaoAtiva('diagnostico') || secaoAtiva('areas')) {
    _r(renderDiagnostico,       'renderDiagnostico');
    _r(renderAreaKPIs,          'renderAreaKPIs');
    _r(renderAreaEvolution,     'renderAreaEvolution');
    _r(renderGraficoEvolucao,   'renderGraficoEvolucao');
  }

  if (secaoAtiva('dashboard') || secaoAtiva('diagnostico') || secaoAtiva('areas')) {
    _r(renderWeekChart, 'renderWeekChart');
    _r(renderHeatmap,   'renderHeatmap');
  }
 
  if (secaoAtiva('enem')) {
    _r(renderIncidencia, 'renderIncidencia');
  }
 
  if (secaoAtiva('simulado')) {
    _r(renderSimulado, 'renderSimulado');
  }
 
  if (secaoAtiva('anki') || secaoAtiva('dashboard')) {
    _r(renderAnki,     'renderAnki');
    _r(renderAnkiDash, 'renderAnkiDash');
  }
 
  if (secaoAtiva('erros')) {
    _r(renderCaderno,   'renderCaderno');
    _r(renderConceitos, 'renderConceitos');
  }
 
  if (secaoAtiva('redacao')) {
    _r(renderRedacao, 'renderRedacao');
  }
}
 
export async function openModal(type, data = null) {
  const el = document.getElementById('modalContent');
  const overlay = document.getElementById('modalOverlay');
 
  if (!el || !overlay) {
    console.warn('[Fissão] openModal: modal elements not found');
    return;
  }
 
  overlay.classList.add('open');
 
  if (type === 'session') {
    let prefill = null;
 
    if (data?.smart) {
      // Mostra loading enquanto busca sugestão da IA
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:14px">
          <div style="width:32px;height:32px;border:3px solid var(--border2);border-top-color:var(--ind);border-radius:50%;animation:spin .7s linear infinite"></div>
          <div style="color:var(--muted2);font-size:13px">Analisando seu desempenho...</div>
        </div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      `;
      try {
        const { getFocoSugerido } = await import('./sessions.js');
        prefill = await getFocoSugerido();
      } catch (e) {
        console.warn('[Fissão] Prefill inteligente falhou:', e);
      }
    } else if (data && !data.smart) {
      prefill = data;
    }
 
    const hintSmart = prefill?.origem
      ? `
        <div class="form-hint" style="margin-bottom:12px;">
          ⚛️ <strong>${prefill.titulo || 'Sugestão automática'}</strong><br>
          ${prefill.descricao || 'O sistema preencheu este estudo com base no seu desempenho recente.'}
          ${prefill.total ? `<br>• Questões sugeridas: <strong>${prefill.total}</strong>` : ''}
          ${prefill.tempo ? `<br>• Tempo estimado: <strong>${prefill.tempo} min</strong>` : ''}
        </div>
      `
      : '';
 
    const correctPlaceholder = prefill?.total
      ? Math.max(1, Math.round(prefill.total * 0.7))
      : 14;
 
    el.innerHTML = `
      <h3>⚗️ Registrar sessão de estudo</h3>
      <p style="margin:-6px 0 14px;color:var(--muted2);font-size:13px;line-height:1.5">
        Registre o que você estudou hoje para atualizar seu diagnóstico, criar revisões automáticas e acompanhar sua evolução.
      </p>
 
      ${hintSmart}
 
      <div class="form-section-title">Obrigatório</div>
 
      <div class="fr">
        <div class="fg">
          <label>Área</label>
          <select id="f-area">
            ${AREAS.map(a => `
              <option value="${a.id}" ${prefill?.area === a.id ? 'selected' : ''}>
                ${a.name}
              </option>
            `).join('')}
          </select>
        </div>
 
        <div class="fg">
          <label>Data</label>
          <input id="f-date" type="date" value="${todayISO()}"/>
        </div>
      </div>
 
      <div class="fg">
        <label>Tópico / Assunto</label>
        <input
          id="f-topic"
          value="${prefill?.topic || ''}"
          placeholder="Ex: Genética Mendeliana"
        />
      </div>
 
      <div class="fr">
        <div class="fg">
          <label>Questões feitas</label>
          <input
            id="f-total"
            type="number"
            min="1"
            placeholder="20"
            value="${prefill?.total || ''}"
          />
        </div>
 
        <div class="fg">
          <label>Questões corretas</label>
          <input
            id="f-correct"
            type="number"
            min="0"
            placeholder="${correctPlaceholder}"
          />
        </div>
      </div>
 
      <div id="liveFeedback" class="form-hint" style="display:none;"></div>
 
      <div class="form-section-title" style="margin-top:12px">Opcional</div>
 
      <div class="fr">
        <div class="fg">
          <label>Tempo total (min)</label>
          <input
            id="f-tempo"
            type="number"
            min="1"
            placeholder="40"
            value="${prefill?.tempo || ''}"
          />
        </div>
 
        <div class="fg">
          <label>Tipo de erro principal</label>
          <select id="f-erro">
            <option value="">— não registrar —</option>
            ${TIPOS_ERRO.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
      </div>
 
      <div class="form-hint">
        ⚛️ Se houver erros, revisões espaçadas serão criadas automaticamente para +1, +7 e +30 dias.
      </div>
 
      <div class="modal-actions">
        <button class="btn-c" onclick="closeModal()">Cancelar</button>
        <button class="btn-p" onclick="saveSession()">Registrar sessão</button>
      </div>
    `;
 
    setTimeout(() => {
      const totalEl = document.getElementById('f-total');
      const correctEl = document.getElementById('f-correct');
      const feedbackEl = document.getElementById('liveFeedback');
 
      if (correctEl) correctEl.focus();
      if (!totalEl || !correctEl || !feedbackEl) return;
 
      function updateFeedback() {
        const total = parseInt(totalEl.value);
        const correct = parseInt(correctEl.value);
 
        if (!total || isNaN(total) || isNaN(correct)) {
          feedbackEl.style.display = 'none';
          feedbackEl.innerHTML = '';
          return;
        }
 
        if (correct < 0 || correct > total) {
          feedbackEl.style.display = 'block';
          feedbackEl.style.color = 'var(--danger)';
          feedbackEl.style.background = 'var(--danger-bg)';
          feedbackEl.style.border = '1px solid var(--danger-br)';
          feedbackEl.innerHTML = '⚠️ Valor inválido. As questões corretas devem ficar entre 0 e o total de questões.';
          return;
        }
 
        const pct = (correct / total) * 100;
 
        let text = '';
        let color = '';
        let bg = '';
        let border = '';
 
        if (pct < 50) {
          text = '⚠️ Baixa retenção. Este tópico precisa de revisão antes de avançar.';
          color = 'var(--danger)';
          bg = 'var(--danger-bg)';
          border = 'var(--danger-br)';
        } else if (pct < 70) {
          text = '🟡 Desempenho intermediário. Vale consolidar antes de mudar de tópico.';
          color = 'var(--amb)';
          bg = 'var(--amb-bg)';
          border = 'var(--amb-br)';
        } else {
          text = '✅ Bom desempenho. Você pode avançar ou aumentar a dificuldade.';
          color = 'var(--ok)';
          bg = 'var(--ok-bg)';
          border = 'var(--ok-br)';
        }
 
        feedbackEl.style.display = 'block';
        feedbackEl.style.color = color;
        feedbackEl.style.background = bg;
        feedbackEl.style.border = `1px solid ${border}`;
        feedbackEl.innerHTML = text;
      }
 
      totalEl.addEventListener('input', updateFeedback);
      correctEl.addEventListener('input', updateFeedback);
 
      updateFeedback();
    }, 80);
  }
 
  else if (type === 'sessionSummary' && data) {
    const pct = Math.round((data.correct / data.total) * 100);
    const state = getState();
    const decisao = decidirProximoPasso(state);
 
    let status = '';
    let statusClass = '';
    let guidance = '';
    let action = '';
    let primaryBtnLabel = '';
    let primaryBtnAction = '';
 
    if (decisao?.tipo === 'revisao') {
      status = 'Revisão pendente detectada';
      statusClass = 'var(--amb)';
      guidance = 'Antes de seguir em frente, o sistema identificou uma revisão atrasada como prioridade.';
      action = 'Faça a revisão pendente agora para manter o ciclo de retenção.';
      primaryBtnLabel = 'Fazer revisão agora';
      primaryBtnAction = `go('revisoes', document.querySelector('[onclick*=revisoes]')); closeModal();`;
    }
    else if (pct < 50) {
      status = 'Baixa retenção';
      statusClass = 'var(--danger)';
      guidance = 'Você não consolidou este conteúdo. Avançar agora aumenta a chance de repetir erro.';
      action = 'Revise este tópico hoje e registre pelo menos 1 erro no caderno.';
      primaryBtnLabel = 'Registrar erro agora';
      primaryBtnAction = `openModal('erroPrefill', ${JSON.stringify({
        area: data.area,
        tema: data.topic
      }).replace(/"/g, '&quot;')})`;
    }
    else if (pct < 70) {
      status = 'Retenção parcial';
      statusClass = 'var(--amb)';
      guidance = 'Você tem alguma base, mas ainda com inconsistências.';
      action = 'Faça uma sessão curta de reforço antes de mudar de tópico.';
      primaryBtnLabel = 'Reforçar este tópico';
      primaryBtnAction = `openModal('session', ${JSON.stringify({
        area: data.area,
        topic: data.topic,
        total: 8,
        tempo: 20
      }).replace(/"/g, '&quot;')})`;
    }
    else {
      status = pct < 85 ? 'Bom desempenho' : 'Domínio consolidado';
      statusClass = 'var(--ok)';
      guidance = pct < 85
        ? 'Você já tem domínio funcional deste conteúdo.'
        : 'Esse conteúdo está sólido.';
      action = decisao?.tipo === 'sequencia'
        ? `Avance para o próximo tópico sugerido: ${decisao.topic}.`
        : 'Continue no estudo sugerido pelo sistema.';
      primaryBtnLabel = 'Continuar estudo sugerido';
      primaryBtnAction = `openModal('session', { smart: true })`;
    }
 
    const tempoInfo = data.tempo
      ? `<div class="summary-line"><span>Tempo total</span><strong>${data.tempo} min</strong></div>`
      : '';
 
    const erroInfo = data.tipoErro
      ? `<div class="summary-line"><span>Erro principal</span><strong>${data.tipoErro}</strong></div>`
      : '';
 
    el.innerHTML = `
      <h3>✅ Sessão registrada</h3>
      <p style="margin:-6px 0 14px;color:var(--muted2);font-size:13px;line-height:1.5">
        Seu desempenho foi salvo e o painel já foi atualizado.
      </p>
 
      <div class="session-summary-card">
        <div class="summary-head">
          <div>
            <div class="summary-area">${data.areaLabel}</div>
            <div class="summary-topic">${data.topic}</div>
          </div>
          <div class="summary-pct" style="color:${statusClass}">${pct}%</div>
        </div>
 
        <div class="summary-grid">
          <div class="summary-line"><span>Questões feitas</span><strong>${data.total}</strong></div>
          <div class="summary-line"><span>Questões corretas</span><strong>${data.correct}</strong></div>
          ${tempoInfo}
          ${erroInfo}
        </div>
      </div>
 
      <div class="form-hint" style="border-left-color:${statusClass}">
        <strong style="display:block;margin-bottom:6px;color:${statusClass}">${status}</strong>
        ${guidance}
        <br><br>
        <strong>Próxima ação:</strong> ${action}
      </div>
 
      <div class="modal-actions">
        <button class="btn-c" onclick="closeModal()">Fechar</button>
        <button class="btn-p" onclick="${primaryBtnAction}">${primaryBtnLabel}</button>
      </div>
    `;
  }
 
  else if (type === 'erroPrefill') {
    el.innerHTML = `<h3>📓 Registrar Erro no Caderno</h3>
      <div class="fr">
        <div class="fg">
          <label>Área</label>
          <select id="f-area">
            ${AREAS.map(a => `<option value="${a.id}" ${data?.area === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="fg">
          <label>Data</label>
          <input id="f-date" type="date" value="${todayISO()}"/>
        </div>
      </div>
      <div class="fg"><label>Tema / Assunto</label><input id="f-tema" value="${data?.tema || ''}" placeholder="Ex: Mitose vs Meiose"/></div>
      <div class="fg"><label>Questão (resumo) <span style="color:var(--muted)">(opcional)</span></label><textarea id="f-questao" placeholder="Descreva brevemente o enunciado da questão..."></textarea></div>
      <div class="fg"><label>Meu raciocínio (o que eu pensei de errado)</label><textarea id="f-raciocinio" placeholder="Explique onde errou o raciocínio..."></textarea></div>
      <div class="fg"><label>Resposta correta / explicação</label><textarea id="f-resposta" placeholder="Qual é a resposta correta e por quê..."></textarea></div>
      <div class="fr"><div class="fg"><label>Tipo de Erro</label><select id="f-tipo">${TIPOS_ERRO.map(t=>`<option value="${t}">${t}</option>`).join('')}</select></div><div class="fg"><label>Conceito-chave <span style="color:var(--muted)">(para biblioteca)</span></label><input id="f-conceito" placeholder="Ex: Transporte de membrana"/></div></div>
      <div class="form-hint">🃏 Um cartão de Recuperação Ativa será criado automaticamente para este erro!</div>
      <div class="modal-actions"><button class="btn-c" onclick="closeModal()">Cancelar</button><button class="btn-p" onclick="saveErro()">Registrar no Caderno</button></div>`;
  }
 
  else if (type === 'erro') {
    el.innerHTML = `<h3>📓 Registrar Erro no Caderno</h3>
      <div class="fr"><div class="fg"><label>Área</label><select id="f-area">${AREAS.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select></div><div class="fg"><label>Data</label><input id="f-date" type="date" value="${todayISO()}"/></div></div>
      <div class="fg"><label>Tema / Assunto</label><input id="f-tema" placeholder="Ex: Mitose vs Meiose"/></div>
      <div class="fg"><label>Questão (resumo) <span style="color:var(--muted)">(opcional)</span></label><textarea id="f-questao" placeholder="Descreva brevemente o enunciado da questão..."></textarea></div>
      <div class="fg"><label>Meu raciocínio (o que eu pensei de errado)</label><textarea id="f-raciocinio" placeholder="Explique onde errou o raciocínio..."></textarea></div>
      <div class="fg"><label>Resposta correta / explicação</label><textarea id="f-resposta" placeholder="Qual é a resposta correta e por quê..."></textarea></div>
      <div class="fr"><div class="fg"><label>Tipo de Erro</label><select id="f-tipo">${TIPOS_ERRO.map(t=>`<option value="${t}">${t}</option>`).join('')}</select></div><div class="fg"><label>Conceito-chave <span style="color:var(--muted)">(para biblioteca)</span></label><input id="f-conceito" placeholder="Ex: Transporte de membrana"/></div></div>
      <div class="form-hint">🃏 Um cartão de Recuperação Ativa será criado automaticamente para este erro!</div>
      <div class="modal-actions"><button class="btn-c" onclick="closeModal()">Cancelar</button><button class="btn-p" onclick="saveErro()">Registrar no Caderno</button></div>`;
  }
 
  else if (type === 'anki') {
    el.innerHTML = `<h3>🃏 Novo Cartão de Recuperação Ativa</h3>
      <div class="fr"><div class="fg"><label>Área</label><select id="f-area">${AREAS.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select></div><div class="fg"><label>Tema</label><input id="f-tema" placeholder="Ex: Genética"/></div></div>
      <div class="fg"><label>Pergunta / Frente do Cartão</label><textarea id="f-pergunta" placeholder="Qual é a diferença entre mitose e meiose?"></textarea></div>
      <div class="fg"><label>Resposta + Explicação / Verso do Cartão</label><textarea id="f-resposta" placeholder="Mitose: divisão somática (2 células iguais)&#10;Meiose: divisão reprodutiva (4 células c/ metade dos cromossomos)&#10;&#10;💡 Lembre: Meiose = 2 divisões = reprodução"></textarea></div>
      <div class="fg"><label>Dificuldade inicial</label><select id="f-dif"><option value="facil">Fácil</option><option value="media" selected>Média</option><option value="dificil">Difícil</option></select></div>
      <div class="modal-actions"><button class="btn-c" onclick="closeModal()">Cancelar</button><button class="btn-p" onclick="saveAnki()">Criar Cartão</button></div>`;
  }
 
  else if (type === 'revision') {
    el.innerHTML = `<h3>🔄 Agendar Revisão Manual</h3>
      <div class="fg"><label>Assunto</label><input id="f-subject" placeholder="Ex: Genética mendeliana"/></div>
      <div class="fr"><div class="fg"><label>Área</label><select id="f-area">${AREAS.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select></div><div class="fg"><label>Data</label><input id="f-date" type="date" value="${todayISO()}"/></div></div>
      <div class="modal-actions"><button class="btn-c" onclick="closeModal()">Cancelar</button><button class="btn-p" onclick="saveRevision()">Agendar</button></div>`;
  }
 
  else if (type === 'repertorio') {
    el.innerHTML = `<h3>📚 Novo Repertório Sociocultural</h3>
      <p style="margin:-6px 0 14px;color:var(--muted2);font-size:13px;line-height:1.55">
        Não salve qualquer citação solta. Salve só o que você realmente consegue transformar em argumento.
      </p>
      <div class="form-hint">
        Estrutura simples: <strong>fonte</strong> → <strong>ideia central</strong> → <strong>como isso prova sua tese</strong>.
      </div>
      <div class="redacao-modal-templates">
        <button class="redacao-template-btn" onclick="document.getElementById('rAutor').value='Byung-Chul Han';document.getElementById('rObra').value='Sociedade do Cansaço';document.getElementById('rTema').value='saude-mental';document.getElementById('rResumo').value='A cobrança por desempenho constante produz exaustão, ansiedade e enfraquecimento dos vínculos sociais.';document.getElementById('rUso').value='Use para discutir pressão social, produtividade tóxica e adoecimento psíquico.';document.getElementById('rPalavras').value='saúde mental, produtividade, pressão social';">Exemplo pronto</button>
        <button class="redacao-template-btn" onclick="document.getElementById('rResumo').value='';document.getElementById('rUso').value='';document.getElementById('rPalavras').value='';">Limpar exemplo</button>
      </div>
      <div class="fr">
        <div class="fg"><label>Autor / Fonte <span style="color:var(--danger)">*</span></label><input id="rAutor" placeholder="Ex: Djamila Ribeiro"/></div>
        <div class="fg"><label>Obra / Contexto</label><input id="rObra" placeholder="Ex: Pequeno Manual Antirracista"/></div>
      </div>
      <div class="fg"><label>Tema <span style="color:var(--danger)">*</span></label>
        <select id="rTema">
          <option value="">— selecione —</option>
          ${Object.entries(TEMAS_REDACAO).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label>Resumo / Ideia central <span style="color:var(--danger)">*</span></label>
        <textarea id="rResumo" rows="3" placeholder="Qual ideia desse repertório você quer aproveitar na redação?"></textarea>
      </div>
      <div class="fg"><label>Como usar na redação <span style="color:var(--muted)">(opcional, mas importante)</span></label>
        <textarea id="rUso" rows="2" placeholder="Ex: usar na introdução para contextualizar o problema ou no D1 para reforçar o argumento..."></textarea>
      </div>
      <div class="fg"><label>Palavras-chave <span style="color:var(--muted)">(separadas por vírgula)</span></label>
        <input id="rPalavras" placeholder="Ex: cidadania, exclusão, políticas públicas"/>
      </div>
      <div class="modal-actions">
        <button class="btn-c" onclick="closeModal()">Cancelar</button>
        <button class="btn-p" onclick="saveRepertorio()">Salvar Repertório</button>
      </div>`;
    setTimeout(() => {
      const f = document.getElementById('rAutor');
      if (f) f.focus();
    }, 80);
  }
 
  else if (type === 'ideia') {
    el.innerHTML = `<h3>💡 Nova Ideia / Tese / Argumento</h3>
      <p style="margin:-6px 0 14px;color:var(--muted2);font-size:13px;line-height:1.55">
        Aqui é onde o seu estudo deixa de ser passivo. Uma boa ideia encurta muito o tempo de planejamento da redação.
      </p>
      <div class="form-hint">
        Regra prática: uma tese boa já aponta <strong>causa</strong>, <strong>efeito</strong> ou <strong>falha estrutural</strong>.
      </div>
      <div class="redacao-modal-templates">
        <button class="redacao-template-btn" onclick="document.getElementById('iaTipo').value='tese';document.getElementById('iaTema').value='educacao';document.getElementById('iaTexto').value='A desigualdade educacional brasileira persiste porque o acesso à escola não garante aprendizagem de qualidade, sobretudo nas regiões periféricas.';">Modelo de tese</button>
        <button class="redacao-template-btn" onclick="document.getElementById('iaTipo').value='argumento';document.getElementById('iaTexto').value='A ausência de políticas públicas eficazes amplia o problema, pois transfere ao indivíduo uma responsabilidade que deveria ser coletiva.';">Modelo de argumento</button>
      </div>
      <div class="fr">
        <div class="fg"><label>Tipo <span style="color:var(--danger)">*</span></label>
          <select id="iaTipo">
            <option value="tese">Tese central</option>
            <option value="argumento">Argumento</option>
            <option value="dado">Dado / estatística</option>
            <option value="frase">Frase de efeito</option>
          </select>
        </div>
        <div class="fg"><label>Tema</label>
          <select id="iaTema">
            <option value="">— geral —</option>
            ${Object.entries(TEMAS_REDACAO).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="fg"><label>Texto <span style="color:var(--danger)">*</span></label>
        <textarea id="iaTexto" rows="4" placeholder="Escreva sua tese, argumento ou frase aqui..."></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-c" onclick="closeModal()">Cancelar</button>
        <button class="btn-p" onclick="saveIdeia()">Salvar Ideia</button>
      </div>`;
    setTimeout(() => {
      const f = document.getElementById('iaTexto');
      if (f) f.focus();
    }, 80);
  }
}
 
export function closeModal() {
  const _ov = document.getElementById('modalOverlay');
  if (_ov) _ov.classList.remove('open');
}
 
export function handleOverlay(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}