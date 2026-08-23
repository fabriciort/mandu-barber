/**
 * Dados reais da Mr. Mandu Barber — fonte unica de verdade do conteudo.
 *
 * REGRA DESTE ARQUIVO: so entra aqui o que foi confirmado com o cliente ou
 * consta de registro publico (CNPJ, redes oficiais). Nada de numero, horario,
 * preco ou depoimento inventado "para ilustrar". O que ainda falta confirmar
 * mora em PENDENCIAS, la embaixo, e aparece na tela como marcador visivel —
 * nao como um valor plausivel que ninguem lembra de trocar antes do lancamento.
 */

export const EMPRESA = {
  nomeFantasia: "Mr. Mandu Barber",
  /** Como a marca se escreve nas pecas: caixa baixa, sem "Barber". */
  assinaturaVisual: "mr. mandu",
  razaoSocial: "MR. MANDU BARBER SHOP SERVIÇOS LTDA",
  cnpj: "36.574.536/0001-68",
  /** Data de abertura na Receita — base para "desde 2020" na copy. */
  ativaDesde: "2020-03-05",

  endereco: {
    logradouro: "Rua São Paulo, 100",
    bairro: "Centro",
    cidade: "Embu-Guaçu",
    uf: "SP",
    cep: "06900-205",
  },

  /**
   * Os dois numeros sao fixos e confirmados. Qual deles atende WhatsApp (ou se
   * existe um terceiro so para isso) e PENDENCIAS.whatsapp — por isso o site
   * nao monta link wa.me a partir daqui.
   */
  telefones: ["1147015922", "1126263193"] as const,

  /** Dominio diferente da marca, mas e o e-mail confirmado da empresa. */
  email: "contato@focco10.com.br",

  redes: {
    instagram: "mr.mandubarbers",
    /** Perfil pessoal do fundador, onde mora o storytelling da marca. */
    instagramFundador: "mandubarber",
    facebook: "Mr. Mandu BarberShop",
  },
} as const;

/**
 * Equipe confirmada via LinkedIn.
 *
 * `agenda: false` significa que a pessoa nao aparece no fluxo de agendamento —
 * e o caso da recepcao. Ver PENDENCIAS.cargoRecepcao para o que falta no
 * sistema para ela ter acesso ao painel.
 */
export const EQUIPE = [
  {
    nome: "João Vitor Schmidt Krebs Mandu",
    /** Como aparece na tela. O nome completo nao cabe num cartao de escolha. */
    nomeExibicao: "João Vitor Mandu",
    primeiroNome: "João Vitor",
    cargo: "Fundador e proprietário",
    desde: null,
    agenda: true,
  },
  {
    nome: "Patrick Gonçalves de Oliveira",
    nomeExibicao: "Patrick Oliveira",
    primeiroNome: "Patrick",
    cargo: "Barbeiro",
    desde: "2022-05",
    agenda: true,
  },
  {
    nome: "Maria Mandu",
    nomeExibicao: "Maria Mandu",
    primeiroNome: "Maria",
    cargo: "Recepção e atendimento",
    desde: "2024-10",
    agenda: false,
  },
] as const;

/**
 * Posicionamento — extraido das pecas que a marca ja publica, nao inventado.
 */
export const MARCA = {
  /**
   * Slogan usado nas redes. La aparece "Embu Guaçu" sem hifen; no site usamos a
   * grafia oficial do municipio, a mesma do endereco, para o texto nao brigar
   * com o rodape.
   */
  slogan: "A primeira barbearia por assinatura de Embu-Guaçu",
  /** Vocabulario proprio da marca (hashtags fixas dos posts). */
  temas: [
    "visagismo",
    "barboterapia",
    "cortes",
    "estética",
    "cuidados",
    "compromisso",
  ],
} as const;

// ---------------------------------------------------------------------------
// PENDENCIAS — o que precisa ser confirmado com o cliente antes do lancamento
// ---------------------------------------------------------------------------

/**
 * Cada item aqui vira um marcador visivel na tela (<AConfirmar />), em vez de
 * um valor de mentira. Quando o cliente confirmar, o caminho e sempre o mesmo:
 * preencher o dado de verdade e apagar a linha desta lista.
 *
 * O booleano `pendente` existe para o dia do lancamento: vira false, o marcador
 * some da pagina e nada mais precisa ser cacado no codigo.
 */
export type Pendencia = {
  pendente: boolean;
  /** O que perguntar ao cliente, na lingua dele. */
  pergunta: string;
};

export const PENDENCIAS = {
  /** [A DEFINIR] Valores e regras dos planos de assinatura. */
  planos: {
    pendente: true,
    pergunta:
      "Quais sao os planos, o preco mensal de cada um e o que entra em cada plano?",
  },

  /**
   * [A DEFINIR] Regra publica conhecida: "as assinaturas funcionam somente em
   * dias especificos da semana". Falta saber QUAIS dias — e isso muda a regra
   * de negocio do agendamento com credito, nao so o texto.
   */
  diasDaAssinatura: {
    pendente: true,
    pergunta:
      "Em quais dias da semana o assinante pode usar os creditos do plano?",
  },

  /** [A DEFINIR] Horario de funcionamento oficial, dia a dia. */
  horarios: {
    pendente: true,
    pergunta: "Qual o horario de funcionamento de cada dia da semana?",
  },

  /** [A DEFINIR] Cardapio completo com precos e duracoes. */
  servicos: {
    pendente: true,
    pergunta:
      "Qual a lista completa de servicos, com preco e duracao de cada um?",
  },

  /** [A DEFINIR] Fotos em alta do espaco e da equipe. Ver public/gallery/. */
  fotos: {
    pendente: true,
    pergunta:
      "Fotos em alta resolucao do espaco, da equipe e de trabalhos concluidos.",
  },

  /**
   * [A DEFINIR] A historia do "como tudo comecou" que o João Vitor conta em
   * video no Instagram. E o melhor material da marca e nao esta escrito em
   * lugar nenhum que se possa citar.
   */
  historiaFundador: {
    pendente: true,
    pergunta:
      "Podemos transcrever a historia de como a barbearia comecou, para virar texto do site?",
  },

  /** [A DEFINIR] Uma linha de apresentacao de cada pessoa da equipe. */
  apresentacaoEquipe: {
    pendente: true,
    pergunta:
      "Como cada um da equipe quer ser apresentado? Uma frase sobre o que faz melhor.",
  },

  /** [A DEFINIR] Depoimentos reais. Ate la a home nao inventa nenhum. */
  depoimentos: {
    pendente: true,
    pergunta: "Podemos publicar depoimentos de clientes? Quais, e com que nome?",
  },

  /** [A DEFINIR] Qual dos dois fixos recebe WhatsApp, ou se ha um celular. */
  whatsapp: {
    pendente: true,
    pergunta: "Qual numero atende no WhatsApp?",
  },

  /**
   * [A DEFINIR] A Maria e recepcionista, e o sistema so tem CLIENT, BARBER e
   * OWNER. Para ela mexer na agenda sem virar "profissional" (o que a colocaria
   * no fluxo de agendamento) o sistema precisa de um cargo novo — e isso e
   * mudanca de banco e de permissao, nao de texto.
   */
  cargoRecepcao: {
    pendente: true,
    pergunta:
      "A recepcao precisa acessar o painel? Se sim, criamos o cargo Recepcao com acesso so a agenda e clientes.",
  },
} satisfies Record<string, Pendencia>;

/** Ha alguma pendencia aberta? Liga o aviso de conteudo em homologacao. */
export const TEM_PENDENCIA = Object.values(PENDENCIAS).some((p) => p.pendente);

// ---------------------------------------------------------------------------
// Derivados
// ---------------------------------------------------------------------------

export function enderecoCompleto(): string {
  const { logradouro, bairro, cidade, uf, cep } = EMPRESA.endereco;
  return `${logradouro} - ${bairro}, ${cidade}/${uf} - CEP ${cep}`;
}

/**
 * Link de busca no Maps montado a partir do endereco confirmado. Nao e um dado
 * inventado: e a propria rua virando consulta.
 */
export function urlMaps(): string {
  const { logradouro, bairro, cidade, uf, cep } = EMPRESA.endereco;
  const busca = `${logradouro} - ${bairro}, ${cidade} - ${uf}, ${cep}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(busca)}`;
}

/** Anos completos de casa, para a copy nao ficar desatualizada sozinha. */
export function anosDeCasa(hoje = new Date()): number {
  const abertura = new Date(EMPRESA.ativaDesde);
  let anos = hoje.getFullYear() - abertura.getFullYear();
  const mes = hoje.getMonth() - abertura.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < abertura.getDate())) anos -= 1;
  return Math.max(0, anos);
}
