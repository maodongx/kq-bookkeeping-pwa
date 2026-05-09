"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AssetCategory } from "@/lib/types";
import { getAvailableTxTypes, isInvestment } from "@/lib/currency";
import { todayLocal } from "@/lib/date";
import { Card, Button, toast } from "@heroui/react";
import {
  TransactionFields,
  TransactionFormValues,
  TransactionPayload,
  deriveTxPayload,
} from "./TransactionFields";

function initialValues(category: AssetCategory): TransactionFormValues {
  return {
    type: getAvailableTxTypes(category)[0],
    quantity: "",
    price: "",
    amount: "",
    date: todayLocal(),
    note: "",
  };
}

export function AddTransactionForm({
  assetId,
  category,
  currentBalance,
}: {
  assetId: string;
  category: AssetCategory;
  /**
   * Current balance used to convert an adjustment entry from "new total
   * balance" (what the user types) into the stored delta, for mmf /
   * managed categories. Matches the UX of UpdateBalanceForm for bank/
   * cash so users don't have to do delta math in their head.
   */
  currentBalance: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<TransactionFormValues>(() =>
    initialValues(category)
  );
  const [loading, setLoading] = useState(false);

  const inv = isInvestment(category);

  function update<K extends keyof TransactionFormValues>(
    key: K,
    value: TransactionFormValues[K]
  ) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // When the user picks 调整 on a balance asset, seed the amount
      // field with the current balance so they just have to edit it
      // to the new value — same as UpdateBalanceForm's affordance.
      if (
        key === "type" &&
        value === "adjustment" &&
        !inv &&
        !prev.amount
      ) {
        next.amount = String(currentBalance);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let payload: TransactionPayload;
    if (values.type === "adjustment" && !inv) {
      // Adjustment on mmf / managed: the input is the NEW BALANCE;
      // the stored amount is the delta from currentBalance. Mirrors
      // UpdateBalanceForm so 调整 semantics are consistent across all
      // balance-model categories.
      const newBalance = parseFloat(values.amount);
      const delta = newBalance - currentBalance;
      if (!isFinite(delta) || delta === 0) {
        toast.danger("余额未变化");
        setLoading(false);
        return;
      }
      payload = {
        type: "adjustment",
        quantity: Math.abs(delta),
        price: 1,
        amount: delta,
        date: values.date,
        note: values.note.trim() || null,
      };
    } else {
      payload = deriveTxPayload(values, category);
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("transactions")
      .insert({ asset_id: assetId, ...payload });

    if (error) {
      toast.danger("保存失败", { description: error.message });
    } else {
      setOpen(false);
      setValues(initialValues(category));
      router.refresh();
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <Button fullWidth onPress={() => setOpen(true)}>
        + 添加交易
      </Button>
    );
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title>添加交易</Card.Title>
      </Card.Header>
      <Card.Content>
        <form onSubmit={handleSubmit} className="space-y-3">
          <TransactionFields
            values={values}
            onChange={update}
            category={category}
            currentBalance={currentBalance}
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
