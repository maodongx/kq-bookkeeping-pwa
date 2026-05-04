"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Currency } from "@/lib/types";
import { formatCurrency, CURRENCY_SYMBOLS } from "@/lib/currency";
import { Card } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UpdateBalanceForm({
  assetId,
  currentBalance,
  currency,
}: {
  assetId: string;
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
    const diff = newBalance - currentBalance;

    if (diff === 0) {
      setOpen(false);
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("transactions").insert({
      asset_id: assetId,
      type: "adjustment",
      quantity: Math.abs(diff),
      price: 1,
      amount: diff,
      date: new Date().toISOString().split("T")[0],
      note: note.trim() || `余额更新: ${formatCurrency(currentBalance, currency)} → ${formatCurrency(newBalance, currency)}`,
    });

    if (error) {
      alert(error.message);
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
