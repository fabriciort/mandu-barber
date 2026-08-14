"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney, formatMoneyCompact, pluralize } from "@/lib/format";
import { parseDateKey } from "@/lib/time";

type Point = { date: string; revenueCents: number; appointments: number };

/**
 * Faturamento dos ultimos 30 dias.
 *
 * Uma serie so, na cor da marca: o objetivo e ler a tendencia de relance, nao
 * decorar legenda. Os rotulos do eixo aparecem a cada 5 dias para nao virar
 * uma parede de texto no celular.
 */
export function RevenueChart({ data }: { data: Point[] }) {
  const hasRevenue = data.some((point) => point.revenueCents > 0);

  if (!hasRevenue) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
        Ainda não há faturamento no período.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="fill-receita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border-subtle)"
          />

          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            interval={4}
            tickFormatter={(value: string) =>
              parseDateKey(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={70}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            tickFormatter={(value: number) => formatMoneyCompact(value)}
          />

          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as Point;
              return (
                /* Mesma linguagem dos avisos: bloco invertido. No monocromatico
                   e o que separa "camada flutuante" de "conteudo da pagina". */
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-inverse)] px-3 py-2 text-[var(--text-inverse)] shadow-[var(--shadow-lg)]">
                  <p className="text-2xs uppercase tracking-[0.1em] opacity-60">
                    {parseDateKey(point.date).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                  <p className="tnum mt-1 text-sm font-semibold">
                    {formatMoney(point.revenueCents)}
                  </p>
                  <p className="tnum text-xs opacity-60">{pluralize(point.appointments, "atendimento", "atendimentos")}</p>
                </div>
              );
            }}
          />

          <Area
            type="monotone"
            dataKey="revenueCents"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#fill-receita)"
            dot={false}
            // O ponto ativo ganha um anel na cor da superficie: destaca sem
            // precisar de uma segunda cor.
            activeDot={{
              r: 4,
              fill: "var(--accent)",
              stroke: "var(--surface-raised)",
              strokeWidth: 2,
            }}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
