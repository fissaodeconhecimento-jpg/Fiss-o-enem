// ═══════════════════════════════════════════════════════════
// demo.js — Estado demo premium para prova de valor imediata.
// ═══════════════════════════════════════════════════════════

import { setUserKey } from './storage.js';

const DEMO_USER = 'demo@fissao.local';

function isoDaysAgo(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function isoDaysFromNow(days) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function makeSession(id, daysAgo, area, topic, total, correct, tipoErro = null, tempo = null) {
  return {
    id,
    area,
    topic,
    total,
    correct,
    date: isoDaysAgo(daysAgo),
    tipoErro,
    tempo
  };
}

function makeRevision(id, daysOffset, subject, area, done = false, auto = true, intervalo = null) {
  return {
    id,
    subject,
    area,
    date: daysOffset >= 0 ? isoDaysFromNow(daysOffset) : isoDaysAgo(Math.abs(daysOffset)),
    done,
    auto,
    intervalo
  };
}

function makeErro(id, daysAgo, area, tema, tipoErro, conceito, questao, meuRaciocinio, respostaCorreta) {
  return {
    id: String(id),
    data: isoDaysAgo(daysAgo),
    area,
    tema,
    tipoErro,
    conceito,
    questao,
    meuRaciocinio,
    respostaCorreta
  };
}

function makeCard(id, area, tema, pergunta, resposta, nivel, dueOffset) {
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);

  const ultima = new Date(hoje);
  ultima.setDate(ultima.getDate() - Math.max(1, nivel + 1));

  const proxima = new Date(hoje);
  proxima.setDate(proxima.getDate() + dueOffset);

  return {
    id,
    pergunta,
    resposta,
    tema,
    area,
    dificuldade: nivel <= 1 ? 'dificil' : nivel >= 3 ? 'facil' : 'media',
    nivel,
    ultimaRevisao: ultima.toISOString().split('T')[0],
    proximaRevisao: proxima.toISOString().split('T')[0],
    createdAt: isoDaysAgo(20 + id)
  };
}

export function createDemoState() {
  const sessions = [
    makeSession(1, 18, 'mat', 'Funções (1º e 2º grau)', 12, 6, 'Conteúdo', 32),
    makeSession(2, 17, 'cn', 'Citologia', 10, 5, 'Conteúdo', 24),
    makeSession(3, 16, 'lc', 'Interpretação e Leitura Crítica', 14, 9, 'Interpretação', 28),
    makeSession(4, 15, 'ch', 'Globalização e Geopolítica', 11, 7, 'Interpretação', 22),
    makeSession(5, 14, 'mat', 'Geometria Plana', 15, 8, 'Cálculo', 35),
    makeSession(6, 13, 'cn', 'Ecologia e Biomas', 13, 9, 'Atenção', 26),
    makeSession(7, 12, 'mat', 'Probabilidade e Estatística', 12, 7, 'Estratégia', 27),
    makeSession(8, 11, 'lc', 'Gêneros e Tipos Textuais', 10, 8, 'Interpretação', 20),
    makeSession(9, 10, 'ch', 'Direitos Humanos e Cidadania', 12, 9, 'Interpretação', 23),
    makeSession(10, 9, 'cn', 'Fisiologia Humana', 14, 10, 'Conteúdo', 30),
    makeSession(11, 8, 'mat', 'Trigonometria', 10, 4, 'Cálculo', 29),
    makeSession(12, 7, 'mat', 'Funções (1º e 2º grau)', 12, 8, 'Atenção', 24),
    makeSession(13, 6, 'red', 'Proposta de Intervenção C5', 8, 6, 'Estratégia', 18),
    makeSession(14, 5, 'lc', 'Literatura Brasileira', 11, 7, 'Conteúdo', 21),
    makeSession(15, 4, 'cn', 'Genética Mendeliana', 12, 8, 'Conteúdo', 26),
    makeSession(16, 3, 'ch', 'Brasil República', 10, 8, 'Atenção', 19),
    makeSession(17, 2, 'mat', 'Geometria Plana', 14, 10, 'Cálculo', 28),
    makeSession(18, 1, 'mat', 'Probabilidade e Estatística', 12, 9, 'Estratégia', 22),
    makeSession(19, 0, 'lc', 'Interpretação e Leitura Crítica', 15, 11, 'Interpretação', 25)
  ];

  const revisions = [
    makeRevision(1, -1, 'Citologia', 'cn', false, true, 1),
    makeRevision(2, 0, 'Trigonometria', 'mat', false, true, 7),
    makeRevision(3, 1, 'Funções (1º e 2º grau)', 'mat', false, true, 1),
    makeRevision(4, 3, 'Proposta de Intervenção C5', 'red', false, true, 7),
    makeRevision(5, 7, 'Geometria Plana', 'mat', false, true, 30),
    makeRevision(6, -4, 'Citologia', 'cn', true, true, 7),
    makeRevision(7, -2, 'Globalização e Geopolítica', 'ch', true, false, null)
  ];

  const caderno = [
    makeErro(1, 18, 'mat', 'Funções (1º e 2º grau)', 'Conteúdo', 'leitura de gráfico de parábola', 'Questão sobre vértice e zeros da função.', 'Confundi concavidade com intercepto no eixo y.', 'Primeiro, localizar o vértice; depois, usar as raízes para interpretar o gráfico.'),
    makeErro(2, 17, 'cn', 'Citologia', 'Conteúdo', 'função das organelas', 'Questão relacionando lisossomo e complexo golgiense.', 'Marquei armazenamento em vez de digestão intracelular.', 'Lisossomos atuam na digestão intracelular; Golgi modifica e empacota substâncias.'),
    makeErro(3, 14, 'mat', 'Geometria Plana', 'Cálculo', 'área de triângulo com altura relativa', 'Questão com base e altura em posições diferentes.', 'Usei lado oblíquo como altura.', 'A altura precisa ser perpendicular à base escolhida.'),
    makeErro(4, 12, 'mat', 'Probabilidade e Estatística', 'Estratégia', 'leitura de tabela antes da conta', 'Questão sobre média ponderada.', 'Fui direto para a conta e ignorei pesos diferentes.', 'Antes de calcular, identificar frequências e pesos de cada grupo.'),
    makeErro(5, 11, 'lc', 'Gêneros e Tipos Textuais', 'Interpretação', 'função social do gênero', 'Questão com charge e intenção crítica.', 'Foquei no tema e ignorei o efeito de humor.', 'Era uma charge com crítica social, não uma notícia informativa.'),
    makeErro(6, 8, 'mat', 'Trigonometria', 'Cálculo', 'seno e cosseno em triângulo retângulo', 'Questão com razão trigonométrica.', 'Troquei cateto oposto por adjacente.', 'Seno = oposto/hipotenusa e cosseno = adjacente/hipotenusa.'),
    makeErro(7, 6, 'red', 'Proposta de Intervenção C5', 'Estratégia', 'agente + ação + meio + finalidade', 'Rascunho da conclusão da redação.', 'Escrevi uma proposta genérica sem detalhamento.', 'A intervenção precisa ter agente, ação, meio, finalidade e detalhamento.'),
    makeErro(8, 4, 'cn', 'Genética Mendeliana', 'Conteúdo', 'dominância e segregação', 'Questão sobre heredograma.', 'Ignorei a chance de indivíduo heterozigoto.', 'A análise depende do padrão de transmissão e dos genótipos possíveis.')
  ];

  const anki = [
    makeCard(1, 'cn', 'Citologia', 'Qual organela está ligada à digestão intracelular?', 'Lisossomo.', 1, -1),
    makeCard(2, 'mat', 'Funções (1º e 2º grau)', 'O que o vértice da parábola pode indicar?', 'Máximo ou mínimo da função quadrática.', 2, 0),
    makeCard(3, 'mat', 'Geometria Plana', 'Como calcular a área de um triângulo?', 'A = base × altura / 2.', 2, 1),
    makeCard(4, 'lc', 'Interpretação e Leitura Crítica', 'O que verificar antes de marcar a alternativa?', 'Comando, tese do texto e efeito produzido.', 3, -2),
    makeCard(5, 'red', 'Proposta de Intervenção C5', 'Quais elementos formam uma intervenção completa?', 'Agente, ação, meio, finalidade e detalhamento.', 1, 0),
    makeCard(6, 'mat', 'Trigonometria', 'Qual a razão do seno?', 'Cateto oposto dividido pela hipotenusa.', 0, -1)
  ];

  const repertorios = [
    {
      id: 1,
      tema: 'educacao',
      titulo: 'Paulo Freire',
      conteudo: 'A educação precisa formar sujeitos críticos, não apenas reproduzir conteúdo.',
      eixo: 'filosofia',
      createdAt: isoDaysAgo(12)
    },
    {
      id: 2,
      tema: 'tecnologia',
      titulo: 'Byung-Chul Han',
      conteudo: 'A sociedade do desempenho aumenta pressão, ansiedade e autoexploração.',
      eixo: 'filosofia',
      createdAt: isoDaysAgo(9)
    },
    {
      id: 3,
      tema: 'desigualdade',
      titulo: 'Constituição Federal de 1988',
      conteudo: 'Garantia de dignidade, igualdade e redução das desigualdades sociais.',
      eixo: 'lei',
      createdAt: isoDaysAgo(6)
    }
  ];

  const ideias = [
    {
      id: 1,
      tema: 'tecnologia',
      titulo: 'Algoritmos reforçam bolhas',
      argumento: 'Sem educação midiática, plataformas tendem a reforçar vieses e dificultar pensamento crítico.',
      createdAt: isoDaysAgo(8)
    },
    {
      id: 2,
      tema: 'educacao',
      titulo: 'Desigualdade de acesso',
      argumento: 'A falta de infraestrutura escolar aprofunda desigualdades e limita mobilidade social.',
      createdAt: isoDaysAgo(7)
    },
    {
      id: 3,
      tema: 'saude-mental',
      titulo: 'Pressão por produtividade',
      argumento: 'A cultura da performance amplia adoecimento psíquico quando não há suporte coletivo.',
      createdAt: isoDaysAgo(5)
    }
  ];

  const errosDiag = sessions
    .filter(s => s.tipoErro && s.correct < s.total)
    .map(s => ({
      tipo: s.tipoErro,
      date: s.date,
      area: s.area,
      tema: s.topic
    }));

  return {
    sessions,
    revisions,
    errosDiag,
    caderno,
    anki,
    repertorios,
    ideias
  };
}

export function activateDemoMode() {
  const demoState = createDemoState();
  setUserKey(DEMO_USER);
  localStorage.setItem('fissao_onboarding_v1', 'done');
  localStorage.setItem('fissao_onboarding_v2', 'done');
  localStorage.setItem('fissao_demo_mode', 'true');
  localStorage.setItem('fissao_v4_demo_fingerprint', 'premium_v1');
  localStorage.setItem('fissao_v4_demo@fissao.local', JSON.stringify(demoState));
  window.__fissaoDemoMode = true;
  return { username: DEMO_USER, state: demoState };
}

export function isDemoMode() {
  return localStorage.getItem('fissao_demo_mode') === 'true' || window.__fissaoDemoMode === true;
}

export function clearDemoMode() {
  localStorage.removeItem('fissao_demo_mode');
  window.__fissaoDemoMode = false;
}

export { DEMO_USER };
