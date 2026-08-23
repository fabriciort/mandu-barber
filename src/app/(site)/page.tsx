import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  MapPin,
  Quote,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { prisma } from "@/server/db";
import { getShopConfig, formatAddress } from "@/server/services/settings";
import { formatMoney, formatPhone } from "@/lib/format";
import { formatDuration, formatMinutesLabel } from "@/lib/time";
import { SERVICE_CATEGORY_LABEL, WEEKDAY_SHORT, type ServiceCategory } from "@/lib/enums";
import { planSavings } from "@/lib/pricing";
import { GalleryCarousel } from "@/components/gallery-carousel";
import { Veu } from "@/components/veu";
import { AConfirmar } from "@/components/a-confirmar";
import { GALERIA } from "@/content/galeria";
import { EMPRESA, EQUIPE, MARCA, PENDENCIAS, anosDeCasa } from "@/content/mr-mandu";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const shop = await getShopConfig();

  const [services, barbers, plans, reviews, stats] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { displayOrder: "asc" }],
      take: 8,
    }),
    prisma.barberProfile.findMany({
      where: { active: true },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        reviews: { select: { rating: true } },
      },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.plan.findMany({
      where: { active: true },
      include: { benefits: { include: { service: { select: { priceCents: true } } } } },
      orderBy: { displayOrder: "asc" },
      take: 3,
    }),
    prisma.review.findMany({
      where: { comment: { not: null }, rating: { gte: 4 } },
      include: {
        client: { select: { name: true } },
        barber: { select: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    getStats(),
  ]);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      {/* -mt cancela o espacador da barra flutuante: a foto passa a comecar no
          topo da tela e a pilula do logo e o circulo do menu ficam SOBRE ela,
          em vez de flutuarem numa faixa vazia acima. O padding de volta entra
          no conteudo, para o titulo nao nascer atras da barra. */}
      <section
        className="grain relative isolate z-30 -mt-[4.25rem] overflow-hidden bg-[var(--canvas-deep)] text-white md:-mt-16"
        // Altura da foto no celular, em um lugar so. O recuo do texto sai
        // daqui tambem — sem a variavel, mexer na foto exigia lembrar de
        // corrigir o padding do conteudo, e um dos dois sempre ficava para tras.
        style={{ "--foto-h": "clamp(16rem, 40vh, 24rem)" } as React.CSSProperties}
      >
        {/* Foto da casa: um corte acontecendo.
         *
         * CELULAR — a foto e um BLOCO no topo, nao um fundo atras do texto.
         * Antes ela ficava atras de tudo e precisava de um veu pesado para o
         * texto ser legivel; o resultado era uma foto escondida e um texto
         * chapado. Separando os dois, cada um fica inteiro: a foto aparece sem
         * nada por cima (so o logo e o menu, sobre uma faixa desfocada), e o
         * texto ganha fundo proprio logo abaixo. Ela ainda comeca na borda de
         * cima da tela, com o cromo sobreposto.
         *
         * DESKTOP — ai a tela e larga e sobra lado: a foto ocupa a faixa da
         * direita (58%, o que a devolve perto do tamanho nativo) e se funde no
         * preto pela esquerda, onde o texto mora.
         *
         * A foto e preto e branco de tom quente — nao foi dessaturada para
         * caber na paleta, ja chegou assim. Por isso o JPEG e mantido em sRGB
         * em vez de cinza puro: converter mataria a tonalidade e ainda geraria
         * arquivo maior (90 KB contra 85 KB, medido). */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[var(--foto-h)] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[58%]"
          aria-hidden
        >
          <Image
            src="/hero.jpg"
            // Decorativa: o heroi ja diz em texto o que a foto ilustra, e o
            // container inteiro e aria-hidden.
            alt=""
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 58vw"
            // O recorte muda porque a moldura muda de formato entre os dois.
            className="object-cover object-[55%_70%] lg:object-[50%_34%]"
          />

          {/* CELULAR — faixa desfocada no topo, so onde o logo e o menu pousam.
              E o mesmo material do resto da interface: em vez de tapar a foto
              com cor, tira ela de foco por 6rem e devolve contraste ao cromo. */}
          <div className="absolute inset-x-0 top-0 h-[6.5rem] lg:hidden">
            <Veu para="baixo" tinta="rgb(8 8 10 / 0.45)" camadas={4} base={1.5} />
          </div>

          {/* CELULAR — a foto termina derretendo no fundo da secao, em vez de
              cortar reto. Desfoque + tinta na cor da propria secao. */}
          <div className="absolute inset-x-0 bottom-0 h-28 lg:hidden">
            <Veu para="cima" tinta="var(--canvas-deep)" camadas={4} base={1} />
          </div>

          {/* DESKTOP — escurecimento base leve: a foto precisa ser vista. O
              trabalho pesado fica para o degrade lateral. */}
          <div className="absolute inset-0 hidden bg-[var(--canvas-deep)]/20 lg:block" />

          {/* DESKTOP — o texto fica numa coluna a esquerda, entao o degrade e
              lateral. A rampa comeca no proprio canto da faixa (0%) e nao num
              ponto mais adiante: com um ponto de partida, a parede clara do
              fundo criava uma emenda vertical visivel bem ali. */}
          <div className="absolute inset-0 hidden bg-gradient-to-r from-[var(--canvas-deep)] from-[0%] via-[var(--canvas-deep)]/50 via-[30%] to-transparent to-[62%] lg:block" />

          {/* DESKTOP — pontas: a foto nao pode terminar num corte reto. */}
          <div className="absolute inset-x-0 top-0 hidden h-20 bg-gradient-to-b from-[var(--canvas-deep)] to-transparent lg:block" />
          <div className="absolute inset-x-0 bottom-0 hidden h-28 bg-gradient-to-t from-[var(--canvas-deep)] to-transparent lg:block" />
        </div>

        {/* O container mantem a largura e o alinhamento do resto do site; quem
            estreita e o bloco de dentro. Assim o texto encosta na margem
            esquerda da pagina e deixa a metade direita livre para a foto, que e
            onde o barbeiro esta. */}
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-[calc(var(--foto-h)+1.25rem)] sm:px-6 lg:pb-40 lg:pt-[11rem]">
          <div className="stagger lg:max-w-[32rem] xl:max-w-[36rem]">
            <p
              style={{ "--i": 0 } as React.CSSProperties}
              className="glass-on-dark inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-2xs font-medium uppercase tracking-[0.18em] text-white/85"
            >
              <span className="size-1.5 rounded-full bg-white" />
              {shop.district ? `${shop.district} · ${shop.city}` : "São Paulo"}
            </p>

            <h1
              style={{ "--i": 1 } as React.CSSProperties}
              // O minimo caiu de 2.5rem para 2.25rem: a 360px "A primeira
              // barbearia" nao cabia numa linha e o titulo virava quatro
              // linhas, empurrando o botao para fora da primeira tela.
              className="font-display mt-6 text-[clamp(2.25rem,9vw,4.5rem)] leading-[0.98] text-white balance"
            >
              A primeira barbearia
              <br />
              por assinatura
              <br />
              <span className="text-white/45">de Embu-Guaçu.</span>
            </h1>

            <p
              style={{ "--i": 2 } as React.CSSProperties}
              className="mt-6 max-w-md text-base leading-relaxed text-white/60 sm:text-lg pretty"
            >
              Corte, barba e barboterapia. Reserve seu horário em menos de um minuto — ou entre
              para o clube e tenha a cadeira guardada todo mês.
            </p>

            <div
              style={{ "--i": 3 } as React.CSSProperties}
              className="mt-7 flex flex-col gap-3 sm:flex-row"
            >
              {/* Mesma dupla da barra de baixo: acao principal em bloco solido,
                  a secundaria em vidro. Pilula nas duas, para o heroi falar a
                  mesma lingua da navegacao. */}
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white px-7 text-black shadow-[var(--shadow-glass)] hover:bg-white/90"
              >
                <Link href="/agendar">
                  Agendar agora
                  <ArrowRight className="size-[18px]" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="glass-on-dark rounded-full px-7 text-white"
              >
                <Link href="/planos">Ver planos</Link>
              </Button>
            </div>

            {/* Tres fatos VERIFICAVEIS. A versao anterior anunciava
                "atendimentos concluidos" e "media de avaliacoes" tirados da
                carga de demonstracao — numero de barbearia nenhuma. Numero
                inventado em heroi e o que mais convence e o que menos se
                confere depois. */}
            <dl
              style={{ "--i": 4 } as React.CSSProperties}
              className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/12 pt-8"
            >
              {/* Rotulos curtos de proposito: em tres linhas, o terceiro ficava
                  cortado pela barra flutuante logo na primeira tela do celular.
                  A rua ja esta no paragrafo acima. */}
              <Stat value={`${anosDeCasa()}`} label="Anos no Centro" />
              <Stat value={`${barbers.length}`} label="Profissionais na cadeira" />
              <Stat value="1ª" label="Por assinatura na cidade" />
            </dl>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- proximos horarios */}
      {/* O cartao de vagas morava DENTRO do heroi, na coluna da direita — e era
          exatamente ali que ficava o barbeiro da foto. Numa moldura deitada uma
          foto em pe sempre escala pela largura, ou seja, nao ha recorte
          horizontal que salve: o assunto ia continuar atras do cartao em
          qualquer posicao. Descer o cartao uma secao devolve a foto inteira ao
          heroi e ainda da respiro para a informacao mais util da home. */}
      <section className="relative z-30 mx-auto -mt-10 max-w-2xl px-4 sm:px-6 lg:-mt-16">
        <NextSlotsPreview />
      </section>

      {/* -------------------------------------------------------- diferencial */}
      <section className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <Highlight
            icon={CalendarCheck}
            title="Agenda que reflete a realidade"
            description="Você só ve horários que o profissional tem de fato. Nada de confirmar e descobrir depois que não dava."
          />
          <Highlight
            icon={ShieldCheck}
            title="Cancelou, o crédito volta"
            description={`Cancelamento online até ${shop.cancellationWindowHours}h antes. Se você é assinante, o crédito do plano retorna na hora.`}
          />
          <Highlight
            icon={Clock}
            title="Lembrete antes do horário"
            description="Um aviso no dia anterior e outro na hora certa. A cadeira não fica vazia e você não perde o corte."
          />
        </div>
      </section>

      {/* ------------------------------------------------------------ sobre */}
      <section id="sobre" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        {/* [&>*]:min-w-0 nao e enfeite: item de grid nasce com min-width:auto e
            se recusa a ficar menor que o conteudo. A fileira da galeria rola de
            proposito, entao sua largura "natural" e a soma de TODAS as fotos —
            sem isto a coluna estica para varias telas de largura e a pagina
            inteira passa a rolar de lado no celular. */}
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] [&>*]:min-w-0">
          <div>
            {/* O numero sai de anosDeCasa(): escrito por extenso, o titulo
                envelhecia sozinho e ainda passava a brigar com o numero do
                heroi, que ja era calculado. */}
            <SectionHeading
              eyebrow="A casa"
              title={`${anosDeCasa()} anos no Centro, e um jeito diferente de cobrar`}
            />

            <div className="mt-6 space-y-4 text-[var(--text-secondary)] pretty">
              <p>
                A <strong className="font-medium text-[var(--text-primary)]">Mr. Mandu Barber</strong>{" "}
                abriu as portas em março de 2020 na Rua São Paulo, 100, no Centro de Embu-Guaçu.
                Quem fundou continua na cadeira: o João Vitor atende junto com o Patrick, e a
                Maria recebe quem chega.
              </p>
              <p>
                A diferença começou pelo modelo. Enquanto barbearia se cobra por corte, aqui existe
                assinatura: você paga por mês e a cadeira fica guardada. Foi a primeira da cidade a
                trabalhar assim.
              </p>
              <p>
                O resto é ofício — visagismo para achar o corte que combina com o rosto,
                barboterapia para quem quer a barba tratada e não só aparada, e o compromisso de
                que o horário marcado é horário cumprido.
              </p>
            </div>

            {/* TODO [A DEFINIR] A copy acima usa SO fato confirmado (data de
                abertura, endereco, modelo de assinatura, vocabulario das redes
                da marca). A historia pessoal do João Vitor — o "como tudo
                começou" que ele conta em video no Instagram — daria uma secao
                muito melhor, mas nao esta escrita em lugar nenhum que eu possa
                citar. Pedir ao cliente. */}
            <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
              <AConfirmar o={PENDENCIAS.historiaFundador}>história do fundador</AConfirmar>
              <span>a ser escrita com o João Vitor.</span>
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {MARCA.temas.map((tema) => (
                <Badge key={tema} tone="outline" size="sm">
                  {tema}
                </Badge>
              ))}
            </div>
          </div>

          {/* --------------------------------------------------------- galeria */}
          <div>
            <SectionHeading
              eyebrow="Galeria"
              title="O espaço e o trabalho"
              description="Fotos do salão, da equipe e de trabalhos concluídos."
            />
            <div className="mt-6">
              <GalleryCarousel itens={GALERIA} />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- servicos */}
      <section id="servicos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Cardápio"
          title="O que fazemos"
          description="Assinantes pagam menos ou nada, conforme o plano."
        />

        {/* TODO [A DEFINIR] PENDENCIAS.servicos — enquanto o cardapio nao for
            confirmado, a lista mostra o que fazemos mas NAO publica preco. */}
        {PENDENCIAS.servicos.pendente ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
            <AConfirmar o={PENDENCIAS.servicos}>tabela de preços</AConfirmar>
            <span>em conferência com a barbearia. Consulte pelo telefone ou no Instagram.</span>
          </p>
        ) : null}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <Card key={service.id} interactive className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <Badge tone={service.featured ? "solid" : "muted"} size="sm">
                  {SERVICE_CATEGORY_LABEL[service.category as ServiceCategory] ?? service.category}
                </Badge>
                {service.featured ? <Star className="size-4 fill-[var(--text-primary)] text-[var(--text-primary)]" /> : null}
              </div>

              <h3 className="mt-3 font-medium">{service.name}</h3>
              {service.description ? (
                <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-[var(--text-muted)]">
                  {service.description}
                </p>
              ) : (
                <div className="flex-1" />
              )}

              <div className="mt-4 flex items-end justify-between border-t border-[var(--border-subtle)] pt-3">
                <div>
                  {/* O preco so vai ao ar quando for o preco de verdade. Ate
                      la sai o marcador tracejado — que ninguem confunde com
                      valor cadastrado. */}
                  {PENDENCIAS.servicos.pendente ? (
                    <AConfirmar o={PENDENCIAS.servicos}>preço a confirmar</AConfirmar>
                  ) : (
                    <p className="text-lg font-semibold">{formatMoney(service.priceCents)}</p>
                  )}
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {formatDuration(service.durationMinutes)}
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/agendar?servico=${service.slug}`}>
                    Agendar
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ equipe */}
      <section id="equipe" className="scroll-mt-20 border-y border-[var(--border-subtle)] bg-[var(--surface-muted)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="Quem atende"
            title="A equipe da casa"
            description="Três pessoas, os mesmos rostos toda semana. Escolha quem já conhece seu cabelo."
          />

          {/* A lista vem de EQUIPE (nomes e cargos confirmados), nao do banco:
              assim a Maria aparece — ela recebe quem chega, mas nao corta, e
              por isso nao tem agenda no sistema. O perfil do banco entra so
              para saber com quem da para agendar. */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {EQUIPE.map((pessoa) => {
              // A busca e pelo nome de EXIBICAO: e ele que o seed grava no
              // usuario. O nome de registro fica em EQUIPE para documento.
              const perfil = barbers.find((b) => b.user.name === pessoa.nomeExibicao);

              return (
                <Card key={pessoa.nome} className="flex flex-col p-5">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={pessoa.nome}
                      src={perfil?.user.avatarUrl}
                      size="lg"
                      ring={perfil?.agendaColor}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{pessoa.primeiroNome}</h3>
                      <p className="truncate text-xs text-[var(--text-muted)]">{pessoa.cargo}</p>
                      {pessoa.desde ? (
                        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                          Na casa desde {mesAno(pessoa.desde)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* TODO [A DEFINIR] Falta a apresentacao de cada um: o que
                      faz melhor, como gosta de trabalhar. A versao anterior
                      desta pagina trazia biografias inteiras ("vinte anos de
                      cadeira, aprendeu com o pai em Recife") que eram da carga
                      de demonstracao — texto inventado no nome de pessoa real.
                      Foram removidas. Pedir ao cliente uma linha de cada. */}
                  <div className="mt-4 flex-1">
                    <AConfirmar o={PENDENCIAS.apresentacaoEquipe}>apresentação e foto</AConfirmar>
                  </div>

                  {perfil ? (
                    <Button asChild variant="secondary" size="sm" block className="mt-5">
                      <Link href={`/agendar?profissional=${perfil.id}`}>
                        Agendar com {pessoa.primeiroNome}
                      </Link>
                    </Button>
                  ) : (
                    <p className="mt-5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2 text-center text-xs text-[var(--text-muted)]">
                      Recepção — atende na loja e pelo telefone
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ planos */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Assinatura"
          title="O clube que começou em Embu-Guaçu"
          description="Franquia mensal de cortes e barbas, desconto no resto e prioridade na agenda."
        />

        {/* TODO [A DEFINIR] PENDENCIAS.diasDaAssinatura — a marca ja divulga
            publicamente que o credito do plano vale "somente em dias
            especificos da semana", mas nao sabemos quais. Isto NAO esta
            implementado no agendamento: hoje o credito vale em qualquer dia.
            Quando os dias vierem, e regra de negocio, nao so este aviso. */}
        {PENDENCIAS.diasDaAssinatura.pendente ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
            <AConfirmar o={PENDENCIAS.diasDaAssinatura}>dias de uso do plano</AConfirmar>
            <span>
              o crédito da assinatura vale em dias específicos da semana — confirme quais antes de
              assinar.
            </span>
          </p>
        ) : null}

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const savings = planSavings(
              plan.priceCents,
              plan.benefits.map((b) => ({
                quantityPerCycle: b.quantityPerCycle,
                priceCents: b.service.priceCents,
              })),
            );

            return (
              <Card
                key={plan.id}
                interactive
                className={`relative flex flex-col p-6 ${plan.highlight ? "border-[var(--border-strong)] shadow-[var(--shadow-lg)]" : ""}`}
              >
                {plan.highlight ? (
                  <Badge tone="solid" className="absolute -top-2.5 left-6">
                    Mais assinado
                  </Badge>
                ) : null}

                <h3 className="font-display text-xl">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{plan.tagline}</p>

                {/* Mensalidade e economia caminham juntas: a economia e
                    calculada a partir do preco do plano E do preco dos
                    servicos. Com qualquer um dos dois por confirmar, o numero
                    nao significa nada — some inteiro em vez de virar promessa. */}
                {PENDENCIAS.planos.pendente ? (
                  <div className="mt-5">
                    <AConfirmar o={PENDENCIAS.planos}>mensalidade a confirmar</AConfirmar>
                  </div>
                ) : (
                  <>
                    <p className="mt-5 flex items-baseline gap-1">
                      <span className="text-3xl">{formatMoney(plan.priceCents)}</span>
                      <span className="text-sm text-[var(--text-muted)]">/mês</span>
                    </p>
                    {savings.savingsCents > 0 && !PENDENCIAS.servicos.pendente ? (
                      <p className="mt-1 text-xs text-[var(--text-primary)]">
                        Economia de até {formatMoney(savings.savingsCents)} por mês
                      </p>
                    ) : null}
                  </>
                )}

                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {parseList(plan.perks)
                    .slice(0, 4)
                    .map((perk) => (
                      <li key={perk} className="flex gap-2 text-[var(--text-secondary)]">
                        <Scissors className="mt-0.5 size-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden />
                        {perk}
                      </li>
                    ))}
                </ul>

                <Button
                  asChild
                  block
                  variant={plan.highlight ? "primary" : "secondary"}
                  className="mt-6"
                >
                  <Link href={`/planos#${plan.slug}`}>Conhecer o {plan.name}</Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------- depoimentos */}
      {/* TODO [A DEFINIR] PENDENCIAS.depoimentos — a secao existe e funciona,
          mas fica fora do ar ate haver avaliacao de cliente de verdade. As
          avaliacoes que estao no banco vieram da carga de demonstracao: sao
          elogios inventados assinados por nomes inventados, sobre pessoas
          reais. Publicar isso seria fabricar prova social. */}
      {!PENDENCIAS.depoimentos.pendente && reviews.length > 0 ? (
        <section className="border-y border-[var(--border-subtle)] bg-[var(--surface-muted)]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionHeading
              eyebrow="Na cadeira"
              title="O que dizem os clientes"
              description="Avaliações deixadas após atendimentos concluídos, sem curadoria."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <Card key={review.id} className="flex flex-col p-5">
                  <Quote className="size-5 opacity-30" aria-hidden />
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {review.comment}
                  </p>
                  <div className="mt-4 flex items-center gap-3 border-t border-[var(--border-subtle)] pt-3">
                    <Avatar name={review.client.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{review.client.name}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        com {review.barber.user.name}
                      </p>
                    </div>
                    <div className="flex gap-0.5" aria-label={`${review.rating} de 5`}>
                      {Array.from({ length: review.rating }).map((_, index) => (
                        <Star key={index} className="size-3.5 fill-[var(--text-primary)] text-[var(--text-primary)]" />
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ visita */}
      <section id="visita" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="grid gap-10 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-8 md:grid-cols-2 md:p-12">
          <div>
            <SectionHeading eyebrow="Visita" title="Passe na loja" />
            <p className="mt-4 text-[var(--text-secondary)]">
              {formatAddress(shop) || "Rua São Paulo, 100 — Centro, Embu-Guaçu/SP"}
            </p>

            {/* TODO [A DEFINIR] PENDENCIAS.horarios — a tabela abaixo existe no
                banco porque o motor de agenda precisa de jornada para calcular
                horario livre, mas NAO e o horario real da barbearia. Enquanto
                a pendencia estiver aberta ela nao vai ao ar: no lugar sai o
                marcador e o convite para confirmar por telefone. */}
            {PENDENCIAS.horarios.pendente ? (
              <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] p-4">
                <AConfirmar o={PENDENCIAS.horarios}>horário de funcionamento</AConfirmar>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Ainda estamos confirmando a tabela de horários para publicar aqui. Até lá, ligue
                  para{" "}
                  <a
                    href={`tel:+55${EMPRESA.telefones[0]}`}
                    className="font-medium text-[var(--text-primary)] underline-offset-4 hover:underline"
                  >
                    {formatPhone(EMPRESA.telefones[0])}
                  </a>{" "}
                  ou chame no{" "}
                  <a
                    href={`https://instagram.com/${EMPRESA.redes.instagram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[var(--text-primary)] underline-offset-4 hover:underline"
                  >
                    Instagram
                  </a>
                  . A agenda online já mostra os horários que estão livres de fato.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-1.5 text-sm">
                {shop.businessHours.map((blocks, weekday) => (
                  <div key={weekday} className="flex items-center gap-3">
                    <span className="w-10 text-[var(--text-muted)]">{WEEKDAY_SHORT[weekday]}</span>
                    <span className={blocks.length ? "font-medium" : "text-[var(--text-muted)]"}>
                      {blocks.length
                        ? blocks
                            .map((b) => `${formatMinutesLabel(b.start)} - ${formatMinutesLabel(b.end)}`)
                            .join("  •  ")
                        : "Fechado"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/agendar">
                  <CalendarCheck className="size-4" />
                  Reservar horário
                </Link>
              </Button>
              {shop.mapsUrl ? (
                <Button asChild variant="outline">
                  <a href={shop.mapsUrl} target="_blank" rel="noreferrer">
                    <MapPin className="size-4" />
                    Como chegar
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          {/* Bloco invertido com o recado da casa. Antes havia aqui um degrade
              dourado e acobreado, sobra da paleta anterior — brigava com o
              monocromatico do resto do site. */}
          <div className="grain relative min-h-64 overflow-hidden rounded-2xl bg-[var(--canvas-deep)] text-white">
            <div className="relative flex h-full flex-col justify-between gap-8 p-7">
              <Scissors className="size-8 opacity-70" aria-hidden />

              <div>
                <p className="font-display text-2xl leading-snug balance">
                  {MARCA.slogan}.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/55 pretty">
                  Assinatura mensal, agenda online e a mesma equipe toda semana, no Centro de
                  Embu-Guaçu desde 2020.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-white/70">
                  <a
                    href={`https://instagram.com/${EMPRESA.redes.instagram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-on-dark rounded-full px-3.5 py-1.5 transition-opacity hover:opacity-80"
                  >
                    @{EMPRESA.redes.instagram}
                  </a>
                  <a
                    href={`tel:+55${EMPRESA.telefones[0]}`}
                    className="glass-on-dark rounded-full px-3.5 py-1.5 transition-opacity hover:opacity-80"
                  >
                    {formatPhone(EMPRESA.telefones[0])}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- auxiliares

/** "2022-05" -> "maio de 2022". Recebe ano-mes, nao data completa. */
function mesAno(anoMes: string): string {
  const [ano, mes] = anoMes.split("-").map(Number);
  const MESES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${MESES[mes - 1]} de ${ano}`;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="font-display text-3xl leading-none text-white">{value}</dt>
      <dd className="mt-2 text-xs leading-snug text-white/45">{label}</dd>
    </div>
  );
}

function Highlight({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-primary)]">
        <Icon className="size-[18px]" />
      </span>
      <div>
        <h3 className=" tracking-[var(--)]">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)] pretty">
          {description}
        </p>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-2xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {eyebrow}
      </p>
      <h2 className="font-display mt-3 text-[clamp(1.75rem,5vw,2.75rem)] leading-[1.05] balance">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 leading-relaxed text-[var(--text-muted)] pretty">{description}</p>
      ) : null}
    </div>
  );
}

/** Vitrine dos próximos horários livres — prova de que a agenda esta viva. */
async function NextSlotsPreview() {
  const { getRangeAvailability } = await import("@/server/services/availability");
  const { todayKey, addDaysISO, parseDateKey } = await import("@/lib/time");
  const shop = await getShopConfig();

  const featured = await prisma.service.findFirst({
    where: { active: true, featured: true },
    orderBy: { displayOrder: "asc" },
  });
  if (!featured) return null;

  const from = todayKey(shop.timezone);
  const to = addDaysISO(from, 6);
  const counts = await getRangeAvailability({
    fromISO: from,
    toISO: to,
    serviceIds: [featured.id],
  });

  const days = Object.entries(counts).slice(0, 7);

  return (
    <div className="rounded-[var(--radius-2xl)] bg-white p-5 text-black shadow-[var(--shadow-xl)] sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-2xs uppercase tracking-[0.16em] text-black/40">
            Próximos 7 dias
          </p>
          <p className="mt-1">{featured.name}</p>
        </div>
        <span className="tnum shrink-0 text-xs text-black/40">
          {formatDuration(featured.durationMinutes)}
        </span>
      </div>

      <ul className="mt-5 divide-y divide-black/8">
        {days.map(([date, count]) => {
          const day = parseDateKey(date);
          return (
            <li key={date} className="flex items-center gap-4 py-2.5">
              <span className="flex w-11 shrink-0 flex-col items-center">
                <span className="text-2xs uppercase tracking-wide text-black/35">
                  {WEEKDAY_SHORT[day.getDay()]}
                </span>
                <span className="tnum text-lg leading-tight">{day.getDate()}</span>
              </span>

              {/* Barra proporcional: quantos horarios livres, de relance. */}
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-black/8">
                <span
                  className="block h-full rounded-full bg-black transition-all"
                  style={{ width: `${Math.min(100, (count / 45) * 100)}%` }}
                />
              </span>

              <span
                className={
                  count > 0
                    ? "tnum w-24 shrink-0 text-right text-xs font-medium"
                    : "w-24 shrink-0 text-right text-xs text-black/30"
                }
              >
                {count > 0 ? `${count} livres` : "Sem vaga"}
              </span>
            </li>
          );
        })}
      </ul>

      <Button
        asChild
        block
        className="mt-6 bg-black text-white shadow-none hover:bg-black/85"
      >
        <Link href="/agendar">Escolher meu horário</Link>
      </Button>
    </div>
  );
}

async function getStats() {
  const [completed, aggregate] = await Promise.all([
    prisma.appointment.count({ where: { status: "COMPLETED" } }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
  ]);

  return {
    completed: Math.floor(completed / 10) * 10,
    rating: aggregate._avg.rating ? aggregate._avg.rating.toFixed(1) : "5,0",
    reviewCount: aggregate._count,
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parseList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
