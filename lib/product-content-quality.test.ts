import { describe, expect, it } from "vitest";
import { getProductContentGaps, matchesProductContentQuality } from "./product-content-quality";

describe("shared product content completeness", () => {
  it.each([null, "", " \n\t ", "\u00a0\u3000"])("detects confirmed blank content %j", (blank) => {
    // Given / When / Then: confirmed blank fields use the same rule in every consumer.
    expect(getProductContentGaps({ descriptionKo: blank, descriptionEn: blank, imageUrl: blank })).toEqual(["ko", "en", "image"]);
  });
  it("does not fabricate missing fields from facts that were not fetched", () => {
    expect(getProductContentGaps({})).toEqual([]);
  });
  it("keeps a registered external image without contacting the provider", () => {
    expect(getProductContentGaps({ descriptionKo: " 한글 ", descriptionEn: " English ", imageUrl: "https://unreachable.test/image.jpg" })).toEqual([]);
  });
  it("matches only the selected missing field and ORs all missing fields", () => {
    const product = { descriptionKo: null, descriptionEn: "English", imageUrl: "/image.png" };
    expect(matchesProductContentQuality(product, "all")).toBe(true);
    expect(matchesProductContentQuality(product, "missing-any")).toBe(true);
    expect(matchesProductContentQuality(product, "missing-ko")).toBe(true);
    expect(matchesProductContentQuality(product, "missing-en")).toBe(false);
    expect(matchesProductContentQuality(product, "missing-image")).toBe(false);
  });
});
