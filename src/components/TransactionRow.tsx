"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AssetCategory, Currency, Transaction } from "@/lib/types";
import {
  formatCurrency,
  TX_TYPE_LABELS,
  isInvestment,
} from "@/lib/currency";
import { Button, Separator } from "@heroui/react";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import {
  TransactionFields,
  TransactionFormValues,
  deriveTxPayload,
} from "./TransactionFields";

function valuesFromTx(tx: Transaction): TransactionFormValues {
  return {
    type: tx.type,
    quantity: tx.quantity.toString(),
    price: tx.price.toString(),
    amount: tx.amount.toString(),
    date: tx.date,
    note: tx.note || "",
  };
}

export function TransactionRow({
  tx,
  category,
  currency,
  isEditing,
  onEditToggle,
}: {
  tx: Transaction;
  category: AssetCategory;
  currency: Currency;
  isEditing: boolean;
  onEditToggle: () => void;
}) {
  const router = useRouter();
  const inv = isInvestment(category);
  const [confirm, ConfirmDialog] = useConfirmDialog();

  const [values, setValues] = useState<TransactionFormValues>(() =>
    valuesFromTx(tx)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function update<K extends keyof TransactionFormValues>(
    key: K,
    value: TransactionFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleDelete() {
    const ok = await confirm({
      heading: "确定删除此交易？",
      body: "此操作不可恢复。",
      status: "danger",
      confirmLabel: "删除",
    });
    if (!ok) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("transactions").delete().eq("id", tx.id);
    router.refresh();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("transactions")
      .update(deriveTxPayload(values, category))
      .eq("id", tx.id);

    setSaving(false);
    onEditToggle();
    router.refresh();
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="space-y-2 py-2">
        <TransactionFields
          values={values}
          onChange={update}
          category={category}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onPress={onEditToggle}
          >
            取消
          </Button>
          <Button
            type="submit"
            size="sm"
            className="flex-1"
            isDisabled={saving}
          >
            保存
          </Button>
        </div>
        <Separator />
        <ConfirmDialog />
      </form>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between py-1.5">
        <button onClick={onEditToggle} className="flex-1 text-left">
          <p className="text-sm font-medium">{TX_TYPE_LABELS[tx.type]}</p>
          <p className="text-xs text-muted">
            {tx.date}
            {tx.note ? ` · ${tx.note}` : ""}
          </p>
        </button>
        <div className="flex items-center gap-2">
          <div className="text-right">
            {inv && (
              <p className="text-xs tabular-nums text-muted">
                {tx.quantity} @ {formatCurrency(tx.price, currency)}
              </p>
            )}
            <p className="text-sm tabular-nums">
              {formatCurrency(tx.amount, currency)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            onPress={handleDelete}
            isDisabled={deleting}
            className="text-muted hover:text-danger"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <Separator />
      <ConfirmDialog />
    </>
  );
}
