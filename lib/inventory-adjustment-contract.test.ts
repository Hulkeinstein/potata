import { describe, expect, it } from "vitest";
import { parseInventoryAdjustmentInput } from "@/lib/inventory-adjustment-contract";

describe("inventory adjustment input", () => {
  it("parses signed receive, correction, and disposal deltas", () => {
    expect(parseInventoryAdjustmentInput({ variantId: "variant-1", type: "RECEIVE", delta: 5, reason: "입고", idempotencyKey: "receive-1" })).toEqual({ ok: true, value: { variantId: "variant-1", type: "RECEIVE", delta: 5, reason: "입고", idempotencyKey: "receive-1" } });
    expect(parseInventoryAdjustmentInput({ variantId: "variant-1", type: "CORRECTION", delta: -2, reason: "실사 정정", idempotencyKey: "correction-1" })).toMatchObject({ ok: true });
    expect(parseInventoryAdjustmentInput({ variantId: "variant-1", type: "DISPOSAL", delta: -1, reason: "폐기", idempotencyKey: "disposal-1" })).toMatchObject({ ok: true });
  });

  it("rejects zero deltas, blank reasons, and directionally invalid types", () => {
    expect(parseInventoryAdjustmentInput({ variantId: "variant-1", type: "RECEIVE", delta: 0, reason: "입고", idempotencyKey: "zero" })).toEqual({ ok: false, error: "조정 수량은 0이 아니어야 합니다." });
    expect(parseInventoryAdjustmentInput({ variantId: "variant-1", type: "DISPOSAL", delta: 1, reason: "폐기", idempotencyKey: "positive-disposal" })).toEqual({ ok: false, error: "폐기는 음수 수량이어야 합니다." });
    expect(parseInventoryAdjustmentInput({ variantId: "variant-1", type: "CORRECTION", delta: -1, reason: " ", idempotencyKey: "blank-reason" })).toEqual({ ok: false, error: "조정 사유가 필요합니다." });
  });
});
