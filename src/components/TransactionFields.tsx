"use client";

import type { Key } from "@heroui/react";
import { Input, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { AssetCategory, TransactionType } from "@/lib/types";
import {
  getAvailableTxTypes,
  isInvestment,
  TX_TYPE_LABELS,
} from "@/lib/currency";

/**
 * Shape of the transaction form fields. String-typed because that's what
 * native <input type="number"> gives us; the numeric conversion happens
 * once in `deriveTxPayload` at submit time.
 */
export interface TransactionFormValues {
  type: TransactionType;
  quantity: string;
  price: string;
  amount: string;
  date: string;
  note: string;
}

/**
 * Payload ready to hand to Supabase's `transactions.insert` or `update`.
 * Quantity, price, and amount are already coerced to numbers; note is
 * nulled when empty so the column stays sparse.
 */
export interface TransactionPayload {
  type: TransactionType;
  quantity: number;
  price: number;
  amount: number;
  date: string;
  note: string | null;
}

/**
 * Convert form values + category into a DB-ready payload. Centralizes the
 * "investments track qty×price, non-investments track amount with price=1"
 * arithmetic that was previously duplicated in AddTransactionForm and
 * TransactionRow. Keeping it next to the fields component means the two
 * can never drift.
 */
export function deriveTxPayload(
  values: TransactionFormValues,
  category: AssetCategory
): TransactionPayload {
  const inv = isInvestment(category);
  const qty = inv ? parseFloat(values.quantity) : parseFloat(values.amount);
  const p = inv ? parseFloat(values.price) : 1;
  const amt = inv ? qty * p : parseFloat(values.amount);
  return {
    type: values.type,
    quantity: inv ? qty : amt,
    price: p,
    amount: amt,
    date: values.date,
    note: values.note.trim() || null,
  };
}

/**
 * Controlled form fields for a transaction. Parents own the state via
 * `values` + `onChange`. The fields rendered are category-aware:
 *   - Investments (buy/sell): quantity + unit price.
 *   - Everything else: a single amount field.
 * The type picker is always a `ToggleButtonGroup` fed by
 * `getAvailableTxTypes(category)`, so investments show `买入 / 卖出` and
 * the balance model shows `存入 / 取出 / 调整`.
 */
export function TransactionFields({
  values,
  onChange,
  category,
}: {
  values: TransactionFormValues;
  onChange: <K extends keyof TransactionFormValues>(
    key: K,
    value: TransactionFormValues[K]
  ) => void;
  category: AssetCategory;
}) {
  const inv = isInvestment(category);
  const availableTypes = getAvailableTxTypes(category);

  return (
    <>
      <ToggleButtonGroup
        aria-label="交易类型"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={new Set<Key>([values.type])}
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (next) onChange("type", next as TransactionType);
        }}
      >
        {availableTypes.map((t, i) => (
          <ToggleButton key={t} id={t}>
            {i > 0 && <ToggleButtonGroup.Separator />}
            {TX_TYPE_LABELS[t]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {inv ? (
        <>
          <Input
            type="number"
            step="any"
            placeholder="数量"
            value={values.quantity}
            onChange={(e) => onChange("quantity", e.target.value)}
            required
          />
          <Input
            type="number"
            step="any"
            placeholder="单价"
            value={values.price}
            onChange={(e) => onChange("price", e.target.value)}
            required
          />
        </>
      ) : (
        <Input
          type="number"
          step="any"
          placeholder="金额"
          value={values.amount}
          onChange={(e) => onChange("amount", e.target.value)}
          required
        />
      )}

      <Input
        type="date"
        value={values.date}
        onChange={(e) => onChange("date", e.target.value)}
      />
      <Input
        placeholder="备注"
        value={values.note}
        onChange={(e) => onChange("note", e.target.value)}
      />
    </>
  );
}
