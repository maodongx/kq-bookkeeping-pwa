"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <Button
        variant="ghost"
        size="sm"
        onPress={() => {
          setPrice(currentPrice?.toString() || "");
          setEditing(true);
        }}
        className="text-accent"
      >
        <span className="font-mono">
          {currentPrice != null ? formatCurrency(currentPrice, currency) : "-"}
        </span>
        <Pencil size={14} />
      </Button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Input
        type="number"
        step="any"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-28"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button
        variant="ghost"
        size="icon-xs"
        onPress={handleSave}
        isDisabled={saving}
        className="text-success"
      >
        <Check />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        onPress={() => setEditing(false)}
      >
        <X />
      </Button>
    </div>
  );
}
