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
      <form onSubmit={handleSave} className="py-2 space-y-2 border-b border-gray-50 last:border-0">
        <div className="flex gap-1 flex-wrap">
          {getAvailableTxTypes(category).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                type === t ? "bg-blue-600 text-white" : "bg-gray-100"
              }`}
            >
              {TX_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {inv ? (
          <>
            <input type="number" step="any" placeholder="数量" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="input text-sm" />
            <input type="number" step="any" placeholder="单价" value={price} onChange={(e) => setPrice(e.target.value)} required className="input text-sm" />
          </>
        ) : (
          <input type="number" step="any" placeholder="金额" value={amount} onChange={(e) => setAmount(e.target.value)} required className="input text-sm" />
        )}
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input text-sm" />
        <input placeholder="备注" value={note} onChange={(e) => setNote(e.target.value)} className="input text-sm" />
        <div className="flex gap-2">
          <button type="button" onClick={onEditToggle} className="flex-1 py-1.5 rounded-lg border text-xs">取消</button>
          <button type="submit" disabled={saving} className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-xs disabled:opacity-50">保存</button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
      <button onClick={onEditToggle} className="flex-1 text-left">
        <p className="text-sm font-medium">{TX_TYPE_LABELS[tx.type]}</p>
        <p className="text-xs text-gray-400">
          {tx.date}
          {tx.note ? ` · ${tx.note}` : ""}
        </p>
      </button>
      <div className="flex items-center gap-2">
        <div className="text-right">
          {inv && (
            <p className="text-xs text-gray-500 tabular-nums">
              {tx.quantity} @ {formatCurrency(tx.price, currency)}
            </p>
          )}
          <p className="text-sm tabular-nums">
            {formatCurrency(tx.amount, currency)}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 text-gray-300 active:text-red-500 rounded disabled:opacity-50"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
