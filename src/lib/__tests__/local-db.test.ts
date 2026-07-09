import { describe, expect, it } from "vitest";
import { aggregateLikedPoints } from "@/lib/db/local";

describe("aggregateLikedPoints (好みプロファイル集計)", () => {
  it("頻度順に集計する", () => {
    const snaps = [
      { likedPoints: ["抜け感", "ワントーン"] },
      { likedPoints: ["抜け感"] },
      { likedPoints: [] },
    ];
    expect(aggregateLikedPoints(snaps)).toEqual([
      { label: "抜け感", count: 2 },
      { label: "ワントーン", count: 1 },
    ]);
  });

  it("同数は五十音順で安定する", () => {
    const snaps = [{ likedPoints: ["わ", "あ"] }];
    expect(aggregateLikedPoints(snaps).map((p) => p.label)).toEqual(["あ", "わ"]);
  });

  it("空入力は空配列", () => {
    expect(aggregateLikedPoints([])).toEqual([]);
  });
});
