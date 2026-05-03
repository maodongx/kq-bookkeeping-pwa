"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AssetCategory, Currency, TransactionType } from "@/lib/types";
import { getAvailableTxTypes, TX_TYPE_LABELS, isInvestment } from "@/lib/currency";

export function AddTransactionForm({ assetId, category, currency }: { assetId: string; category: AssetCategory; currency: Currency }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>(getAvailableTxTypes(category)[0]);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const inv = isInvestment(category);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const qty = inv ? parseFloat(quantity) : parseFloat(amount);
    const p = inv ? parseFloat(price) : 1;
    const amt = inv ? qty * p : parseFloat(amount);

    const { error } = await supabase.from("transactions").insert({
      asset_id: assetId, type, quantity: inv ? qty : amt, price: p, amount: amt, date, note: note.trim() || null,
    });

    if (error) { alert(error.message); }
    else { setOpen(false); setQuantity(""); setPrice(""); setAmount(""); setNote(""); router.refresh(); }
    setLoading(false);
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-medium">+ 添加交易</button>
  );

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h2 className="font-semibold text-sm mb-3">添加交易</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-1 flex-wrap">
          {getAvailableTxTypes(category).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${type === t ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
              {TX_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {inv ? (
          <>
            <input type="number" step="any" placeholder="数量" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="input" />
            <input type="number" step="any" placeholder="单价" value={price} onChange={(e) => setPrice(e.target.value)} required className="input" />
          </>
        ) : (
          <input type="number" step="any" placeholder="金额" value={amount} onChange={(e) => setAmount(e.target.value)} required className="input" />
        )}
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        <input placeholder="备注" value={note} onChange={(e) => setNote(e.target.value)} className="input" />
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg border text-sm">取消</button>
          <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">确认</button>
        </div>
      </form>
    </div>
  );
}
