// ═══════════════════════════════════════════════════════════
// assistente.js — Atominho com motor de regras local.
//
// Sem API externa, sem custo. Analisa os dados reais do
// aluno e gera respostas personalizadas baseadas em regras.
// ═══════════════════════════════════════════════════════════
 
import { getState }           from './state.js';
import { AREAS }              from './constants.js';
import { scoreGeral, scoreLetter, todayISO } from './utils.js';
import { calcDesempenhoTema } from './diagnostico.js';
import { cartoesPendentes }   from './anki.js';
import { calcStreak }         from './dashboard.js';
 
let _enviando = false;
 
// ─── Coleta dados do aluno ────────────────────────────────
 
function coletarDados() {
  const state    = getState();
  const hoje     = todayISO();
  const sessions = state.sessions  || [];
  const revs     = state.revisions || [];
  const anki     = state.anki      || [];
 
  const totalQ = sessions.reduce((a, s) => a + s.total,   0);
  const totalC = sessions.reduce((a, s) => a + s.correct, 0);
  const pct    = totalQ ? Math.round(totalC / totalQ * 100) : null;
  const score  = scoreGeral(sessions);
  const nivel  = scoreLetter(score);
  const streak = calcStreak(sessions);
 
  const temas        = calcDesempenhoTema(sessions);
  const pontosFracos = temas.slice(0, 5);
  const melhorArea   = temas.length ? temas[temas.length - 1] : null;
  const revPend      = revs.filter(r => !r.done && r.date <= hoje);
  const ankiPend     = cartoesPendentes();
 
  const freqErros = {};
  (state.errosDiag || []).forEach(e => {
    freqErros[e.tipo] = (freqErros[e.tipo] || 0) + 1;
  });
  const tipoErroTop = Object.entries(freqErros).sort((a, b) => b[1] - a[1])[0];
 
  return {
    state, hoje, sessions, totalQ, totalC, pct, score, nivel, streak,
    temas, pontosFracos, melhorArea, revPend, ankiPend,
    freqErros, tipoErroTop,
  };
}
 
// ─── Motor de respostas ───────────────────────────────────
 
function gerarResposta(pergunta) {
  const d   = coletarDados();
  const p   = pergunta.toLowerCase().trim();
  const sem = d.sessions.length === 0;
 
  // Saudações
  if (/^(oi|olá|ola|hey|e aí|e ai|bom dia|boa tarde|boa noite|tudo bem|tudo bom)/.test(p)) {
    if (sem) return `Olá! 👋 Sou o **Atominho**, seu assistente de estudos.\n\nAinda não há sessões registradas. Comece registrando sua primeira sessão pelo botão **+ Registrar sessão** no topo da tela!`;
    return `Olá! 👋 Você tem **${d.sessions.length} sessão${d.sessions.length > 1 ? 'ões' : ''}** registrada${d.sessions.length > 1 ? 's' : ''} e ${d.streak} dia${d.streak !== 1 ? 's' : ''} de streak 🔥\n\nSeu acerto geral está em **${d.pct}%** (Nível ${d.nivel}). Como posso ajudar hoje?`;
  }
 
  // O que estudar hoje
  if (/estudar hoje|o que estudar|foco de hoje|começar hoje|por onde começ|próximo estudo/.test(p)) {
    if (sem) return `📚 Ainda não tenho dados seus para recomendar.\n\nRegistre pelo menos **3 sessões** e eu consigo identificar seus pontos fracos e sugerir o que priorizar.`;
    const linhas = [];
    if (d.revPend.length > 0) {
      linhas.push(`🔴 **Prioridade máxima:** você tem **${d.revPend.length} revisão${d.revPend.length > 1 ? 'ões' : ''} atrasada${d.revPend.length > 1 ? 's' : ''}**. Conclua antes de avançar.`);
    }
    if (d.ankiPend.length > 0) {
      linhas.push(`🃏 **Anki:** ${d.ankiPend.length} cartão${d.ankiPend.length > 1 ? 'ões' : ''} para revisar hoje. Leva menos de 10 minutos.`);
    }
    if (d.pontosFracos.length > 0) {
      const pior = d.pontosFracos[0];
      const area = AREAS.find(a => a.id === pior.area);
      linhas.push(`📖 **Estudo principal:** **${pior.tema}** (${area?.name || pior.area}) — acerto em ${pior.acerto}%. Faça pelo menos 15 questões focadas nesse tema.`);
    }
    if (!linhas.length) return `✅ Você está em dia! Sem revisões pendentes e sem pontos críticos.\n\nSugestão: avance para um tema novo ou aumente a dificuldade.`;
    return linhas.join('\n\n');
  }
 
  // Diagnóstico
  if (/diagnóstico|diagnos|desempenho|como estou|minha situação|meu progresso|meu score/.test(p)) {
    if (sem) return `📊 Sem sessões registradas, não consigo fazer um diagnóstico.\n\nRegistre algumas sessões com área, tópico e número de acertos.`;
    const linhas = [
      `📊 **Seu diagnóstico:**\n`,
      `- Acerto geral: **${d.pct}%** (Nível **${d.nivel}**)`,
      `- Questões feitas: **${d.totalQ}**`,
      `- Streak: **${d.streak} dia${d.streak !== 1 ? 's' : ''}** 🔥`,
      `- Revisões pendentes: **${d.revPend.length}**`,
      `- Anki pendente: **${d.ankiPend.length}**`,
    ];
    if (d.pontosFracos.length) {
      linhas.push(`\n🔴 **Pontos fracos:**`);
      d.pontosFracos.slice(0, 3).forEach(t => {
        const area = AREAS.find(a => a.id === t.area);
        linhas.push(`- ${t.tema} (${area?.name || t.area}): **${t.acerto}%**`);
      });
    }
    if (d.melhorArea) {
      const area = AREAS.find(a => a.id === d.melhorArea.area);
      linhas.push(`\n✅ **Melhor tema:** ${d.melhorArea.tema} (${area?.name || d.melhorArea.area}) — **${d.melhorArea.acerto}%**`);
    }
    const avaliacao = d.pct >= 70
      ? `\n💬 Bom desempenho! Foque em consolidar os pontos fracos.`
      : d.pct >= 50
      ? `\n💬 Desempenho intermediário. Revisar os erros com consistência vai fazer diferença.`
      : `\n💬 Ainda em construção — cada sessão registrada melhora seu diagnóstico!`;
    linhas.push(avaliacao);
    return linhas.join('\n');
  }
 
  // Erros
  if (/meus erros|tipo de erro|onde erro|por que erro|erro mais|erros frequentes/.test(p)) {
    if (!d.tipoErroTop) return `📓 Sem erros registrados ainda.\n\nQuando você registrar sessões com tipo de erro, consigo identificar seus padrões.`;
    const total  = Object.values(d.freqErros).reduce((a, v) => a + v, 0);
    const linhas = [`🧠 **Análise dos seus erros:**\n`];
    Object.entries(d.freqErros).sort((a, b) => b[1] - a[1]).forEach(([tipo, n]) => {
      const pct = Math.round(n / total * 100);
      linhas.push(`- **${tipo}**: ${pct}% (${n}x)`);
    });
    const dicas = {
      'Conteúdo':      'Revise o conteúdo base. Use o caderno de erros para anotar os conceitos.',
      'Interpretação': 'Leia o enunciado duas vezes antes de marcar. Sublinha palavras-chave.',
      'Atenção':       'Treine com simulados cronometrados para melhorar concentração.',
      'Cálculo':       'Pratique os algoritmos separadamente antes de aplicar nas questões.',
      'Estratégia':    'Aprenda a eliminar alternativas. Sempre há 2 pegadinhas óbvias no ENEM.',
    };
    if (d.tipoErroTop) linhas.push(`\n💡 **Dica para ${d.tipoErroTop[0]}:** ${dicas[d.tipoErroTop[0]] || 'Revise esse padrão de erro.'}`);
    return linhas.join('\n');
  }
 
  // Revisões
  if (/revisão|revisoes|revisar|pendente|atrasad/.test(p)) {
    if (!d.revPend.length) return `✅ Você está em dia com as revisões! Nenhuma pendente.\n\nRevisões são criadas automaticamente quando você registra erros (+1, +7 e +30 dias).`;
    const linhas = [`🔄 **${d.revPend.length} revisão${d.revPend.length > 1 ? 'ões' : ''} pendente${d.revPend.length > 1 ? 's' : ''}:**\n`];
    d.revPend.slice(0, 5).forEach(r => {
      const area  = AREAS.find(a => a.id === r.area);
      const atras = r.date < d.hoje;
      linhas.push(`- ${atras ? '⚠️' : '📅'} **${r.subject}** ${area ? `(${area.name})` : ''} ${atras ? '— atrasada' : `— ${r.date}`}`);
    });
    if (d.revPend.length > 5) linhas.push(`- ... e mais ${d.revPend.length - 5}`);
    linhas.push(`\n👉 Acesse a aba **Revisões** para concluí-las.`);
    return linhas.join('\n');
  }
 
  // Anki
  if (/anki|cartão|cartões|flashcard|recuperação ativa/.test(p)) {
    const total = d.state.anki?.length || 0;
    const pend  = d.ankiPend.length;
    const dom   = (d.state.anki || []).filter(c => c.nivel >= 4).length;
    if (!total) return `🃏 Você ainda não tem cartões Anki.\n\nEles são criados automaticamente quando você registra um erro.`;
    return `🃏 **Seu Anki:**\n\n- Total: **${total}** cartões\n- Pendentes hoje: **${pend}**\n- Dominados: **${dom}**\n\n${pend > 0 ? `👉 Acesse **Recuperação Ativa** e revise os ${pend} pendente${pend > 1 ? 's' : ''}.` : `✅ Em dia com o Anki!`}`;
  }
 
  // Streak / motivação
  if (/streak|sequência|dias seguidos|consistência|motivação/.test(p)) {
    if (d.streak === 0) return `🔥 Seu streak está zerado.\n\nRegistre qualquer sessão hoje e recomece! Consistência de 10 minutos por dia bate 3 horas uma vez por semana.`;
    if (d.streak < 7)   return `✨ **${d.streak} dia${d.streak > 1 ? 's' : ''} de streak!** Continue assim.\n\nMeta: chegar a 7 dias seguidos. Falta${7 - d.streak > 0 ? 'm ' + (7 - d.streak) : ''}!`;
    return `🔥 **${d.streak} dias seguidos!** Isso é dedicação real.\n\nVocê está entre os estudantes mais consistentes. Não quebra essa sequência!`;
  }
 
  // Redação
  if (/redação|redacao|dissertação|nota 1000|repertório|argumentação/.test(p)) {
    return `✍️ **Estrutura da redação nota 1000:**\n\n**1. Introdução** — repertório + tese\n**2. Desenvolvimento I** — argumento + exemplo concreto\n**3. Desenvolvimento II** — argumento + dados/estatísticas\n**4. Conclusão** — retome a tese + proposta completa:\n_Agente → Ação → Meio → Finalidade → Detalhamento_\n\n💡 Salve repertórios na aba **Redação ENEM** para consultar na hora da prova.`;
  }
 
  // Plano
  if (/plano|cronograma|organizar|semana|agenda/.test(p)) {
    if (sem) return `📅 Registre algumas sessões primeiro.\n\nDepois use o botão **⚛️ Gerar com IA** no bloco "Plano Semanal" do Dashboard para uma agenda personalizada.`;
    const dias  = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const itens = [];
    if (d.revPend.length) itens.push(`🔄 Revisões pendentes (${d.revPend.length})`);
    d.pontosFracos.slice(0, 4).forEach(t => {
      const area = AREAS.find(a => a.id === t.area);
      itens.push(`📖 ${t.tema} (${area?.name || t.area}) — ${t.acerto}%`);
    });
    itens.push(`⚗️ Simulado misto — 20 questões`);
    const linhas = [`📅 **Sugestão para a semana:**\n`];
    itens.slice(0, 7).forEach((item, i) => linhas.push(`- **${dias[i]}:** ${item}`));
    linhas.push(`\n💡 Use o bloco **Plano Semanal** no Dashboard para mais detalhes.`);
    return linhas.join('\n');
  }
 
  // Dicas
  if (/dica|estratégia|como passar|como estudar/.test(p)) {
    return `🎯 **Estratégias para o ENEM:**\n\n**1. Estude por incidência** — veja o **Mapa ENEM** para saber o que mais cai.\n**2. Registre cada sessão** — sem dados não há diagnóstico.\n**3. Revisão espaçada** — não pule as revisões agendadas.\n**4. Caderno de erros** — entender o erro vale mais que volume de questões.\n**5. Redação toda semana** — é a competência mais previsível de melhorar.`;
  }
 
  // ── Matemática ────────────────────────────────────────
  if (/matemática|matematica|mat\b|funç|função|geometria|probabilidade|estatística|trigonometria|progressão|logaritmo|financeira|combinatória|matrizes/.test(p)) {
    return `📐 **Matemática no ENEM:**\n\n**Temas que mais caem (priorize):**\n- 🔴 Funções (1º e 2º grau) — 8–10× por prova\n- 🔴 Geometria Plana — 7–9× por prova\n- 🔴 Probabilidade e Estatística — 7–8× por prova\n- 🟠 Geometria Espacial — 5–7× por prova\n- 🟠 Trigonometria — 5–6× por prova\n- 🟠 Progressões (PA e PG) — 4–5× por prova\n\n**Como estudar Matemática no ENEM:**\n1. Foque em **resolver questões**, não em ler teoria\n2. Para cada erro, identifique se foi **conteúdo**, **cálculo** ou **interpretação**\n3. Funções e Geometria juntas respondem por ~30% da prova\n4. Sempre desenhe a figura — questões de geometria ficam mais fáceis\n\n💡 Vá ao **Mapa ENEM** e filtre por Matemática para ver todos os temas com incidência.`;
  }
 
  // ── Ciências da Natureza ──────────────────────────────
  if (/ciências da natureza|ciencias da natureza|\bcn\b|biologia|química|quimica|física|fisica|ecologia|genética|fisiologia|termoquímica|cinemática|eletricidade|citologia|evolução|óptica|radioatividade/.test(p)) {
    return `🔬 **Ciências da Natureza no ENEM:**\n\n**Temas que mais caem (priorize):**\n- 🔴 Ecologia e Biomas — 10–12× por prova\n- 🔴 Genética Mendeliana — 8–10× por prova\n- 🔴 Fisiologia Humana — 8–10× por prova\n- 🟠 Química Orgânica — 6–8× por prova\n- 🟠 Termoquímica e Termologia — 5–7× por prova\n- 🟠 Cinemática e Dinâmica — 5–6× por prova\n\n**Como estudar CN no ENEM:**\n1. O ENEM cobra **aplicação contextualizada** — não decoreba\n2. Biologia responde por ~50% das questões de CN\n3. Para Genética: pratique heredogramas de diferentes tipos\n4. Física e Química sempre trazem situações-problema reais\n\n💡 Filtre por CN no **Mapa ENEM** para ver todos os temas.`;
  }
 
  // ── Ciências Humanas ──────────────────────────────────
  if (/ciências humanas|ciencias humanas|\bch\b|história|historia|geografia|sociologia|filosofia|direitos humanos|brasil república|capitalismo|globalização|colonial|feudalismo|revolução/.test(p)) {
    return `🌍 **Ciências Humanas no ENEM:**\n\n**Temas que mais caem (priorize):**\n- 🔴 Direitos Humanos e Cidadania — 8–10× por prova\n- 🔴 Brasil República — 7–9× por prova\n- 🔴 Capitalismo e Mundo do Trabalho — 7–8× por prova\n- 🟠 Globalização e Geopolítica — 6–8× por prova\n- 🟠 Questão Ambiental e Urbana — 5–7× por prova\n- 🟠 Cultura e Identidade — 5–6× por prova\n\n**Como estudar CH no ENEM:**\n1. O ENEM cobra **relações entre conceitos**, não datas isoladas\n2. Conecte os temas históricos com problemas atuais\n3. Para Filosofia: entenda os conceitos, não só os nomes\n4. Leia charges e mapas — são cobrados com frequência\n\n💡 Filtre por CH no **Mapa ENEM** para ver todos os temas.`;
  }
 
  // ── Linguagens ────────────────────────────────────────
  if (/linguagens|\blc\b|português|portugues|interpretação de texto|gêneros textuais|variação linguística|semiótica|literatura|língua estrangeira|figuras de linguagem|morfossintaxe|intertextualidade/.test(p)) {
    return `📖 **Linguagens no ENEM:**\n\n**Temas que mais caem (priorize):**\n- 🔴 Interpretação e Leitura Crítica — 15–20× por prova\n- 🔴 Gêneros e Tipos Textuais — 10–12× por prova\n- 🟠 Variação Linguística — 6–8× por prova\n- 🟠 Semiótica e Linguagem Visual — 5–7× por prova\n- 🟠 Literatura Brasileira — 5–6× por prova\n\n**Como estudar LC no ENEM:**\n1. **Interpretação** é o eixo central — treine ler textos de diferentes gêneros\n2. Para cada questão, volte ao texto antes de marcar\n3. Charges, tirinhas e publicidades são cobradas frequentemente\n4. Para Literatura: conheça os movimentos e suas características principais\n\n💡 Filtre por Linguagens no **Mapa ENEM** para ver todos os temas.`;
  }
 
  // ── Repertórios por tema ──────────────────────────────
  if (/repertório|repertorio|sociocultural|citar|citação|argumento|tecnologia e sociedade|meio ambiente|desigualdade|saúde mental|educação|feminismo|racismo/.test(p)) {
    const tema = /tecnologia/.test(p) ? 'tecnologia'
      : /meio ambiente|ambiental/.test(p) ? 'meio ambiente'
      : /desigualdade|pobreza/.test(p) ? 'desigualdade'
      : /saúde mental|ansiedade|depressão/.test(p) ? 'saúde mental'
      : /educação|escola/.test(p) ? 'educação'
      : null;
 
    const repertorios = {
      tecnologia: [
        '**Shoshana Zuboff** (Capitalismo de Vigilância) — uso de dados pessoais como mercadoria',
        '**Manuel Castells** (Sociedade em Rede) — transformação das relações sociais pela tecnologia',
        '**Hannah Arendt** (banalidade do mal) — adaptável para desumanização em redes sociais',
        '**Art. 5º da Constituição** — direito à privacidade e à informação',
        '**Lei Geral de Proteção de Dados (LGPD)** — regulamentação do uso de dados no Brasil',
      ],
      'meio ambiente': [
        '**Relatório Brundtland** (1987) — conceito de desenvolvimento sustentável',
        '**Acordo de Paris** (2015) — meta de limitar aquecimento a 1,5°C',
        '**Art. 225 da Constituição** — direito ao meio ambiente ecologicamente equilibrado',
        '**Ailton Krenak** (*Ideias para Adiar o Fim do Mundo*) — perspectiva indígena',
        '**Rachel Carson** (*Primavera Silenciosa*) — pioneira no ambientalismo moderno',
      ],
      desigualdade: [
        '**Thomas Piketty** (*O Capital no Século XXI*) — concentração de riqueza',
        '**Índice de Gini** — medida de desigualdade de renda',
        '**Sérgio Buarque de Holanda** (*Raízes do Brasil*) — herança colonial e exclusão',
        '**Art. 3º da Constituição** — objetivo de reduzir desigualdades regionais e sociais',
        '**ODS 10 da ONU** — redução das desigualdades como meta global',
      ],
      'saúde mental': [
        '**OMS** — saúde como bem-estar físico, mental e social (não só ausência de doença)',
        '**Michel Foucault** (*História da Loucura*) — estigma e exclusão social',
        '**Reforma Psiquiátrica Brasileira** (Lei 10.216/2001) — desinstitucionalização',
        '**Burnout reconhecido como doença ocupacional** pela OMS em 2019',
        '**Albert Camus** (*O Mito de Sísifo*) — busca por sentido diante do absurdo',
      ],
      educação: [
        '**Paulo Freire** (*Pedagogia do Oprimido*) — educação como prática de liberdade',
        '**Art. 205 da Constituição** — educação como direito de todos e dever do Estado',
        '**LDB (Lei 9.394/1996)** — estrutura da educação brasileira',
        '**Anísio Teixeira** — defensor da educação pública e universal no Brasil',
        '**PISA** — avaliação internacional que expõe lacunas do sistema educacional brasileiro',
      ],
    };
 
    if (tema && repertorios[tema]) {
      return `✍️ **Repertórios para redação — ${tema}:**\n\n${repertorios[tema].map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n💡 Salve esses repertórios na aba **Redação ENEM** para não perder.`;
    }
 
    return `✍️ **Como usar repertório sociocultural:**\n\nO repertório deve ser **legítimo** (real, verificável) e **pertinente** (conectado à tese).\n\n**Tipos aceitos pelo ENEM:**\n- Obras literárias e filosóficas\n- Dados e estatísticas (IBGE, OMS, ONU)\n- Leis e artigos da Constituição\n- Eventos históricos contextualizados\n- Teorias científicas reconhecidas\n\n**O que não funciona:**\n- Citações inventadas ou imprecisas\n- Repertório desconectado da tese\n- Provérbios populares (peso baixo)\n\nMe diga o **tema específico** (ex: "repertórios para tecnologia") e dou uma lista personalizada!`;
  }
 
  // ── Como o ENEM funciona ──────────────────────────────
  if (/como funciona o enem|estrutura do enem|dias do enem|quantas questões|nota do enem|tir|nota de corte|sisu|prouni|fies/.test(p)) {
    return `📋 **Como funciona o ENEM:**\n\n**Estrutura da prova:**\n- **Dia 1:** Linguagens (45 questões) + Redação + Ciências Humanas (45 questões) — 5h30\n- **Dia 2:** Ciências da Natureza (45 questões) + Matemática (45 questões) — 5h\n- Total: **180 questões objetivas + 1 redação**\n\n**Nota:**\n- Calculada pela **Teoria de Resposta ao Item (TRI)**\n- Não é percentual simples — questões difíceis valem mais\n- Escala de 0 a 1000 por área\n- Redação de 0 a 1000 (5 competências × 200 pontos)\n\n**Usos da nota:**\n- **SISU** — ingresso em universidades federais\n- **ProUni** — bolsas em faculdades privadas\n- **FIES** — financiamento estudantil\n- **Enem exterior** — ingresso em universidades de Portugal e outros países\n\n💡 O ENEM 2026 está marcado para novembro. Você tem **${d.sessions.length > 0 ? 'dados registrados' : 'tempo para se preparar'}** — use o Mapa ENEM para priorizar os temas certos.`;
  }
 
  // ── Comparação entre áreas ────────────────────────────
  if (/área mais fácil|área mais difícil|qual área focar|melhor área|pior área|comparar áreas/.test(p)) {
    if (sem) return `📊 Sem dados seus ainda, não consigo comparar suas áreas.\n\nRegistre sessões em diferentes disciplinas e eu mostro onde você está melhor e onde precisa de mais atenção.`;
 
    const porArea = {};
    d.sessions.forEach(s => {
      if (!porArea[s.area]) porArea[s.area] = { total: 0, correct: 0 };
      porArea[s.area].total   += s.total;
      porArea[s.area].correct += s.correct;
    });
 
    const ranking = Object.entries(porArea)
      .map(([id, v]) => ({
        id,
        nome: d.state.areas?.find?.(a => a.id === id)?.name || id.toUpperCase(),
        pct: v.total ? Math.round(v.correct / v.total * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);
 
    const linhas = [`📊 **Seu desempenho por área:**\n`];
    ranking.forEach((a, i) => {
      const bar = a.pct >= 70 ? '✅' : a.pct >= 50 ? '🟡' : '🔴';
      linhas.push(`${i + 1}. **${a.nome}**: ${bar} ${a.pct}%`);
    });
 
    if (ranking.length > 0) {
      linhas.push(`\n💪 Melhor área: **${ranking[0].nome}** (${ranking[0].pct}%)`);
      linhas.push(`🎯 Foco principal: **${ranking[ranking.length - 1].nome}** (${ranking[ranking.length - 1].pct}%)`);
    }
    return linhas.join('\n');
  }
 
  // ── Quantos dias para o ENEM ──────────────────────────
  if (/quantos dias|falta para o enem|quando é o enem|data do enem/.test(p)) {
    const enem = new Date('2026-11-08');
    const hoje2 = new Date();
    const dias  = Math.ceil((enem - hoje2) / 86400000);
    const meses = Math.floor(dias / 30);
    return `📅 **Faltam ${dias} dias para o ENEM 2026** (8 de novembro de 2026).\n\n${meses > 0 ? `São aproximadamente **${meses} meses**.` : ''}\n\n${dias > 180
      ? `✅ Tempo suficiente para uma preparação sólida. Com consistência de 1h por dia você consegue cobrir todos os temas de alta incidência.`
      : dias > 90
      ? `⚡ Tempo moderado. Priorize os temas de **Muito Alta** incidência e garanta as revisões em dia.`
      : `🔥 Reta final! Foque em revisões, simulados e nos temas onde ainda tem maior déficit.`}`;
  }
 
  // ── Fallback
  if (sem) return `🤔 Registre suas primeiras sessões para eu ter dados sobre você!\n\nPosso ajudar com: **o que estudar hoje**, **diagnóstico**, **revisões**, **Anki**, **redação** e **plano de estudos**.`;
  return `🤔 Não entendi exatamente, mas aqui está seu resumo:\n\n- Acerto: **${d.pct}%** (Nível ${d.nivel})\n- Revisões pendentes: **${d.revPend.length}**\n- Anki pendente: **${d.ankiPend.length}**\n${d.pontosFracos.length ? `- Pior tema: **${d.pontosFracos[0].tema}** (${d.pontosFracos[0].acerto}%)` : ''}\n\nTente: *"O que estudar hoje?"*, *"Diagnóstico"*, *"Meus erros"* ou *"Plano semanal"*.`;
}
 
// ─── Markdown → HTML ─────────────────────────────────────
 
function markdownParaHtml(texto) {
  return texto
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,.1);padding:1px 5px;border-radius:3px;font-size:12px">$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul style="margin:6px 0;padding-left:18px">$&</ul>')
    .replace(/<\/ul>\s*<ul[^>]*>/g, '')
    .replace(/\n\n/g, '</p><p style="margin:8px 0 0">')
    .replace(/\n/g, '<br>');
}
 
// ─── Inicialização ────────────────────────────────────────
 
export function inicializarAssistente() {
  const input = document.getElementById('asstInput');
  if (!input) return;
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
}
 
export function toggleAssistant() {
  const panel = document.getElementById('asstPanel');
  if (!panel) return;
  const aberto = panel.classList.toggle('open');
  if (aberto) setTimeout(() => document.getElementById('asstInput')?.focus(), 150);
}
 
export function clearChat() {
  const msgs = document.getElementById('asstMsgs');
  if (msgs) {
    msgs.innerHTML = `
      <div class="asst-msg bot">
        <div class="asst-bubble">
          Olá! Sou o <strong>Atominho</strong> ⚛️, seu assistente de estudos.<br><br>
          Analiso seus dados e respondo sobre desempenho, revisões, erros e estratégias. Como posso ajudar?
        </div>
      </div>`;
  }
  const sugs = document.getElementById('asstSugs');
  if (sugs) sugs.style.display = 'flex';
}
 
export function sendQuick(texto) {
  const input = document.getElementById('asstInput');
  if (input) input.value = texto;
  const sugs = document.getElementById('asstSugs');
  if (sugs) sugs.style.display = 'none';
  sendMessage();
}
 
export function handleAsstKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}
 
export async function sendMessage() {
  if (_enviando) return;
  const input  = document.getElementById('asstInput');
  const msgs   = document.getElementById('asstMsgs');
  const btnEnv = document.getElementById('asstSendBtn');
  if (!input || !msgs) return;
 
  const texto = input.value.trim();
  if (!texto) return;
 
  const sugs = document.getElementById('asstSugs');
  if (sugs) sugs.style.display = 'none';
 
  _adicionarMensagem(msgs, 'user', texto);
  input.value = '';
  input.style.height = 'auto';
 
  _enviando = true;
  if (btnEnv) btnEnv.disabled = true;
 
  const typingId = _adicionarDigitando(msgs);
  const delay    = Math.min(Math.max(texto.split(' ').length * 40, 400), 1200);
  await new Promise(r => setTimeout(r, delay));
 
  try {
    const resposta = gerarResposta(texto);
    document.getElementById(typingId)?.remove();
    _adicionarMensagem(msgs, 'bot', resposta);
  } catch (e) {
    document.getElementById(typingId)?.remove();
    _adicionarMensagem(msgs, 'bot', '⚠️ Ocorreu um erro. Tente novamente.');
    console.error('[Atominho]', e);
  } finally {
    _enviando = false;
    if (btnEnv) btnEnv.disabled = false;
    input.focus();
  }
}
 
function _adicionarMensagem(container, tipo, texto) {
  const div = document.createElement('div');
  div.className = `asst-msg ${tipo}`;
  div.innerHTML = `<div class="asst-bubble">${markdownParaHtml(texto)}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}
 
function _adicionarDigitando(container) {
  const id  = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id    = id;
  div.className = 'asst-msg bot';
  div.innerHTML = `<div class="asst-bubble asst-typing"><span></span><span></span><span></span></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}