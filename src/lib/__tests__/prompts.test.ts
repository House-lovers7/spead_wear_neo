import { describe, expect, it } from "vitest";
import { MOCK_CLOSET_ATTRS, MOCK_SNAP_ANALYSIS } from "@/lib/ai/mock";
import {
  ANALYZE_SYSTEM,
  buildMatchUserText,
  CATEGORIZE_SYSTEM,
  MATCH_SYSTEM,
} from "@/lib/ai/prompts";

describe("プロンプトの表現ポリシー", () => {
  it("全 system プロンプトに断定禁止ポリシーが含まれる", () => {
    for (const system of [ANALYZE_SYSTEM, MATCH_SYSTEM, CATEGORIZE_SYSTEM]) {
      expect(system).toContain("ブルベ/イエベ");
      expect(system).toContain("断定しない");
      expect(system).toContain("「似合う」と断言しない");
    }
  });
});

describe("buildMatchUserText", () => {
  it("手持ちアイテムの id を含み、照合対象が明示される", () => {
    const closet = [
      { ...MOCK_CLOSET_ATTRS, id: "item-abc" },
      { ...MOCK_CLOSET_ATTRS, id: "item-xyz", name: "黒スラックス" },
    ];
    const text = buildMatchUserText(MOCK_SNAP_ANALYSIS, closet);
    expect(text).toContain("item-abc");
    expect(text).toContain("item-xyz");
    expect(text).toContain("憧れスナップの分解結果");
    expect(text).toContain("手持ち服");
  });

  it("画像データ (data URL) を含まない — 照合はテキストのみの契約", () => {
    const closet = [{ ...MOCK_CLOSET_ATTRS, id: "item-1" }];
    const text = buildMatchUserText(MOCK_SNAP_ANALYSIS, closet);
    expect(text).not.toContain("data:image");
  });
});
