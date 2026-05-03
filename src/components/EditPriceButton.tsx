"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

export function EditPriceButton({
  assetId,
  currentPrice,
  currency,
}: {
  assetId: string;
  currentPrice: number | null;
  currency: Currency;
}) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(currentPrice?.toString() || "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    const parsed = parseFloat(price);
    if (isNaN(parsed) || parsed < 0) return;

    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("assets")
      .update({
        current_price: parsed,
        last_price_update: new Date().toISOString(),
      })
      .eq("id", assetId);

    setEditing(false);
    setSaving(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setPrice(currentPrice?.toString() || "");
          setEditing(true);
        }}
        className="inline-flex items-center gap-1 text-blue-600"
      >
        <span className="font-mono">
          {currentPrice != null ? formatCurrency(currentPrice, currency) : "-"}
        </span>
        <Pencil size={14} />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="number"
        step="any"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="input w-28 text-sm py-1 px-2"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="p-1 text-green-600 active:bg-green-50 rounded"
      >
        <Check size={16} />
      </button>
      <button
        onClick={() => setEditing(false)}
        className="p-1 text-gray-400 active:bg-gray-50 rounded"
      >
        <X size={16} />
      </button>
    </div>
  );
}
