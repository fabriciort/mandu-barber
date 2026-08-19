import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { describeDatabaseTarget, resolveDatabaseUrl } from "@/lib/database-url";

export const dynamic = "force-dynamic";

/**
 * Diagnostico de instalacao.
 *
 * Quando as paginas quebram, elas mostram um erro generico de proposito — nao
 * se expoe detalhe de infraestrutura para o cliente da barbearia. Esta rota e o
 * outro lado: diz exatamente o que falta para o app subir, sem vazar segredo
 * (a senha do banco nunca aparece; so o host).
 *
 *   GET /api/saude
 */
export async function GET() {
  const { url, source, emptyNames } = resolveDatabaseUrl();

  if (!url) {
    // "Existe porem vazia" e "nao existe" mandam a pessoa para lugares
    // diferentes no painel do provedor. Vale a pena separar as duas.
    const vazias = emptyNames.join(", ");
    return NextResponse.json(
      {
        status: "sem-configuracao",
        problema: vazias
          ? `A variavel ${vazias} existe neste ambiente, mas esta vazia.`
          : "Nenhuma variavel de conexao (DATABASE_URL, POSTGRES_URL...) esta definida neste ambiente.",
        solucao: vazias
          ? `No painel do provedor, em Environment Variables, abra ${emptyNames[0]}, cole a string do Postgres, confirme que ela vale para Production, Preview e Development, e faca um novo deploy.`
          : "No painel do provedor, em Environment Variables, defina DATABASE_URL com a string do Postgres (marcando Production, Preview e Development) e faca um novo deploy.",
      },
      { status: 503 },
    );
  }

  const destino = `${describeDatabaseTarget(url)} (via ${source})`;

  try {
    // Consulta barata que so passa se a conexao e o schema existirem.
    const [usuarios, servicos, agendamentos] = await Promise.all([
      prisma.user.count(),
      prisma.service.count(),
      prisma.appointment.count(),
    ]);

    if (usuarios === 0) {
      return NextResponse.json({
        status: "vazio",
        banco: destino,
        problema: "O banco esta conectado e com as tabelas criadas, mas sem nenhum dado.",
        solucao:
          "Refaca o deploy: a carga inicial roda no build quando o banco esta vazio. Ou rode `npm run db:seed` apontando para este banco.",
      });
    }

    return NextResponse.json({
      status: "ok",
      banco: destino,
      dados: { usuarios, servicos, agendamentos },
    });
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    const semTabelas = /does not exist|relation .* does not exist|P2021|P2022/i.test(mensagem);

    if (semTabelas) {
      return NextResponse.json(
        {
          status: "sem-tabelas",
          banco: destino,
          problema: "O banco responde, mas as tabelas nao foram criadas.",
          solucao:
            "Faca um novo deploy — o build roda `prisma migrate deploy`. Se o deploy no ar for anterior a essa mudanca, e por isso que as tabelas nao existem.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        status: "sem-conexao",
        banco: destino,
        problema: "Nao foi possivel conectar no banco.",
        detalhe: mensagem.slice(0, 300),
        solucao:
          "Confira se a DATABASE_URL esta completa (com usuario, senha, host e nome do banco) e se o provedor exige sslmode=require.",
      },
      { status: 503 },
    );
  }
}
