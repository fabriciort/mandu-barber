import type { Metadata } from "next";
import Link from "next/link";
import { Check, Crown, Sparkles, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { SubscribeButton } from "./subscribe-button";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { getActiveSubscription } from "@/server/services/subscriptions";
import { formatMoney, pluralize } from "@/lib/format";
import { planSavings } from "@/lib/pricing";
import { AConfirmar, AConfirmarNoEscuro } from "@/components/a-confirmar";
import { PENDENCIAS } from "@/content/mr-mandu";
import { formatDuration } from "@/lib/time";

export const metadata: Metadata = {
  title: "Planos de assinatura",
  description:
    "Assine a mr. mandu: franquia mensal de cortes e barbas, desconto no cardápio e prioridade na agenda.",
};

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await getCurrentUser();
  const [plans, subscription] = await Promise.all([
    prisma.plan.findMany({
      where: { active: true },
      include: {
        benefits: {
          include: { service: { select: { name: true, priceCents: true, durationMinutes: true } } },
        },
        _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { displayOrder: "asc" },
    }),
    user ? getActiveSubscription(user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-2xs font-semibold uppercase tracking-[0.28em] text-[var(--text-muted)]">
          Assinatura
        </p>
        <h1 className="mt-4 text-balance font-display text-[2.75rem] leading-[1.05] sm:text-6xl">
          O clube que começou em Embu-Guaçu
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-pretty text-lg leading-relaxed text-[var(--text-secondary)]">
          A Mr. Mandu foi a primeira barbearia por assinatura da cidade: você paga por mês e a
          cadeira fica guardada. Escolha a franquia que combina com sua rotina.
        </p>

        {/* TODO [A DEFINIR] PENDENCIAS.diasDaAssinatura — a regra ja e
            divulgada publicamente pela marca ("as assinaturas funcionam somente
            em dias especificos da semana"), mas NAO esta implementada: hoje o
            credito e aceito em qualquer dia do agendamento. Quando os dias
            vierem, mexe em src/server/services/subscription.ts, nao so aqui. */}
        {PENDENCIAS.planos.pendente || PENDENCIAS.diasDaAssinatura.pendente ? (
          <div className="mx-auto mt-6 max-w-lg space-y-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] p-4 text-left">
            {PENDENCIAS.planos.pendente ? (
              <div>
                <AConfirmar o={PENDENCIAS.planos}>planos</AConfirmar>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Os planos abaixo são uma <strong className="font-medium">proposta</strong>: nomes,
                  valores e vantagens ainda serão fechados com a barbearia. Nada aqui vale como
                  oferta.
                </p>
              </div>
            ) : null}
            {PENDENCIAS.diasDaAssinatura.pendente ? (
              <div>
                <AConfirmar o={PENDENCIAS.diasDaAssinatura}>dias de uso</AConfirmar>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                  O crédito da assinatura vale em dias específicos da semana. Estamos confirmando
                  quais para publicar aqui — pergunte na loja antes de assinar.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {subscription ? (
        <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-[var(--surface-inverse)] px-5 py-4 text-[var(--text-inverse)]">
          <p className="text-sm">
            Você já assina o <strong className="font-semibold">{subscription.planName}</strong>.
          </p>
          <Button asChild size="sm" variant="inverse">
            <Link href="/minha-conta/plano">Gerenciar meu plano</Link>
          </Button>
        </div>
      ) : null}

      <div className="stagger mt-14 grid items-start gap-5 lg:grid-cols-3">
        {plans.map((plan, planIndex) => {
          const perks = parseList(plan.perks);
          const savings = planSavings(
            plan.priceCents,
            plan.benefits.map((b) => ({
              quantityPerCycle: b.quantityPerCycle,
              priceCents: b.service.priceCents,
            })),
          );
          const isCurrent = subscription?.planId === plan.id;

          // O destaque no monocromatico e o bloco invertido: preto no tema
          // claro, branco no escuro. Chama mais atencao que qualquer borda
          // colorida e nao depende de matiz para funcionar.
          const featured = plan.highlight;

          return (
            <Card
              key={plan.id}
              id={plan.slug}
              style={{ "--i": planIndex } as React.CSSProperties}
              className={cn(
                "relative flex scroll-mt-24 flex-col p-6 sm:p-7",
                featured
                  ? "border-transparent bg-[var(--surface-inverse)] text-[var(--text-inverse)] shadow-[var(--shadow-xl)] lg:-my-4 lg:py-11"
                  : "",
              )}
            >
              {/* Altura minima no cabecalho para que a linha do preco caia na
                  mesma altura nos tres cartoes, mesmo com chamadas de tamanhos
                  diferentes — desalinhado, o olho le como tres pecas soltas. */}
              <div className="flex items-start justify-between gap-3 lg:min-h-[5.25rem]">
                <div className="min-w-0">
                  <h2 className="font-display text-[1.75rem] leading-none">{plan.name}</h2>
                  {plan.tagline ? (
                    <p
                      className={cn(
                        "mt-2 text-pretty text-sm",
                        featured ? "opacity-65" : "text-[var(--text-muted)]",
                      )}
                    >
                      {plan.tagline}
                    </p>
                  ) : null}
                </div>

                {featured ? (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-current/40 px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.14em]">
                    <Crown className="size-3" aria-hidden />
                    Mais assinado
                  </span>
                ) : isCurrent ? (
                  <Badge tone="solid" className="shrink-0">
                    Seu plano
                  </Badge>
                ) : null}
              </div>

              <div className="mt-7">
                {/* TODO [A DEFINIR] PENDENCIAS.planos — NADA neste cartao esta
                    confirmado: nem a mensalidade, nem o nome do plano, nem as
                    vantagens. Esconder so o preco seria pior do que nao
                    esconder nada — deixaria "bebida cortesia em todo
                    atendimento" passando por promessa da casa. Por isso o
                    marcador fala do plano inteiro. */}
                {PENDENCIAS.planos.pendente ? (
                  featured ? (
                    <AConfirmarNoEscuro o={PENDENCIAS.planos}>
                      proposta — plano e valor a confirmar
                    </AConfirmarNoEscuro>
                  ) : (
                    <AConfirmar o={PENDENCIAS.planos}>
                      proposta — plano e valor a confirmar
                    </AConfirmar>
                  )
                ) : (
                  <p className="flex items-baseline gap-1.5">
                    <span className="tnum font-display text-5xl leading-none">
                      {formatMoney(plan.priceCents)}
                    </span>
                    <span className={cn("text-sm", featured ? "opacity-60" : "text-[var(--text-muted)]")}>
                      /{plan.intervalMonths === 1 ? "mês" : `${plan.intervalMonths} meses`}
                    </span>
                  </p>
                )}
                {!PENDENCIAS.planos.pendente && !PENDENCIAS.servicos.pendente && savings.savingsCents > 0 ? (
                  // O filete alinha com a PRIMEIRA linha do texto; centralizado
                  // ele escorrega para o meio quando a frase quebra em duas.
                  <p className="mt-3 flex gap-2 text-sm font-medium">
                    <span
                      className="mt-[0.55em] h-px w-4 shrink-0 bg-current opacity-40"
                      aria-hidden
                    />
                    <span className="text-pretty">
                      Economia de {formatMoney(savings.savingsCents)} vs. avulso
                      {savings.hasUnlimited ? " (uso médio)" : ""}
                    </span>
                  </p>
                ) : null}
              </div>

              {plan.benefits.length > 0 ? (
                <div
                  className={cn(
                    "mt-7 rounded-[var(--radius-lg)] p-4",
                    featured ? "bg-white/8 dark:bg-black/10" : "bg-[var(--surface-muted)]",
                  )}
                >
                  <p
                    className={cn(
                      "text-2xs font-semibold uppercase tracking-[0.16em]",
                      featured ? "opacity-60" : "text-[var(--text-muted)]",
                    )}
                  >
                    Franquia mensal
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {plan.benefits.map((benefit) => (
                      <li
                        key={benefit.id}
                        className="flex items-baseline gap-2 text-sm"
                      >
                        <span className="shrink-0">{benefit.service.name}</span>
                        {/* Linha pontilhada ligando nome e quantidade: leitura de
                            cardapio, e o olho nao se perde entre as colunas. */}
                        <span
                          className="min-w-4 flex-1 translate-y-[-0.2em] border-b border-dashed border-current opacity-25"
                          aria-hidden
                        />
                        <span className="tnum shrink-0 font-semibold">
                          {benefit.quantityPerCycle < 0
                            ? "Ilimitado"
                            : `${benefit.quantityPerCycle}x`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className={cn("mt-3 text-xs", featured ? "opacity-55" : "text-[var(--text-muted)]")}>
                    Equivale a{" "}
                    {formatDuration(
                      plan.benefits.reduce(
                        (sum, b) =>
                          sum +
                          b.service.durationMinutes * Math.max(1, Math.abs(b.quantityPerCycle)),
                        0,
                      ),
                    )}{" "}
                    de cadeira por mês.
                  </p>
                </div>
              ) : null}

              <ul className="mt-6 flex-1 space-y-3">
                {perks.map((perk) => (
                  <li
                    key={perk}
                    className={cn(
                      "flex gap-2.5 text-sm leading-snug",
                      featured ? "opacity-85" : "text-[var(--text-secondary)]",
                    )}
                  >
                    <Check className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} aria-hidden />
                    {perk}
                  </li>
                ))}
              </ul>

              {/* TODO [A DEFINIR] Prova social so entra com assinante de
                  verdade. Enquanto os planos nao existirem de fato, "N
                  assinantes ativos" e a contagem da carga de demonstracao —
                  numero inventado no lugar mais persuasivo da pagina. */}
              {!PENDENCIAS.planos.pendente && plan._count.subscriptions > 0 ? (
                <p
                  className={cn(
                    "mt-6 flex items-center gap-1.5 text-xs",
                    featured ? "opacity-60" : "text-[var(--text-muted)]",
                  )}
                >
                  <Star className="size-3.5 fill-current" aria-hidden />
                  {pluralize(plan._count.subscriptions, "assinante ativo", "assinantes ativos")}
                </p>
              ) : null}

              <div className="mt-6">
                {isCurrent ? (
                  <Button asChild block size="lg" variant={featured ? "inverse" : "secondary"}>
                    <Link href="/minha-conta/plano">Gerenciar assinatura</Link>
                  </Button>
                ) : subscription ? (
                  <Button block size="lg" variant={featured ? "inverse" : "secondary"} disabled>
                    Você já tem um plano ativo
                  </Button>
                ) : (
                  <SubscribeButton
                    planId={plan.id}
                    planName={plan.name}
                    priceCents={plan.priceCents}
                    authenticated={Boolean(user)}
                    highlight={plan.highlight}
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ---------------------------------------------------------- duvidas
          Sanfona nativa (<details>): abre sem JavaScript, e no celular a lista
          fechada cabe inteira na tela em vez de virar um paredao de texto. */}
      <section className="mx-auto mt-24 max-w-3xl">
        <h2 className="text-balance text-center font-display text-[2rem] leading-tight sm:text-4xl">
          Perguntas que sempre aparecem
        </h2>

        {/* TODO [A DEFINIR] PENDENCIAS.planos — as respostas descrevem como o
            SISTEMA funciona (acumulo, desconto, cancelamento, devolucao de
            credito), o que e verdade sobre o software. O que depende de
            confirmacao e a configuracao de cada plano — quantos cortes, se
            acumula, qual desconto. O aviso deixa isso explicito em vez de
            deixar o leitor supor. */}
        {PENDENCIAS.planos.pendente ? (
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[var(--text-muted)]">
            As respostas explicam como a assinatura funciona no sistema. Os números de cada plano
            (quantos cortes, se acumula, qual desconto) entram quando a barbearia fechar a tabela.
          </p>
        ) : null}

        <div className="mt-10 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {FAQ.map((item) => (
            <details key={item.question} className="faq group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium transition-colors hover:text-[var(--text-secondary)]">
                <span className="text-pretty">{item.question}</span>
                <span
                  className="relative size-5 shrink-0 rounded-full border border-[var(--border-strong)] transition-transform duration-300 group-open:rotate-45"
                  aria-hidden
                >
                  <span className="absolute left-1/2 top-1/2 h-px w-2.5 -translate-x-1/2 -translate-y-1/2 bg-current" />
                  <span className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-current" />
                </span>
              </summary>
              <p className="pb-5 pr-9 text-pretty text-sm leading-relaxed text-[var(--text-secondary)]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <div className="grain relative mt-20 overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--surface-inverse)] px-6 py-14 text-center text-[var(--text-inverse)]">
        <Sparkles className="mx-auto size-6 opacity-70" aria-hidden />
        <h2 className="mt-5 text-balance font-display text-[2rem] leading-tight sm:text-4xl">
          Ainda na dúvida?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-pretty opacity-70">
          Marque um corte avulso primeiro. Se gostar, a assinatura fica esperando por você.
        </p>
        <Button asChild size="lg" variant="inverse" className="mt-7">
          <Link href="/agendar">Agendar um corte avulso</Link>
        </Button>
      </div>
    </div>
  );
}

const FAQ = [
  {
    question: "Se eu não usar todos os cortes do mês, perco?",
    answer:
      "Nos planos com acumulo, o que sobra vai para o mês seguinte até o limite indicado no plano. Nos demais, a franquia é renovada a cada ciclo — por isso vale escolher o plano do tamanho da sua rotina.",
  },
  {
    question: "Como funciona o desconto nos serviços fora da franquia?",
    answer:
      "Assim que a franquia acaba (ou se você escolhe um serviço que não está nela), o desconto do plano entra automaticamente no fechamento da conta. Você ve o valor final antes de confirmar o agendamento.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Pode. O cancelamento vale para o fim do ciclo vigente: você usa tudo o que já pagou e não há nova cobrança. Se mudar de ideia antes da virada, dá para reativar em um clique.",
  },
  {
    question: "E se eu precisar desmarcar um horário?",
    answer:
      "Cancelando dentro do prazo, o crédito volta para o seu saldo do ciclo na hora. Nada de crédito perdido por remarcar.",
  },
  {
    question: "Posso usar o plano com qualquer profissional?",
    answer:
      "Sim, com qualquer profissional habilitado no serviço. Alguns profissionais tem preço de tabela diferente, mas a franquia do plano cobre igual.",
  },
];

function parseList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
