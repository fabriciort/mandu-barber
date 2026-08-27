/**
 * Levar o horario para a agenda do cliente.
 *
 * Duas saidas, porque nao existe uma que sirva bem aos dois telefones:
 *
 *   Google Agenda — um link com o evento nos parametros. No Android, com o
 *   app instalado, o proprio sistema abre o app em vez do navegador.
 *
 *   .ics — o formato que o iPhone entende de nascenca: tocar no arquivo abre
 *   a folha "Adicionar evento" do Calendario, sem passar por login nenhum.
 *   Tambem serve Outlook e qualquer agenda de mesa.
 *
 * As duas saem do MESMO evento, montado uma vez so.
 */

export type EventoAgenda = {
  titulo: string;
  inicio: Date;
  fim: Date;
  descricao?: string;
  local?: string;
  /** Pagina do agendamento, para o cliente voltar do evento ao site. */
  url?: string;
  /** Identificador estavel — reagendar substitui o evento em vez de duplicar. */
  id?: string;
};

// ---------------------------------------------------------------------------
// Google Agenda
// ---------------------------------------------------------------------------

/** `2026-08-21T19:30:00Z` -> `20260821T193000Z`, que e o formato dos dois lados. */
function carimboUTC(data: Date): string {
  return data.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function linkGoogleAgenda(evento: EventoAgenda): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: evento.titulo,
    dates: `${carimboUTC(evento.inicio)}/${carimboUTC(evento.fim)}`,
  });

  // Descricao e local so entram se existirem: parametro vazio vira campo vazio
  // visivel no formulario do Google.
  const detalhes = [evento.descricao, evento.url].filter(Boolean).join("\n\n");
  if (detalhes) params.set("details", detalhes);
  if (evento.local) params.set("location", evento.local);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// .ics
// ---------------------------------------------------------------------------

/** Virgula, ponto e virgula, barra e quebra de linha tem significado no formato. */
function escapar(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Dobra a linha em 75 OCTETOS, como manda o RFC 5545 — nao em 75 caracteres.
 *
 * A diferenca importa em portugues: "ç", "ã" e "á" ocupam dois bytes cada. Se
 * a conta for por caractere, a linha estoura o limite; e se o corte cair no
 * meio de um caractere de dois bytes, o arquivo chega corrompido e a agenda
 * recusa o evento inteiro.
 */
function dobrar(linha: string): string {
  const bytes = Buffer.from(linha, "utf8");
  if (bytes.length <= 75) return linha;

  const partes: string[] = [];
  let inicio = 0;
  // A primeira linha cabe 75; as seguintes 74, porque levam um espaco na frente.
  let limite = 75;

  while (inicio < bytes.length) {
    let fim = Math.min(inicio + limite, bytes.length);
    // Recua ate o comeco de um caractere: 10xxxxxx e continuacao de UTF-8.
    while (fim < bytes.length && (bytes[fim] & 0xc0) === 0x80) fim -= 1;
    partes.push(bytes.subarray(inicio, fim).toString("utf8"));
    inicio = fim;
    limite = 74;
  }

  return partes.join("\r\n ");
}

export function montarICS(evento: EventoAgenda, agora = new Date()): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mr. Mandu Barber//Agendamento//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${evento.id ?? carimboUTC(evento.inicio)}@mr-mandu-barber`,
    `DTSTAMP:${carimboUTC(agora)}`,
    `DTSTART:${carimboUTC(evento.inicio)}`,
    `DTEND:${carimboUTC(evento.fim)}`,
    `SUMMARY:${escapar(evento.titulo)}`,
  ];

  if (evento.descricao) linhas.push(`DESCRIPTION:${escapar(evento.descricao)}`);
  if (evento.local) linhas.push(`LOCATION:${escapar(evento.local)}`);
  if (evento.url) linhas.push(`URL:${evento.url}`);

  linhas.push(
    "STATUS:CONFIRMED",
    // Um aviso duas horas antes, dentro do proprio evento. E independente do
    // lembrete que a barbearia manda: se o cliente silenciar um, ainda tem o
    // outro.
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT2H",
    `DESCRIPTION:${escapar(evento.titulo)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  );

  // CRLF e exigencia do formato, nao preferencia de estilo.
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}

/** Nome do arquivo baixado. Sem acento nem espaco, que viajam mal. */
export function nomeArquivoICS(codigo: string): string {
  return `mr-mandu-${codigo.toLowerCase().replace(/[^a-z0-9-]/g, "")}.ics`;
}
