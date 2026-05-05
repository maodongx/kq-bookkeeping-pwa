"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@heroui/react";
import { Asset } from "@/lib/types";
import {
  AssetForm,
  AssetFormValues,
  EMPTY_VALUES,
  resolveFundProvider,
} from "@/components/AssetForm";

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { id } = params;

  const [loaded, setLoaded] = useState(false);
  const [initialValues, setInitialValues] =
    useState<AssetFormValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);

  // createClient() is constructed inside the effect (and again inside
  // handleSubmit) rather than at render — that way React can include the
  // effect's real dependencies without pulling in an unstable supabase
  // reference that would re-fire the fetch on every render.
  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data } = await supabase
        .from("assets")
        .select("*")
        .eq("id", id)
        .single();
      if (!data) return;
      const a = data as Asset;
      setInitialValues({
        name: a.name,
        category: a.category,
        currency: a.currency,
        symbol: a.symbol || "",
        fundProvider: a.fund_provider || "mufg",
        tag: a.tag || "",
        riskLevel: a.risk_level || "",
        note: a.note || "",
        initialBalance: "",
      });
      setLoaded(true);
    }
    load();
  }, [id]);

  async function handleSubmit(values: AssetFormValues) {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("assets")
      .update({
        name: values.name.trim(),
        category: values.category,
        currency: values.currency,
        symbol: values.symbol.trim() || null,
        fund_provider: resolveFundProvider(values.category, values.fundProvider),
        tag: values.tag || null,
        risk_level: values.riskLevel || null,
        note: values.note.trim() || null,
      })
      .eq("id", id);

    if (error) {
      toast.danger("更新失败", { description: error.message });
      setLoading(false);
      return;
    }

    router.push(`/assets/${id}`);
    router.refresh();
  }

  if (!loaded) {
    return <div className="p-4 text-sm text-muted">加载中...</div>;
  }

  return (
    <AssetForm
      mode="edit"
      initialValues={initialValues}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
      submitting={loading}
    />
  );
}
