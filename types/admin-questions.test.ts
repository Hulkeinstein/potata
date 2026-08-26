import { describe, expectTypeOf, it } from "vitest";
import type { AdminQuestionAnswer, AdminQuestionItem, AdminQuestionPage, AdminQuestionStatus } from "@/types/admin-questions";

describe("admin Q&A contracts", () => {
  it("exports the inbox contract types from their dedicated module", () => {
    // Given: the dedicated admin Q&A type module
    type ExpectedStatus = "unanswered" | "answered" | "all";

    // When: consumers import every inbox contract from it
    type ExpectedPage = {
      readonly items: readonly AdminQuestionItem[];
      readonly total: number;
      readonly page: number;
      readonly pageSize: number;
      readonly hasMore: boolean;
    };

    // Then: the type-level public contract remains intact
    expectTypeOf<AdminQuestionStatus>().toEqualTypeOf<ExpectedStatus>();
    expectTypeOf<AdminQuestionPage>().toEqualTypeOf<ExpectedPage>();
    expectTypeOf<AdminQuestionItem>().toHaveProperty("answers");
    expectTypeOf<AdminQuestionAnswer>().toHaveProperty("authorName");
  });
});
