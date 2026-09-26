"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { getPresetOrderPreview } from "@/app/actions/shop";

export interface PresetOrderOutcome {
  kind: "ordered" | "empty" | "error";
  /** Lines actually placed into the cart. */
  addedCount: number;
  total: number;
  unavailable: string[];
  adjusted: { name: string; wanted: number; added: number }[];
  presetName: string;
}

/**
 * Shared "Order" flow for every preset card/detail: verify against live
 * stock, load available items into the cart, and report unavailable items
 * explicitly. Never silently ignores anything.
 */
export function usePresetOrder() {
  const { replace } = useCart();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<PresetOrderOutcome | null>(null);

  async function orderPreset(presetId: string, presetName: string) {
    setBusyId(presetId);
    setOutcome(null);
    try {
      const preview = await getPresetOrderPreview(presetId);
      if (preview.lines.length === 0) {
        setOutcome({
          kind: "empty",
          addedCount: 0,
          total: 0,
          unavailable: preview.unavailable,
          adjusted: [],
          presetName,
        });
        return;
      }
      replace(
        preview.lines.map((l) => ({
          product_id: l.product_id,
          name: l.name,
          price: l.price,
          unit: l.unit,
          shop_id: l.shop_id,
          shop_name: l.shop_name,
          quantity: l.quantity,
        })),
      );
      setOutcome({
        kind: "ordered",
        addedCount: preview.lines.length,
        total: preview.total,
        unavailable: preview.unavailable,
        adjusted: preview.adjusted,
        presetName,
      });
    } catch (e) {
      setOutcome({
        kind: "error",
        addedCount: 0,
        total: 0,
        unavailable: [],
        adjusted: [],
        presetName: e instanceof Error ? e.message : "Could not order preset.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return { orderPreset, busyId, outcome, setOutcome };
}
