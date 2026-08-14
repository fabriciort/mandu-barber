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
docker compose up -d        # Postgres local na porta 5432
cp .env.example .env        # gere um AUTH_SECRET: openssl rand -base64 48
npm run setup               # gera o client, aplica migrações e popula
npm run dev
```

Abra <http://localhost:3000>.

Se preferir não usar Docker, aponte a `DATABASE_URL` para qualquer Postgres —
um banco gratuito do Neon ou Supabase serve, inclusive para desenvolvimento.

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
| `npm run db:migrate` | Aplica as migrações pendentes |
| `npm run db:seed` | Repopula do zero (**apaga** os dados atuais) |
| `npm run db:reset` | Recria o schema e popula |

---

## Decisões de arquitetura

**Next.js 15 (App Router) + React 19 + TypeScript estrito.** Server Components
para leitura, Server Actions para escrita. Não há camada de API para o próprio
front — a única rota HTTP é `/api/disponibilidade`, consumida pelo assistente de
agendamento, mais a rotina agendada.

**Prisma + Postgres.** Mesmo banco em desenvolvimento e em produção — o
`docker-compose.yml` sobe um local em um comando. Os "enums" do domínio são
strings validadas por Zod (`src/lib/enums.ts`) em vez de enums nativos: validação,
tipos e rótulos em português ficam num arquivo só, e acrescentar um status novo
não exige migração de schema.

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

**1. Crie um Postgres.** Vercel Postgres, Neon, Supabase ou Railway — todos
entregam a connection string pronta. O plano gratuito de qualquer um segura uma
barbearia com folga.

**2. Configure as variáveis** no painel do provedor (Settings → Environment
Variables). Não deixe nenhuma em branco — variável vazia é diferente de variável
ausente:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | a string do Postgres do passo 1 |
| `AUTH_SECRET` | `openssl rand -base64 48` |
| `NEXT_PUBLIC_APP_URL` | `https://seu-dominio` (ou deixe **fora**, não vazia) |
| `CRON_SECRET` | `openssl rand -hex 24` |

**3. Faça o deploy.** É só isso — não precisa rodar nada no terminal. O script de
build aplica as migrações e, **só se o banco estiver vazio**, popula a barbearia
de demonstração:

```
prisma generate && prisma migrate deploy && tsx prisma/bootstrap.ts && next build
```

A partir do primeiro usuário cadastrado o bootstrap não toca em mais nada, então
deploys seguintes preservam os dados reais. Se ele falhar no meio, desfaz o que
criou para o próximo deploy tentar de novo, em vez de deixar o banco pela metade.

> Antes de divulgar o endereço: as contas de demonstração usam senha pública
> (`mandu123`). Entre como gestor e troque a senha em **Minha conta → Perfil**.
> Para começar com a base limpa em vez dos dados de exemplo, rode
> `DATABASE_URL="..." npx prisma migrate deploy` e pule o bootstrap.

**4. A rotina já está agendada** no `vercel.json`: uma vez por dia, às 12:00 UTC
(09:00 em Brasília), que é o limite do plano Hobby da Vercel. Se um dia migrar
para o Pro, dá para deixar de hora em hora (`0 * * * *`) e os lembretes ficam
mais próximos do horário do cliente.

### Quando algo não sobe

Abra **`/api/saude`**. Ele diz exatamente o que falta, sem expor segredo (a senha
do banco nunca aparece — só o host):

| Resposta | O que significa |
| --- | --- |
| `ok` | Conectado, com tabelas e dados. Se a tela ainda quebra, o problema é outro. |
| `sem-configuracao` | Nenhuma variável de conexão chegou ao ambiente. |
| `sem-conexao` | A string existe mas o banco não responde — host errado, ou falta `sslmode=require`. |
| `sem-tabelas` | O banco responde mas as migrações não rodaram. |
| `vazio` | Tudo criado, mas sem dados: publique de novo para a carga inicial rodar. |

O nome da variável não precisa ser exatamente `DATABASE_URL`: também são aceitos
`POSTGRES_PRISMA_URL`, `POSTGRES_URL`, `DATABASE_URL_UNPOOLED` e
`POSTGRES_URL_NON_POOLING`, porque cada integração batiza de um jeito. A resposta
de `/api/saude` mostra de qual delas veio.

E o build **nunca falha por causa do banco**: se ele estiver mal configurado, o
deploy sobe assim mesmo com o aviso no log, em vez de ser descartado e deixar a
versão antiga (quebrada) no ar.

## Rotina agendada

`GET /api/cron/lembretes` — agendado pelo `vercel.json`, ou chamado à mão:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://seu-dominio/api/cron/lembretes
```

Faz três coisas, todas idempotentes: envia lembrete dos atendimentos das próximas
24 h (uma vez por agendamento), marca faturas vencidas e coloca a assinatura em
atraso, e vira o ciclo das assinaturas cujo período terminou.

Rodando uma vez por dia, o lembrete sai com até 24 h de antecedência — quem
agenda hoje à tarde para amanhã cedo recebe o aviso na execução da manhã. A
virada de ciclo da assinatura **não depende** desta rotina: ela também acontece
em qualquer leitura da assinatura, justamente para o saldo do cliente nunca
aparecer desatualizado por causa da frequência do cron.

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
docker-compose.yml       Postgres local
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
