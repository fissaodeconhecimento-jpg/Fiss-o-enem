// ═══════════════════════════════════════════════════════════
// constants.js — Constantes imutáveis da aplicação
// Todos os outros módulos importam daqui.
// ═══════════════════════════════════════════════════════════

export const STORAGE_KEY   = 'fissao_v4';
export const USERS_KEY     = 'fissao_users_v1';
export const SESSION_KEY   = 'fissao_session_v1';

export const AREAS = [
  { id: 'cn',  name: 'Ciências da Natureza', color: '#10d9a0' },
  { id: 'ch',  name: 'Ciências Humanas',     color: '#4f9ef8' },
  { id: 'lc',  name: 'Linguagens',           color: '#c084fc' },
  { id: 'mat', name: 'Matemática',           color: '#f5c518' },
  { id: 'red', name: 'Redação',              color: '#f472b6' },
];

export const TIPOS_ERRO    = ['Conteúdo', 'Interpretação', 'Atenção', 'Cálculo', 'Estratégia'];
export const ANKI_INTERVALOS = [1, 3, 7, 15, 30];
export const PESOS_INC     = { 'muito-alta': 3, 'alta': 2, 'media': 1, 'baixa': 0.5 };

export const TEMAS_REDACAO = {
  'educacao':     'Educação',
  'tecnologia':   'Tecnologia',
  'saude-mental': 'Saúde Mental',
  'desigualdade': 'Desigualdade',
  'meio-ambiente':'Meio Ambiente',
  'politica':     'Política',
  'cultura':      'Cultura',
  'ciencia':      'Ciência',
};

export const DEFAULT_STATE = {
  sessions:    [],
  revisions:   [],
  errosDiag:   [],
  caderno:     [],
  anki:        [],
  repertorios: [],
  ideias:      [],
};

export const INC_ENEM = {
  cn: [
    { tema: 'Ecologia e Biomas',              nivel: 'muito-alta', freq: '10–12×/prova', nota: 'Questões de ecossistemas, cadeias alimentares, biomas brasileiros' },
    { tema: 'Genética Mendeliana',            nivel: 'muito-alta', freq: '8–10×/prova',  nota: 'Heredograma, dominância, codominância, grupos sanguíneos' },
    { tema: 'Fisiologia Humana',              nivel: 'muito-alta', freq: '8–10×/prova',  nota: 'Sistema nervoso, hormônios, digestão, circulação' },
    { tema: 'Química Orgânica',               nivel: 'alta',       freq: '6–8×/prova',   nota: 'Funções orgânicas, reações, polímeros, petróleo' },
    { tema: 'Termoquímica e Termologia',      nivel: 'alta',       freq: '5–7×/prova',   nota: 'Entalpia, entropia, leis da termodinâmica' },
    { tema: 'Cinemática e Dinâmica',          nivel: 'alta',       freq: '5–6×/prova',   nota: 'MRU, MRUV, Leis de Newton, trabalho e energia' },
    { tema: 'Eletroquímica e Eletricidade',   nivel: 'alta',       freq: '4–6×/prova',   nota: 'Pilhas, eletrólise, lei de Ohm, circuitos' },
    { tema: 'Citologia',                      nivel: 'media',      freq: '3–5×/prova',   nota: 'Organelas, mitose/meiose, membrana, respiração celular' },
    { tema: 'Evolução e Origem da Vida',      nivel: 'media',      freq: '3–4×/prova',   nota: 'Teorias evolutivas, especiação, seleção natural' },
    { tema: 'Óptica e Ondas',                 nivel: 'media',      freq: '3–4×/prova',   nota: 'Reflexão, refração, espelhos, lentes' },
    { tema: 'Soluções e Equilíbrio Químico',  nivel: 'media',      freq: '3–4×/prova',   nota: 'Concentração, pH, Le Chatelier' },
    { tema: 'Radioatividade e Física Moderna',nivel: 'baixa',      freq: '1–3×/prova',   nota: 'Decaimento, fissão, fusão, efeito fotoelétrico' },
  ],
  ch: [
    { tema: 'Direitos Humanos e Cidadania',   nivel: 'muito-alta', freq: '8–10×/prova',  nota: 'ECA, Constituição, democracia, movimentos sociais' },
    { tema: 'Brasil República',               nivel: 'muito-alta', freq: '7–9×/prova',   nota: 'Era Vargas, Ditadura Militar, redemocratização' },
    { tema: 'Capitalismo e Mundo do Trabalho',nivel: 'muito-alta', freq: '7–8×/prova',   nota: 'Revolução Industrial, CLT, neoliberalismo, desemprego' },
    { tema: 'Globalização e Geopolítica',     nivel: 'alta',       freq: '6–8×/prova',   nota: 'Blocos econômicos, conflitos, organismos internacionais' },
    { tema: 'Questão Ambiental e Urbana',     nivel: 'alta',       freq: '5–7×/prova',   nota: 'Urbanização, segregação, saneamento, sustentabilidade' },
    { tema: 'Cultura e Identidade',           nivel: 'alta',       freq: '5–6×/prova',   nota: 'Diversidade étnica, religiosa, gênero, feminismo' },
    { tema: 'Brasil Colonial',                nivel: 'media',      freq: '4–5×/prova',   nota: 'Escravidão, capitanias, açúcar, resistência' },
    { tema: 'Idade Média',                    nivel: 'media',      freq: '3–4×/prova',   nota: 'Feudalismo, Igreja, Cruzadas' },
    { tema: 'Revoluções Burguesas',           nivel: 'media',      freq: '3–4×/prova',   nota: 'Francesa, Americana, Inglesa, iluminismo' },
    { tema: 'Filosofia Política',             nivel: 'media',      freq: '3–4×/prova',   nota: 'Contratualismo, utilitarismo, marxismo' },
    { tema: 'Cartografia e Geomorfologia',    nivel: 'baixa',      freq: '2–3×/prova',   nota: 'Escalas, projeções, relevo, hidrografia' },
  ],
  lc: [
    { tema: 'Interpretação e Leitura Crítica',nivel: 'muito-alta', freq: '15–20×/prova', nota: 'Infere sentido, reconhece recursos argumentativos' },
    { tema: 'Gêneros e Tipos Textuais',       nivel: 'muito-alta', freq: '10–12×/prova', nota: 'Charge, crônica, editorial, reportagem, conto' },
    { tema: 'Variação Linguística',           nivel: 'alta',       freq: '6–8×/prova',   nota: 'Norma culta vs. coloquial, dialetos, registros' },
    { tema: 'Semiótica e Linguagem Visual',   nivel: 'alta',       freq: '5–7×/prova',   nota: 'Imagem, publicidade, humor, intertextualidade' },
    { tema: 'Literatura Brasileira',          nivel: 'alta',       freq: '5–6×/prova',   nota: 'Modernismo, Regionalismo, Romantismo, autores canônicos' },
    { tema: 'Língua Estrangeira (inglês/espanhol)', nivel: 'media', freq: '4–5×/prova', nota: 'Compreensão de texto, vocabulário em contexto' },
    { tema: 'Figuras de Linguagem',           nivel: 'media',      freq: '3–4×/prova',   nota: 'Metáfora, ironia, metonímia, hipérbole' },
    { tema: 'Morfossintaxe',                  nivel: 'media',      freq: '3–4×/prova',   nota: 'Concordância, regência, crase, pontuação' },
    { tema: 'Intertextualidade',              nivel: 'media',      freq: '3–4×/prova',   nota: 'Paródia, paráfrase, alusão, citação' },
  ],
  mat: [
    { tema: 'Funções (1º e 2º grau)',         nivel: 'muito-alta', freq: '8–10×/prova',  nota: 'Domínio, imagem, gráficos, raízes, máximos' },
    { tema: 'Geometria Plana',                nivel: 'muito-alta', freq: '7–9×/prova',   nota: 'Área, perímetro, semelhança, ângulos, Pitágoras' },
    { tema: 'Probabilidade e Estatística',    nivel: 'muito-alta', freq: '7–8×/prova',   nota: 'Frequência, média, mediana, moda, gráficos' },
    { tema: 'Geometria Espacial',             nivel: 'alta',       freq: '5–7×/prova',   nota: 'Volume e área de sólidos, prismas, pirâmides, esfera' },
    { tema: 'Trigonometria',                  nivel: 'alta',       freq: '5–6×/prova',   nota: 'Sen/cos/tg, lei dos senos e cossenos, ciclo' },
    { tema: 'Progressões (PA e PG)',          nivel: 'alta',       freq: '4–5×/prova',   nota: 'Termos, soma, interpolação, juros compostos' },
    { tema: 'Análise Combinatória',           nivel: 'media',      freq: '3–5×/prova',   nota: 'Permutação, combinação, arranjo, princípio multiplicativo' },
    { tema: 'Logaritmos e Exponenciais',      nivel: 'media',      freq: '3–4×/prova',   nota: 'Propriedades, equações, crescimento/decaimento' },
    { tema: 'Matemática Financeira',          nivel: 'media',      freq: '3–4×/prova',   nota: 'Juros simples e compostos, desconto, amortização' },
    { tema: 'Geometria Analítica',            nivel: 'media',      freq: '3–4×/prova',   nota: 'Ponto, reta, circunferência, distâncias' },
    { tema: 'Matrizes e Determinantes',       nivel: 'baixa',      freq: '1–3×/prova',   nota: 'Operações, sistemas lineares, Cramer' },
  ],
  red: [
    { tema: 'Estrutura Dissertativa-Argumentativa', nivel: 'muito-alta', freq: 'Toda prova', nota: 'Tese, argumentos, proposta de intervenção' },
    { tema: 'Proposta de Intervenção C5',     nivel: 'muito-alta', freq: 'Toda prova',    nota: 'Agente + ação + meio + finalidade + detalhamento' },
    { tema: 'Repertório Sociocultural',       nivel: 'muito-alta', freq: 'Toda prova',    nota: 'Citação de autores, leis, dados, obras' },
    { tema: 'Coesão e Coerência',             nivel: 'alta',       freq: 'Toda prova',    nota: 'Conectivos, progressão temática, paragrafação' },
    { tema: 'Norma Culta (C1)',               nivel: 'alta',       freq: 'Toda prova',    nota: 'Concordância, regência, ortografia, pontuação' },
    { tema: 'Temas Recorrentes ENEM',         nivel: 'alta',       freq: 'Varia',         nota: 'Tecnologia, meio ambiente, desigualdade, saúde, educação' },
  ],
};
