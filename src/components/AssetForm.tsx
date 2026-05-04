"use client";

import { useState } from "react";
import { Card, Button, Input, Label } from "@heroui/react";
import {
  AssetCategory,
  AssetTag,
  RiskLevel,
  Currency,
  FundProvider,
} from "@/lib/types";
import {
  CATEGORY_LABELS,
  CURRENCY_LABELS,
  TAG_LABELS,
  RISK_LABELS,
  isInvestment,
} from "@/lib/currency";
import { NativeSelect } from "@/components/ui/native-select";

/**
 * The data the form collects. Matches the Asset table columns the user
 * can edit, plus an optional initialBalance that Add uses to seed a
 * deposit transaction for cash/bank accounts.
 */
export interface AssetFormValues {
  name: string;
  category: AssetCategory;
  currency: Currency;
  symbol: string;
  fundProvider: FundProvider;
  tag: AssetTag | "";
  riskLevel: RiskLevel | "";
  note: string;
  initialBalance: string;
}

export const EMPTY_VALUES: AssetFormValues = {
  name: "",
  category: "usStock",
  currency: "USD",
  symbol: "",
  fundProvider: "mufg",
  tag: "",
  riskLevel: "",
  note: "",
  initialBalance: "",
};

/**
 * Derive a sensible default currency when the user picks a new category.
 * US stocks price in USD, JP funds in JPY, CN funds in CNY. Other
 * categories leave the currency alone so the user can choose.
 */
function defaultCurrencyFor(category: AssetCategory): Currency | null {
  if (category === "usStock") return "USD";
  if (category === "jpFund") return "JPY";
  if (category === "cnFund") return "CNY";
  return null;
}

export function AssetForm({
  mode,
  initialValues = EMPTY_VALUES,
  onSubmit,
  onCancel,
  submitting,
}: {
  mode: "create" | "edit";
  initialValues?: AssetFormValues;
  onSubmit: (values: AssetFormValues) => void | Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState<AssetFormValues>(initialValues);

  const inv = isInvestment(values.category);
  const showInitialBalance = mode === "create" && !inv;

  function update<K extends keyof AssetFormValues>(
    key: K,
    value: AssetFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleCategoryChange(c: AssetCategory) {
    setValues((prev) => {
      const next = { ...prev, category: c };
      const auto = defaultCurrencyFor(c);
      if (auto) next.currency = auto;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(values);
  }

  const title = mode === "create" ? "添加资产" : "编辑资产";
  const submitLabel = mode === "create" ? "添加" : "保存";

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">{title}</h1>
      <Card>
        <Card.Content>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="资产类型">
              <NativeSelect
                value={values.category}
                onChange={(e) =>
                  handleCategoryChange(e.target.value as AssetCategory)
                }
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="名称">
              <Input
                value={values.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </Field>

            <Field label="币种">
              <NativeSelect
                value={values.currency}
                onChange={(e) => update("currency", e.target.value as Currency)}
              >
                {Object.entries(CURRENCY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            {inv && (
              <Field label="代码">
                <Input
                  value={values.symbol}
                  onChange={(e) => update("symbol", e.target.value)}
                  placeholder="如 AAPL"
                />
              </Field>
            )}

            {values.category === "jpFund" && (
              <Field label="基金公司">
                <NativeSelect
                  value={values.fundProvider}
                  onChange={(e) =>
                    update("fundProvider", e.target.value as FundProvider)
                  }
                >
                  <option value="mufg">三菱UFJ</option>
                  <option value="rakuten">乐天证券</option>
                  <option value="other">其他</option>
                </NativeSelect>
              </Field>
            )}

            {showInitialBalance && (
              <Field label="初始余额">
                <Input
                  type="number"
                  step="any"
                  value={values.initialBalance}
                  onChange={(e) => update("initialBalance", e.target.value)}
                />
              </Field>
            )}

            <Field label="标签">
              <NativeSelect
                value={values.tag}
                onChange={(e) =>
                  update("tag", e.target.value as AssetTag | "")
                }
              >
                <option value="">无</option>
                {TAG_LABELS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="风险等级">
              <NativeSelect
                value={values.riskLevel}
                onChange={(e) =>
                  update("riskLevel", e.target.value as RiskLevel | "")
                }
              >
                <option value="">无</option>
                {Object.entries(RISK_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="备注">
              <Input
                value={values.note}
                onChange={(e) => update("note", e.target.value)}
              />
            </Field>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onPress={onCancel}
              >
                取消
              </Button>
              <Button
                type="submit"
                className="flex-1"
                isDisabled={submitting || !values.name.trim()}
              >
                {submitting ? "..." : submitLabel}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
