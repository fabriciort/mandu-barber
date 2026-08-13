# Mandu Barber

Plataforma completa da barbearia Mandu Barber: agendamento do cliente, painel de
operação para a equipe, gestão para o dono e assinaturas de corte.

Três públicos, um sistema só:

| Quem | O que resolve |
| --- | --- |
| **Cliente** | Escolhe serviço, profissional e horário em quatro passos, vê o preço final antes de confirmar, acompanha o saldo do plano e avalia o atendimento. |
| **Profissional** | Abre a própria agenda do dia, faz check-in, fecha a conta com forma de pagamento, bloqueia horários e edita a própria jornada. |
| **Dono** | Acompanha faturamento, ocupação da cadeira, receita recorrente e repasse de comissão; administra catálogo, equipe, planos, assinaturas e as regras da agenda. |

---

## Começando

```bash
npm install
cp .env.example .env        # gere um AUTH_SECRET: openssl rand -base64 48
npm run setup               # prisma generate + db push + seed
npm run dev
```

Abra <http://localhost:3000>.

### Acessos de demonstração

O seed cria uma barbearia crível — 4 profissionais, 10 serviços, 3 planos, 17
clientes e 278 agendamentos entre histórico e futuro. Senha de todos: `mandu123`.

| Papel | E-mail |
| --- | --- |
| Gestor | `ricardo@mandubarber.com.br` |
| Profissional | `bruno@mandubarber.com.br` |
| Cliente (com plano ativo) | `cliente@mandubarber.com.br` |

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e execução em produção |
| `npm test` | Testes das regras de domínio (Vitest) |
| `npm run typecheck` | TypeScript em modo estrito |
| `npm run db:reset` | Recria o banco do zero e roda o seed |
| `npm run db:seed` | Só o seed |

---

## Decisões de arquitetura

**Next.js 15 (App Router) + React 19 + TypeScript estrito.** Server Components
para leitura, Server Actions para escrita. Não há camada de API para o próprio
front — a única rota HTTP é `/api/disponibilidade`, consumida pelo assistente de
agendamento, mais a rotina agendada.

**Prisma + SQLite por padrão.** Zero configuração para rodar. Para produção,
troque o `provider` em `prisma/schema.prisma` para `postgresql` e aponte a
`DATABASE_URL`: o schema não usa nada específico de SQLite. Os "enums" do domínio
são strings validadas por Zod (`src/lib/enums.ts`) justamente para essa migração
não exigir conversão de dados.

**Dinheiro em centavos.** Todo valor monetário é `Int`. Nenhum ponto flutuante
toca em preço, desconto ou comissão.

**Horários em UTC, exibição no fuso da loja.** O banco guarda instantes; a
conversão acontece só na borda (`src/lib/time.ts`). Jornadas de trabalho e
horário de funcionamento são inteiros em "minutos desde a meia-noite", o que
torna a matemática de disponibilidade exata e independente de fuso.

**Autenticação por sessão persistida.** JWT assinado (`jose`) em cookie
`httpOnly`, com uma linha em `Session` para permitir revogação real — trocar a
senha derruba os outros dispositivos.

---

## O motor de disponibilidade

É o coração do produto e mora em duas camadas:

1. **`src/lib/intervals.ts`** — álgebra de intervalos pura (união, subtração,
   interseção, geração de horários). Sem `Date`, sem banco, sem fuso. Coberta por
   testes.
2. **`src/server/services/availability.ts`** — busca o estado real da agenda e
   aplica as regras na ordem:

   1. canal online habilitado e data dentro da janela permitida;
   2. horário de funcionamento da loja naquele dia da semana;
   3. jornada do profissional (interseção com a da loja);
   4. menos agendamentos ativos, expandidos pelo tempo de limpeza do serviço;
   5. menos férias e bloqueios (do profissional ou da loja inteira);
   6. o atendimento precisa caber **inteiro** em uma única janela livre;
   7. antecedência mínima a partir de agora.

O passo 6 é o que impede a lista de oferecer um combo de 70 min numa fresta de
30 min antes do almoço. O tempo de limpeza bloqueia a agenda **sem** alongar o
atendimento do cliente — ele não paga pelo tempo de vassoura.

A UI nunca decide o que está livre: o servidor recalcula a grade a cada consulta,
e `createAppointment` revalida o conflito **dentro da transação**. Duas abas
fechando o mesmo horário ao mesmo tempo: uma ganha, a outra recebe "este horário
acabou de ser preenchido".

## Assinaturas

Um plano define franquia por serviço (`4 cortes + 2 barbas por mês`, ou
ilimitado), desconto para o que sobra do cardápio, prioridade de agenda e
acúmulo opcional de créditos não usados.

- **Precificação** (`src/lib/pricing.ts`, pura e testada): a franquia cobre
  primeiro o **serviço mais caro**. Quem agenda corte (R$ 70) + barba (R$ 50) com
  um crédito na mão tem o corte coberto — nunca o item barato.
- **Razão de créditos**: cada consumo e cada estorno viram lançamento em
  `SubscriptionUsage`. Dá para auditar por que o saldo de um cliente está como
  está, em vez de confiar num contador solto.
- **Cancelar devolve o crédito** — e devolve ao ciclo em que foi consumido, nunca
  ao ciclo novo (o que daria saldo extra de graça).
- **Virada de ciclo idempotente**: a unicidade `(assinatura, serviço, início do
  ciclo)` faz com que rodar a rotina duas vezes não duplique franquia. A virada
  acontece na rotina agendada **e** em qualquer leitura da assinatura, então o
  saldo nunca aparece velho por falta de cron.
- **Cancelamento** encerra no fim do ciclo por padrão: o cliente já pagou o mês e
  continua com o que contratou.

---

## Deploy (Vercel e afins)

> **SQLite não funciona em serverless.** O disco da Vercel é somente leitura e
> efêmero: o build passa, mas toda página quebra em tempo de execução. Para
> publicar, o banco precisa ser Postgres. Este é o passo que não dá para pular.

**1. Crie um Postgres.** Vercel Postgres, Neon, Supabase ou Railway — todos
entregam a connection string pronta. O plano gratuito de qualquer um segura uma
barbearia com folga.

**2. Troque o provider** em `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"   // era "sqlite"
  url      = env("DATABASE_URL")
}
```

**3. Configure as variáveis** no painel do provedor (Settings → Environment
Variables). Não deixe nenhuma em branco — variável vazia é diferente de variável
ausente:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | a string do Postgres do passo 1 |
| `AUTH_SECRET` | `openssl rand -base64 48` |
| `NEXT_PUBLIC_APP_URL` | `https://seu-dominio` (ou deixe **fora**, não vazia) |
| `CRON_SECRET` | `openssl rand -hex 24` |

**4. Crie as tabelas e popule** apontando para o banco de produção:

```bash
DATABASE_URL="postgresql://..." npx prisma db push
DATABASE_URL="postgresql://..." npm run db:seed   # opcional, dados de demonstração
```

Em produção de verdade, rode o seed uma vez só e depois troque a senha do gestor
pela tela de perfil — as contas de demonstração usam senha pública.

**5. Agende a rotina.** Na Vercel, crie um `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/lembretes", "schedule": "0 * * * *" }] }
```

## Rotina agendada

`GET /api/cron/lembretes` — chame de hora em hora pelo agendador do seu provedor:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://seu-dominio/api/cron/lembretes
```

Faz três coisas, todas idempotentes: envia lembrete dos atendimentos das próximas
24 h (uma vez por agendamento), marca faturas vencidas e coloca a assinatura em
atraso, e vira o ciclo das assinaturas cujo período terminou.

## Pagamentos

O fluxo de dinheiro é registrado de ponta a ponta — `Invoice` para assinaturas,
`Payment` para atendimentos e baixas manuais, com forma de pagamento e quem
recebeu. A confirmação hoje é feita pelo caixa da loja (Pix, cartão, dinheiro,
transferência), que é como a barbearia opera. Plugar um gateway significa
disparar a baixa de `Invoice`/`Payment` a partir do webhook: o modelo financeiro
já está no lugar, sem migração.

## Notificações

Tudo passa por `notify()` (`src/server/services/notifications.ts`), que grava no
sino do app e chama `dispatchExternal`. É o ponto único de extensão para
WhatsApp ou e-mail — plugar um provedor depois não exige caçar chamadas
espalhadas pelo código.

---

## Mapa do código

```
prisma/
  schema.prisma          modelo de dados comentado
  seed.ts                barbearia de demonstração
src/
  app/
    (site)/              home, planos, agendamento, área do cliente
    (auth)/              entrar, cadastro
    painel/              área da equipe e do gestor
    api/                 disponibilidade + rotina agendada
  components/            design system e componentes compartilhados
  lib/                   regras puras: intervalos, precificação, fuso, formato
  server/
    actions/             Server Actions (escrita, validadas por Zod)
    auth/                sessão e guardas por papel
    services/            domínio: agenda, agendamento, assinaturas, relatórios
```

## Testes

```bash
npm test
```

45 testes cobrem o que não pode quebrar: álgebra de intervalos (incluindo os
casos de borda que geram overbooking), precificação com plano e conversão de
fuso. As telas foram validadas de ponta a ponta em navegador — login, os quatro
passos do agendamento com consumo de crédito, bloqueio de acesso por papel e
todas as rotas do painel.

## Segurança

- Senhas com `bcrypt`; sessões revogáveis; cookie `httpOnly` + `sameSite=lax`.
- Toda Server Action valida entrada com Zod e verifica papel antes de escrever.
- Um profissional só enxerga e opera a própria agenda (`scopeToBarber`); só o
  gestor vê a casa inteira.
- Login não revela se um e-mail existe na base.
- Ações de gestão deixam trilha em `AuditLog` — quem cancelou, quem deu cortesia,
  quem mudou preço.
- Cabeçalhos `nosniff`, `X-Frame-Options: DENY` e `Referrer-Policy` no
  `next.config.ts`.

## Acessibilidade

Navegação por teclado em toda a interface, foco visível, `aria-pressed` nos
seletores do agendamento, `aria-live` nos avisos, alvos de toque confortáveis no
mobile e respeito a `prefers-reduced-motion`. Tema claro e escuro com contraste
verificado nos dois.
