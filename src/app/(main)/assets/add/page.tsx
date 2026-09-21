"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@heroui/react";
import { todayLocal } from "@/lib/date";
import { isInvestment } from "@/lib/currency";
import {
  AssetForm,
  AssetFormValues,
  resolveFundProvider,
} from "@/components/AssetForm";

export default function AddAssetPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: AssetFormValues) {
    setLoading(true);

    const { data: asset, error } = await supabase
      .from("assets")
      .insert({
        name: values.name.trim(),
        category: values.category,
        currency: values.currency,
        symbol: values.symbol.trim() || null,
        fund_provider: resolveFundProvider(values.category, values.fundProvider),
        tag: values.tag || null,
        risk_level: values.riskLevel || null,
        note: values.note.trim() || null,
      })
      .select()
      .single();

    if (error || !asset) {
      toast.danger("添加失败", { description: error?.message });
      setLoading(false);
      return;
    }

    // Seed a deposit transaction for non-investment assets so the initial
    // balance is reflected in the ledger.
    const initialAmt = parseFloat(values.initialBalance);

    if (!isInvestment(values.category) && Number.isFinite(initialAmt) && initialAmt !== 0) {
      const { error: txError } = await supabase.from("transactions").insert({
        asset_id: asset.id,
        type: initialAmt > 0 ? "deposit" : "withdraw",
        quantity: Math.abs(initialAmt),
        price: 1,
        amount: Math.abs(initialAmt),
        date: todayLocal(),
      });

      // The asset row already exists, so don't pretend the whole thing failed —
      // but do say the balance didn't land. Silently swallowing this left the
      // user on the asset list looking at a ¥0 account with no explanation,
      // whose only repair path (更新余额) books the balance as market gain.
      if (txError) {
        toast.warning("资产已创建，但初始余额未保存", {
          description: txError.message,
        });
        router.push(`/assets/${asset.id}`);
        router.refresh();
        return;
      }
    }

    router.push("/assets");
    router.refresh();
  }

  return (
    <AssetForm
      mode="create"
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
      submitting={loading}
    />
  );
}
