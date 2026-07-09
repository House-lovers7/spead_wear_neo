import { describe, expect, it } from "vitest";
import { fitWithin } from "@/lib/image";

describe("fitWithin (縮小サイズ計算)", () => {
  it("長辺が maxEdge を超えるとアスペクト比を保って縮小する", () => {
    expect(fitWithin(4032, 3024, 1024)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin(3024, 4032, 1024)).toEqual({ width: 768, height: 1024 });
  });

  it("maxEdge 以下なら拡大しない", () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1024, 1024, 1024)).toEqual({ width: 1024, height: 1024 });
  });

  it("極端な縦長でも 1px 未満にならない", () => {
    const { width, height } = fitWithin(100, 10000, 320);
    expect(width).toBeGreaterThanOrEqual(1);
    expect(height).toBe(320);
  });
});
