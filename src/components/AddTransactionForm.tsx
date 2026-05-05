"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AssetCategory } from "@/lib/types";
import { getAvailableTxTypes } from "@/lib/currency";
import { todayLocal } from "@/lib/date";
import { Card, Button, toast } from "@heroui/react";
import {
  TransactionFields,
  TransactionFormValues,
  deriveTxPayload,
} from "./TransactionFields";

function initialValues(category: AssetCategory): TransactionFormValues {
  return {
    type: getAvailableTxTypes(category)[0],
    quantity: "",
    price: "",
    amount: "",
    date: todayLocal(),
    note: "",
  };
}

export function AddTransactionForm({
  assetId,
  category,
}: {
  assetId: string;
  category: AssetCategory;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<TransactionFormValues>(() =>
    initialValues(category)
  );
  const [loading, setLoading] = useState(false);

  function update<K extends keyof TransactionFormValues>(
    key: K,
    value: TransactionFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("transactions")
      .insert({ asset_id: assetId, ...deriveTxPayload(values, category) });

    if (error) {
      toast.danger("保存失败", { description: error.message });
    } else {
      setOpen(false);
      setValues(initialValues(category));
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
          <TransactionFields
            values={values}
            onChange={update}
            category={category}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onPress={() => setOpen(false)}
            >
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
