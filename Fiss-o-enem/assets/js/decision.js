// ═══════════════════════════════════════════════════════════
// decision.js — Motor de decisão central do Fissão
// ═══════════════════════════════════════════════════════════
 
import { todayISO } from './utils.js';
import { calcDesempenhoTema, gerarFoco } from './diagnostico.js';
 
export const TRILHA_POR_AREA = {
  cn: [
    'Citologia',
    'Bioquímica',
    'Genética',
    'Ecologia',
    'Eletroquímica',
    'Estequiometria',
    'Termologia',
    'Ondulatória'
  ],
  mat: [
    'Aritmética',
    'Porcentagem',
    'Razão e Proporção',
    'Função Afim',
    'Função Quadrática',
    'Geometria Plana',
    'Geometria Espacial',
    'Probabilidade'
  ],
  ch: [
    'Brasil Colônia',
    'Brasil Império',
    'República Velha',
    'Geopolítica',
    'Globalização',
    'Cartografia',
    'Urbanização',
    'Movimentos Sociais'
  ],
  lc: [
    'Interpretação de Texto',
    'Figuras de Linguagem',
    'Funções da Linguagem',
    'Gêneros Textuais',
    'Literatura Brasileira',
    'Modernismo',
    'Variação Linguística',
    'Arte Contemporânea'
  ],
  red: [
    'Tese',
    'Argumentação',
    'Repertório Sociocultural',
    'Coesão',
    'Proposta de Intervenção'
  ]
};

const ALIASES_TRILHA = {
  cn: {
    'ecologia': ['ecologia e biomas', 'biomas'],
    'genetica': ['genetica mendeliana'],
    'termologia': ['termoquimica e termologia'],
    'ondulatoria': ['optica e ondas', 'óptica e ondas'],
    'eletroquimica': ['eletroquimica e eletricidade']
  },
  mat: {
    'aritmetica': ['matematica financeira', 'matemática financeira'],
    'porcentagem': ['matematica financeira', 'matemática financeira'],
    'razao e proporcao': ['probabilidade e estatistica', 'probabilidade e estatística'],
    'funcao afim': ['funcoes (1º e 2º grau)', 'funções (1º e 2º grau)', 'funcoes', 'funções'],
    'funcao quadratica': ['funcoes (1º e 2º grau)', 'funções (1º e 2º grau)', 'funcoes', 'funções'],
    'probabilidade': ['probabilidade e estatistica', 'probabilidade e estatística']
  },
  ch: {
    'brasil colonia': ['brasil colonial'],
    'geopolitica': ['globalizacao e geopolitica', 'globalização e geopolítica'],
    'globalizacao': ['globalizacao e geopolitica', 'globalização e geopolítica'],
    'cartografia': ['cartografia e geomorfologia'],
    'urbanizacao': ['questao ambiental e urbana', 'questão ambiental e urbana']
  },
  lc: {
    'interpretacao de texto': ['interpretacao e leitura critica', 'interpretação e leitura crítica'],
    'generos textuais': ['generos e tipos textuais', 'gêneros e tipos textuais'],
    'funcoes da linguagem': ['semiotica e linguagem visual', 'semiótica e linguagem visual']
  },
  red: {
    'tese': ['estrutura dissertativa-argumentativa'],
    'argumentacao': ['estrutura dissertativa-argumentativa'],
    'proposta de intervencao': ['proposta de intervencao c5', 'proposta de intervenção c5']
  }
};
 
function normalizarTema(txt) {
  return String(txt || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function foundNeedsStudy(item) {
  return item.acerto < 85;
}

function temaCorresponde(area, temaTrilha, temaRegistrado) {
  const trilhaNorm = normalizarTema(temaTrilha);
  const registradoNorm = normalizarTema(temaRegistrado);

  if (trilhaNorm === registradoNorm) return true;
  if (registradoNorm.includes(trilhaNorm) || trilhaNorm.includes(registradoNorm)) return true;

  const aliases = ALIASES_TRILHA[area]?.[trilhaNorm] || [];
  return aliases.some(alias => {
    const aliasNorm = normalizarTema(alias);
    return aliasNorm === registradoNorm || registradoNorm.includes(aliasNorm) || aliasNorm.includes(registradoNorm);
  });
}

function encontrarTemaRelacionado(area, temaTrilha, temasRegistrados) {
  return temasRegistrados.find(t => temaCorresponde(area, temaTrilha, t.tema));
}
 
function escolherProximoTemaNaTrilha(area, temaAtual, temasComDesempenho) {
  const trilha = TRILHA_POR_AREA[area] || [];
  if (!trilha.length) return temaAtual;

  const idxAtual = trilha.findIndex(t => temaCorresponde(area, t, temaAtual));

  const temasRegistrados = temasComDesempenho.filter(t => t.area === area);

  if (idxAtual >= 0) {
    for (let i = idxAtual + 1; i < trilha.length; i++) {
      const candidato = trilha[i];
      const encontrado = encontrarTemaRelacionado(area, candidato, temasRegistrados);

      if (!encontrado || foundNeedsStudy(encontrado)) {
        return candidato;
      }
    }
  }

  for (const candidato of trilha) {
    const encontrado = encontrarTemaRelacionado(area, candidato, temasRegistrados);

    if (!encontrado || foundNeedsStudy(encontrado)) {
      return candidato;
    }
  }

  return temaAtual;
}
 
export function getTrilhaStatus(state, area) {
  const trilha = TRILHA_POR_AREA[area] || [];
  const temas = calcDesempenhoTema(state.sessions || []);
  const temasArea = temas.filter(t => t.area === area);

  const base = trilha.map((tema) => {
    const encontrado = encontrarTemaRelacionado(area, tema, temasArea);

    let status = 'locked';
    let acerto = null;

    if (encontrado) {
      acerto = encontrado.acerto;
      if (encontrado.acerto < 60) status = 'review';
      else if (encontrado.acerto < 85) status = 'progress';
      else status = 'done';
    }

    return { tema, status, acerto };
  });

  const ultimoAtivo = [...base]
    .map((item, idx) => ({ ...item, idx }))
    .filter(item => item.status !== 'locked')
    .pop();

  const idxProximo = base.findIndex((item, idx) => {
    if (item.status !== 'locked') return false;
    if (!ultimoAtivo) return idx === 0;
    return idx === ultimoAtivo.idx + 1;
  });

  if (idxProximo >= 0) {
    base[idxProximo].status = 'next';
  } else if (!ultimoAtivo && base.length) {
    base[0].status = 'next';
  }

  return base;
}
 
export function decidirProximoPasso(state) {
  const hoje = todayISO();
 
  const revisoesAtrasadas = (state.revisions || [])
    .filter(r => !r.done && r.date <= hoje)
    .sort((a, b) => a.date.localeCompare(b.date));
 
  if (revisoesAtrasadas.length > 0) {
    const rev = revisoesAtrasadas[0];
    return {
      tipo: 'revisao',
      titulo: 'Prioridade: revisão pendente',
      descricao: 'Antes de avançar, conclua a revisão mais antiga pendente.',
      area: rev.area || null,
      topic: rev.subject || 'Revisão',
      total: 5,
      tempo: 15,
      origem: 'revisao'
    };
  }
 
  const temas = calcDesempenhoTema(state.sessions || []);
  const foco = gerarFoco(temas);
 
  if (!foco) {
    return {
      tipo: 'manual',
      titulo: 'Sem recomendação automática',
      descricao: 'Registre mais sessões para o sistema sugerir o próximo passo.',
      area: null,
      topic: '',
      total: '',
      tempo: '',
      origem: 'manual'
    };
  }
 
  if (foco.acerto < 60) {
    return {
      tipo: 'reforco',
      titulo: 'Prioridade: reforçar ponto fraco',
      descricao: 'Seu desempenho recente pede consolidação antes de avançar.',
      area: foco.area,
      topic: foco.tema,
      total: foco.acerto < 40 ? 15 : 12,
      tempo: foco.acerto < 40 ? 45 : 35,
      origem: 'foco',
      acerto: foco.acerto,
      score: foco.score,
      prioridade: foco.prioridade
    };
  }
 
  const proximoTema = escolherProximoTemaNaTrilha(foco.area, foco.tema, temas);
 
  return {
    tipo: proximoTema !== foco.tema ? 'sequencia' : 'novo',
    titulo: proximoTema !== foco.tema ? 'Próximo tópico da trilha' : 'Próximo estudo sugerido',
    descricao: proximoTema !== foco.tema
      ? 'Você já tem base suficiente para avançar dentro da mesma área.'
      : 'Você pode seguir com o próximo estudo sugerido pelo sistema.',
    area: foco.area,
    topic: proximoTema,
    total: 10,
    tempo: 30,
    origem: 'foco',
    acerto: foco.acerto,
    score: foco.score,
    prioridade: foco.prioridade
  };
}
