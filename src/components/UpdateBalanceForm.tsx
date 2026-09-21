"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AssetCategory, Currency } from "@/lib/types";
import { formatCurrency, CURRENCY_SYMBOLS } from "@/lib/currency";
import { fetchLiveBalance } from "@/lib/live-balance";
import { todayLocal } from "@/lib/date";
import { Card, Button, Input, toast } from "@heroui/react";

export function UpdateBalanceForm({
  assetId,
  category,
  currentBalance,
  currency,
}: {
  assetId: string;
  /** Needed to re-derive the balance at submit time. */
  category: AssetCategory;
  /**
   * Balance as of page render, shown as "当前余额". Display only — the stored
   * delta is computed against a fresh read, since this value can be stale.
   */
  currentBalance: number;
  currency: Currency;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const newBalance = parseFloat(value);
    if (!Number.isFinite(newBalance)) {
      toast.danger("请输入有效金额");
      setLoading(false);
      return;
    }

    // Compute the delta against a *fresh* balance, not the one from page
    // render. The render-time figure is up to 30s stale (router cache) and can
    // be older still if the other household member just recorded something —
    // and since this writes a delta, a stale basis silently offsets the
    // resulting balance by exactly the amount we missed.
    const liveBalance = await fetchLiveBalance(assetId, category);
    if (liveBalance === null) {
      toast.danger("无法读取当前余额，请重试");
      setLoading(false);
      return;
    }

    const diff = newBalance - liveBalance;

    if (diff === 0) {
      setOpen(false);
      setLoading(false);
      // Say something: with a stale display this can look like a no-op even
      // though the user did change the number they saw.
      toast.success("余额无需调整");
      router.refresh();
      return;
    }

    const { error } = await supabase.from("transactions").insert({
      asset_id: assetId,
      type: "adjustment",
      // Signed, matching `amount`. `computeHolding` accumulates adjustment
      // quantities (`totalQty += tx.quantity`), so storing the absolute value
      // made a downward correction *increase* the unit count — and the edit
      // path already wrote it signed, so re-saving an untouched row changed
      // the stored value.
      quantity: diff,
      price: 1,
      amount: diff,
      date: todayLocal(),
      // Record the balance we actually adjusted *from*, so the note matches
      // the stored delta even when the form was showing a stale figure.
      note: note.trim() || `余额更新: ${formatCurrency(liveBalance, currency)} → ${formatCurrency(newBalance, currency)}`,
    });

    if (error) {
      toast.danger("保存失败", { description: error.message });
    } else {
      setOpen(false);
      setValue("");
      setNote("");
      router.refresh();
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <Button fullWidth onPress={() => setOpen(true)}>
        更新余额
      </Button>
    );
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title>更新余额</Card.Title>
        <p className="text-sm text-muted">
          当前余额: {formatCurrency(currentBalance, currency)}
        </p>
      </Card.Header>
      <Card.Content>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="number"
            step="any"
            placeholder={`新余额 (${CURRENCY_SYMBOLS[currency]})`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
          <Input
            placeholder="备注 (可选)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onPress={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" className="flex-1" isDisabled={loading}>
              确认
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}
