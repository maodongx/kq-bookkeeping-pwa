"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Asset } from "@/lib/types";
import {
  AssetForm,
  AssetFormValues,
  EMPTY_VALUES,
} from "@/components/AssetForm";

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [loaded, setLoaded] = useState(false);
  const [initialValues, setInitialValues] =
    useState<AssetFormValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("assets")
        .select("*")
        .eq("id", params.id)
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
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(values: AssetFormValues) {
    setLoading(true);

    const { error } = await supabase
      .from("assets")
      .update({
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
      .eq("id", params.id);

    if (error) {
      alert("更新失败: " + error.message);
      setLoading(false);
      return;
    }

    router.push(`/assets/${params.id}`);
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
