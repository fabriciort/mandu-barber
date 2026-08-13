import { describe, expect, it } from "vitest";

import {
  containsInterval,
  generateSlots,
  intersectIntervals,
  mergeIntervals,
  overlaps,
  subtractIntervals,
  totalMinutes,
} from "../intervals";

const h = (hour: number, minute = 0) => hour * 60 + minute;

describe("mergeIntervals", () => {
  it("funde intervalos sobrepostos e adjacentes", () => {
    expect(
      mergeIntervals([
        { start: h(9), end: h(12) },
        { start: h(11), end: h(13) },
        { start: h(13), end: h(14) },
      ]),
    ).toEqual([{ start: h(9), end: h(14) }]);
  });

  it("mantem separados os intervalos com folga entre eles", () => {
    expect(
      mergeIntervals([
        { start: h(13), end: h(19) },
        { start: h(9), end: h(12) },
      ]),
    ).toEqual([
      { start: h(9), end: h(12) },
      { start: h(13), end: h(19) },
    ]);
  });

  it("descarta intervalos invalidos ou de duracao zero", () => {
    expect(mergeIntervals([{ start: h(10), end: h(10) }, { start: h(12), end: h(11) }])).toEqual([]);
  });
});

describe("subtractIntervals", () => {
  it("abre um buraco no meio do expediente", () => {
    expect(
      subtractIntervals([{ start: h(9), end: h(18) }], [{ start: h(12), end: h(13) }]),
    ).toEqual([
      { start: h(9), end: h(12) },
      { start: h(13), end: h(18) },
    ]);
  });

  it("remove o expediente inteiro quando o bloqueio o cobre", () => {
    expect(subtractIntervals([{ start: h(9), end: h(18) }], [{ start: h(8), end: h(20) }])).toEqual(
      [],
    );
  });

  it("corta nas bordas sem deixar sobra de duracao zero", () => {
    expect(
      subtractIntervals([{ start: h(9), end: h(18) }], [{ start: h(9), end: h(10) }]),
    ).toEqual([{ start: h(10), end: h(18) }]);
  });

  it("aplica varios bloqueios de uma vez", () => {
    expect(
      subtractIntervals(
        [{ start: h(9), end: h(18) }],
        [
          { start: h(10), end: h(11) },
          { start: h(14), end: h(15) },
        ],
      ),
    ).toEqual([
      { start: h(9), end: h(10) },
      { start: h(11), end: h(14) },
      { start: h(15), end: h(18) },
    ]);
  });
});

describe("intersectIntervals", () => {
  it("cruza a jornada do barbeiro com o horario da loja", () => {
    const loja = [{ start: h(9), end: h(20) }];
    const barbeiro = [
      { start: h(8), end: h(12) },
      { start: h(13), end: h(22) },
    ];
    expect(intersectIntervals(loja, barbeiro)).toEqual([
      { start: h(9), end: h(12) },
      { start: h(13), end: h(20) },
    ]);
  });

  it("devolve vazio quando nao ha sobreposicao", () => {
    expect(intersectIntervals([{ start: h(9), end: h(12) }], [{ start: h(13), end: h(18) }])).toEqual(
      [],
    );
  });
});

describe("generateSlots", () => {
  it("respeita a duracao: nao oferece horario que estoura a janela", () => {
    const slots = generateSlots([{ start: h(9), end: h(10) }], { duration: 45, step: 15 });
    expect(slots).toEqual([h(9), h(9, 15)]);
  });

  it("alinha a grade a multiplos do passo", () => {
    const slots = generateSlots([{ start: h(9, 5), end: h(10) }], { duration: 30, step: 15 });
    expect(slots).toEqual([h(9, 15), h(9, 30)]);
  });

  it("aplica a antecedencia minima", () => {
    const slots = generateSlots([{ start: h(9), end: h(12) }], {
      duration: 30,
      step: 30,
      notBefore: h(10, 10),
    });
    expect(slots[0]).toBe(h(10, 30));
  });

  it("nao permite atendimento atravessando duas janelas livres", () => {
    const free = [
      { start: h(9), end: h(9, 30) },
      { start: h(10), end: h(11) },
    ];
    const slots = generateSlots(free, { duration: 60, step: 15 });
    expect(slots).toEqual([h(10)]);
  });

  it("devolve vazio para duracao maior que qualquer janela", () => {
    expect(generateSlots([{ start: h(9), end: h(10) }], { duration: 120, step: 15 })).toEqual([]);
  });

  it("nao gera horarios duplicados quando janelas se tocam", () => {
    const slots = generateSlots(
      [
        { start: h(9), end: h(10) },
        { start: h(9, 30), end: h(11) },
      ],
      { duration: 30, step: 30 },
    );
    expect(new Set(slots).size).toBe(slots.length);
  });
});

describe("auxiliares", () => {
  it("overlaps ignora encostar sem invadir", () => {
    expect(overlaps({ start: h(9), end: h(10) }, { start: h(10), end: h(11) })).toBe(false);
    expect(overlaps({ start: h(9), end: h(10, 1) }, { start: h(10), end: h(11) })).toBe(true);
  });

  it("totalMinutes nao conta sobreposicao duas vezes", () => {
    expect(
      totalMinutes([
        { start: h(9), end: h(11) },
        { start: h(10), end: h(12) },
      ]),
    ).toBe(180);
  });

  it("containsInterval exige caber inteiro em uma unica janela", () => {
    const free = [
      { start: h(9), end: h(10) },
      { start: h(10, 15), end: h(12) },
    ];
    expect(containsInterval(free, { start: h(9), end: h(10) })).toBe(true);
    expect(containsInterval(free, { start: h(9, 30), end: h(10, 30) })).toBe(false);
  });
});
