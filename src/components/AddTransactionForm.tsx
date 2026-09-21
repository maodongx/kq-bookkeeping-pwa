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
  validateTxValues,
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
  heldQty,
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
  /** Units currently held, used to reject overselling an investment. */
  heldQty?: number;
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
      // Switching the type changes what the amount field *means* (存入 amount
      // vs 调整 new-balance), so re-seed it rather than carrying the old number
      // over. Previously 调整 seeded the field with the full balance and
      // switching back to 存入 left it there — confirming then booked a
      // deposit of the entire balance, doubling the asset and adding that much
      // phantom capital inflow.
      if (key === "type" && !inv) {
        next.amount = value === "adjustment" ? String(currentBalance) : "";
      }
      return next;
    });
  }

  function handleCancel() {
    setValues(initialValues(category));
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 调整 is validated separately below (its input is a target balance, not an
    // amount, so the generic sign rules don't apply).
    if (!(values.type === "adjustment" && !inv)) {
      const invalid = validateTxValues(values, category, heldQty);
      if (invalid) {
        toast.danger(invalid);
        return;
      }
    }

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
        // Signed, matching `amount` and the edit path — see UpdateBalanceForm.
        quantity: delta,
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
              onPress={handleCancel}
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
