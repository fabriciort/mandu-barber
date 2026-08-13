/**
 * Algebra de intervalos em minutos.
 *
 * Toda a disponibilidade da agenda e calculada aqui, sobre numeros puros —
 * sem Date, sem fuso, sem banco. Isso mantem a regra mais delicada do produto
 * ("este horário esta livre?") isolada e coberta por teste.
 */

export type Interval = {
  /** Minutos desde a meia-noite local, inclusivo. */
  start: number;
  /** Minutos desde a meia-noite local, exclusivo. */
  end: number;
};

export function isValidInterval(interval: Interval): boolean {
  return Number.isFinite(interval.start) && Number.isFinite(interval.end) && interval.end > interval.start;
}

/** Ordena e funde intervalos que se tocam ou se sobrepoem. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const valid = intervals.filter(isValidInterval).sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];

  for (const current of valid) {
    const last = merged[merged.length - 1];
    if (last && current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/** base menos cuts — o que sobra livre depois dos compromissos. */
export function subtractIntervals(base: Interval[], cuts: Interval[]): Interval[] {
  const blocks = mergeIntervals(cuts);
  let result = mergeIntervals(base);

  for (const cut of blocks) {
    const next: Interval[] = [];
    for (const slot of result) {
      // Sem sobreposicao: o trecho passa intacto.
      if (cut.end <= slot.start || cut.start >= slot.end) {
        next.push(slot);
        continue;
      }
      // Sobra a esquerda do corte.
      if (cut.start > slot.start) next.push({ start: slot.start, end: cut.start });
      // Sobra a direita do corte.
      if (cut.end < slot.end) next.push({ start: cut.end, end: slot.end });
    }
    result = next;
  }

  return result;
}

/** Interseccao entre duas listas (ex.: horario da loja x jornada do barbeiro). */
export function intersectIntervals(a: Interval[], b: Interval[]): Interval[] {
  const left = mergeIntervals(a);
  const right = mergeIntervals(b);
  const result: Interval[] = [];

  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    const start = Math.max(left[i].start, right[j].start);
    const end = Math.min(left[i].end, right[j].end);
    if (end > start) result.push({ start, end });
    if (left[i].end < right[j].end) i++;
    else j++;
  }

  return result;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function totalMinutes(intervals: Interval[]): number {
  return mergeIntervals(intervals).reduce((sum, i) => sum + (i.end - i.start), 0);
}

export function containsInterval(intervals: Interval[], candidate: Interval): boolean {
  return mergeIntervals(intervals).some(
    (free) => free.start <= candidate.start && free.end >= candidate.end,
  );
}

export type SlotOptions = {
  /** Duracao necessaria, em minutos. */
  duration: number;
  /** Granularidade da grade (ex.: 15 -> :00, :15, :30, :45). */
  step: number;
  /** Nao oferecer horarios antes deste minuto (antecedencia minima). */
  notBefore?: number;
  /** Ancorar a grade em multiplos de `step` a partir da meia-noite. */
  alignToStep?: boolean;
};

/**
 * Gera os inicios possiveis dentro dos intervalos livres.
 *
 * Um horario so entra na lista se o atendimento inteiro couber em um unico
 * intervalo livre — e por isso que o resultado nunca oferece um corte de 45 min
 * em uma janela de 30 min antes do almoco.
 */
export function generateSlots(free: Interval[], options: SlotOptions): number[] {
  const { duration, step, notBefore = -Infinity, alignToStep = true } = options;
  if (duration <= 0 || step <= 0) return [];

  const slots: number[] = [];
  for (const window of mergeIntervals(free)) {
    let cursor = window.start;
    if (alignToStep && cursor % step !== 0) {
      cursor = Math.ceil(cursor / step) * step;
    }
    if (cursor < notBefore) {
      cursor = alignToStep ? Math.ceil(notBefore / step) * step : notBefore;
    }
    for (; cursor + duration <= window.end; cursor += step) {
      slots.push(cursor);
    }
  }

  return Array.from(new Set(slots)).sort((a, b) => a - b);
}
