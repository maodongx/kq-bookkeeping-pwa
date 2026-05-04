"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AssetCategory, TransactionType } from "@/lib/types";
import { getAvailableTxTypes, TX_TYPE_LABELS, isInvestment } from "@/lib/currency";
import { Card, Button, Input } from "@heroui/react";

export function AddTransactionForm({
  assetId,
  category,
}: {
  assetId: string;
  category: AssetCategory;
}) {
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
      asset_id: assetId,
      type,
      quantity: inv ? qty : amt,
      price: p,
      amount: amt,
      date,
      note: note.trim() || null,
    });

    if (error) {
      alert(error.message);
    } else {
      setOpen(false);
      setQuantity("");
      setPrice("");
      setAmount("");
      setNote("");
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
          <div className="flex flex-wrap gap-1">
            {getAvailableTxTypes(category).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={type === t ? "primary" : "secondary"}
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
            <Button type="button" variant="outline" className="flex-1" onPress={() => setOpen(false)}>
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
