"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import { todayUTC } from "@/lib/date";
import { Button, Input, toast } from "@heroui/react";

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
    if (saving) return;

    const parsed = parseFloat(price);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.danger("请输入大于 0 的价格");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const today = todayUTC();

    // Write the snapshot as well as `current_price`. Without it a manual
    // correction never entered price history, so the net-worth chart and the
    // assets tab's 当日 / 近1月 returns kept using the stale snapshot for that
    // day — the correction showed up in 总资产 but nowhere else.
    const [assetResult, snapshotResult] = await Promise.all([
      supabase
        .from("assets")
        .update({
          current_price: parsed,
          last_price_update: new Date().toISOString(),
        })
        .eq("id", assetId),
      supabase
        .from("asset_price_snapshots")
        .upsert(
          { asset_id: assetId, price: parsed, date: today },
          { onConflict: "asset_id,date" }
        ),
    ]);

    setSaving(false);

    // Stay in edit mode on failure — silently closing made a rejected write
    // look like the app had reverted the user's input.
    if (assetResult.error) {
      toast.danger("保存失败", { description: assetResult.error.message });
      return;
    }
    if (snapshotResult.error) {
      toast.warning("价格已更新，但历史快照保存失败", {
        description: snapshotResult.error.message,
      });
    }

    setEditing(false);
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
        size="sm"
        isIconOnly
        onPress={handleSave}
        isDisabled={saving}
        className="text-success"
      >
        <Check />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        onPress={() => setEditing(false)}
      >
        <X />
      </Button>
    </div>
  );
}
