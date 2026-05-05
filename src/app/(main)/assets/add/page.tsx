"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@heroui/react";
import { todayLocal } from "@/lib/date";
import {
  AssetForm,
  AssetFormValues,
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
        fund_provider:
          values.category === "jpFund"
            ? values.fundProvider
            : values.category === "cnFund"
              ? "other"
              : null,
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
    const isInvestment =
      values.category === "usStock" ||
      values.category === "jpFund" ||
      values.category === "cnFund";

    if (!isInvestment && !isNaN(initialAmt) && initialAmt > 0) {
      await supabase.from("transactions").insert({
        asset_id: asset.id,
        type: "deposit",
        quantity: initialAmt,
        price: 1,
        amount: initialAmt,
        date: todayLocal(),
      });
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
