import { describe, expect, it } from "vitest";
import { MOCK_CLOSET_ATTRS, MOCK_SNAP_ANALYSIS, mockMatchPlan } from "@/lib/ai/mock";
import {
  closetItemAttrsSchema,
  imageRequestSchema,
  matchPlanSchema,
  matchRequestSchema,
  snapAnalysisSchema,
} from "@/lib/ai/schemas";

describe("AI スキーマとモックの整合", () => {
  it("モック解析結果は snapAnalysisSchema に適合する", () => {
    expect(() => snapAnalysisSchema.parse(MOCK_SNAP_ANALYSIS)).not.toThrow();
  });

  it("モック照合結果は matchPlanSchema に適合する", () => {
    expect(() => matchPlanSchema.parse(mockMatchPlan(["a", "b", "c"]))).not.toThrow();
  });

  it("クローゼットが少ない場合の照合モックも適合する (outfits 空)", () => {
    const plan = matchPlanSchema.parse(mockMatchPlan(["only-one"]));
    expect(plan.outfits).toHaveLength(0);
    expect(plan.missingItems.length).toBeGreaterThan(0);
  });

  it("モック分類結果は closetItemAttrsSchema に適合する", () => {
    expect(() => closetItemAttrsSchema.parse(MOCK_CLOSET_ATTRS)).not.toThrow();
  });

  it("照合モックの outfits は渡した手持ち id だけを参照する", () => {
    const ids = ["id-1", "id-2", "id-3"];
    const plan = matchPlanSchema.parse(mockMatchPlan(ids));
    for (const outfit of plan.outfits) {
      for (const itemId of outfit.itemIds) {
        expect(ids).toContain(itemId);
      }
    }
  });
});

describe("imageRequestSchema", () => {
  it("data URL 形式のみ受け付ける", () => {
    expect(imageRequestSchema.safeParse({ image: "data:image/jpeg;base64,abc" }).success).toBe(
      true,
    );
    expect(imageRequestSchema.safeParse({ image: "https://example.com/a.jpg" }).success).toBe(
      false,
    );
    expect(imageRequestSchema.safeParse({}).success).toBe(false);
  });

  it("巨大画像 (縮小忘れ) を拒否する", () => {
    const huge = `data:image/jpeg;base64,${"a".repeat(2_100_000)}`;
    expect(imageRequestSchema.safeParse({ image: huge }).success).toBe(false);
  });
});

describe("matchRequestSchema", () => {
  it("解析結果 + クローゼット記述子で適合する", () => {
    const body = {
      analysis: MOCK_SNAP_ANALYSIS,
      closet: [{ ...MOCK_CLOSET_ATTRS, id: "item-1" }],
    };
    expect(matchRequestSchema.safeParse(body).success).toBe(true);
  });

  it("クローゼットが空だと拒否する (照合はクライアント側でスキップする契約)", () => {
    expect(
      matchRequestSchema.safeParse({ analysis: MOCK_SNAP_ANALYSIS, closet: [] }).success,
    ).toBe(false);
  });
});
