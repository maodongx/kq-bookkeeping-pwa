"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AssetCategory, Currency, Transaction, TransactionType } from "@/lib/types";
import {
  formatCurrency,
  TX_TYPE_LABELS,
  getAvailableTxTypes,
  isInvestment,
} from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

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
  const supabase = createClient();
  const inv = isInvestment(category);

  const [type, setType] = useState<TransactionType>(tx.type);
  const [quantity, setQuantity] = useState(tx.quantity.toString());
  const [price, setPrice] = useState(tx.price.toString());
  const [amount, setAmount] = useState(tx.amount.toString());
  const [date, setDate] = useState(tx.date);
  const [note, setNote] = useState(tx.note || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("确定删除此交易？")) return;
    setDeleting(true);
    await supabase.from("transactions").delete().eq("id", tx.id);
    router.refresh();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const qty = inv ? parseFloat(quantity) : parseFloat(amount);
    const p = inv ? parseFloat(price) : 1;
    const amt = inv ? qty * p : parseFloat(amount);

    await supabase
      .from("transactions")
      .update({
        type,
        quantity: inv ? qty : amt,
        price: p,
        amount: amt,
        date,
        note: note.trim() || null,
      })
      .eq("id", tx.id);

    setSaving(false);
    onEditToggle();
    router.refresh();
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="space-y-2 py-2">
        <div className="flex flex-wrap gap-1">
          {getAvailableTxTypes(category).map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={type === t ? "default" : "secondary"}
              onPress={() => setType(t)}
            >
              {TX_TYPE_LABELS[t]}
            </Button>
          ))}
        </div>

        {inv ? (
          <>
            <Input type="number" step="any" placeholder="数量" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <Input type="number" step="any" placeholder="单价" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </>
        ) : (
          <Input type="number" step="any" placeholder="金额" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        )}

        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input placeholder="备注" value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1" onPress={onEditToggle}>
            取消
          </Button>
          <Button type="submit" size="sm" className="flex-1" isDisabled={saving}>
            保存
          </Button>
        </div>
        <Separator />
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
            size="icon-xs"
            onPress={handleDelete}
            isDisabled={deleting}
            className="text-muted hover:text-danger"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <Separator />
    </>
  );
}
