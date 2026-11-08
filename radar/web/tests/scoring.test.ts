import { describe, expect, it } from "vitest";
import { computeScore, type ScoreInput } from "@/lib/scoring";

const base: ScoreInput = {
  daysActive: 0,
  isActive: true,
  collationCount: null,
  sameMessageCount: 0,
  offers: [],
  offerRepeatCount: 0,
  advertiserActiveAds: 1,
  distinctCreatives: 1,
  distinctFormats: 1,
  landingKind: null,
  landingDomainOnly: false,
  launchWeeks: 1,
};

describe("puntuación de oportunidad", () => {
  it("explica cada señal y suma como máximo 100", () => {
    const r = computeScore({
      ...base,
      daysActive: 120,
      collationCount: 12,
      sameMessageCount: 6,
      offers: ["Envío gratis"],
      offerRepeatCount: 8,
      advertiserActiveAds: 40,
      distinctCreatives: 8,
      distinctFormats: 3,
      landingKind: "web",
      launchWeeks: 8,
    });
    expect(r.score).toBe(100);
    expect(r.signals.map((s) => s.key)).toEqual([
      "longevity",
      "variants",
      "advertiser_volume",
      "message_repetition",
      "creative_diversity",
      "landing",
      "continuity",
    ]);
    expect(r.signals.reduce((s, x) => s + x.max, 0)).toBe(100);
    for (const s of r.signals) expect(s.explanation.length).toBeGreaterThan(20);
  });

  it("un anuncio nuevo y aislado puntúa bajo", () => {
    const r = computeScore(base);
    expect(r.score).toBeLessThan(10);
  });

  it("los días activos aumentan la puntuación de forma monótona", () => {
    const s = (d: number) => computeScore({ ...base, daysActive: d }).score;
    expect(s(7)).toBeLessThan(s(30));
    expect(s(30)).toBeLessThan(s(90));
    expect(s(90)).toBe(s(400));
  });

  it("la landing solo con dominio puntúa menos que la URL completa", () => {
    const full = computeScore({ ...base, landingKind: "web" }).signals.find((x) => x.key === "landing")!;
    const domain = computeScore({ ...base, landingKind: "web", landingDomainOnly: true }).signals.find((x) => x.key === "landing")!;
    expect(full.points).toBeGreaterThan(domain.points);
  });
});
