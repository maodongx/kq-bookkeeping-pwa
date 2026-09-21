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
 * Validate form values before they reach the DB. Returns a user-facing message
 * describing the first problem, or `null` when the values are usable.
 *
 * `<input type="number" required>` blocks *empty* fields but happily accepts a
 * leading minus or a zero. A negative 买入 quantity used to sail through and
 * then *decrement* `totalQty` and `totalCost` inside `computeHolding`, so the
 * position's market value, its 平均成本, and the dashboard's capital-flow total
 * all silently went wrong with no way to tell from the UI that anything was
 * off.
 *
 * `heldQty` is optional and only meaningful when creating a sell: pass the
 * current holding to reject selling more units than exist, which would
 * otherwise drive `totalQty` negative and produce a negative market value.
 */
export function validateTxValues(
  values: TransactionFormValues,
  category: AssetCategory,
  heldQty?: number
): string | null {
  const inv = isInvestment(category);

  if (inv) {
    const qty = parseFloat(values.quantity);
    const price = parseFloat(values.price);
    if (!Number.isFinite(qty) || qty <= 0) return "数量必须大于 0";
    if (!Number.isFinite(price) || price <= 0) return "单价必须大于 0";
    if (values.type === "sell" && heldQty !== undefined && qty > heldQty) {
      return `卖出数量超过持仓 (${heldQty})`;
    }
    return null;
  }

  const amount = parseFloat(values.amount);
  if (!Number.isFinite(amount)) return "请输入有效金额";
  // Adjustments are signed deltas — a negative one is a downward correction
  // and entirely legitimate. Deposits and withdrawals are magnitudes.
  if (values.type !== "adjustment" && amount <= 0) return "金额必须大于 0";
  return null;
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
  currentBalance,
}: {
  values: TransactionFormValues;
  onChange: <K extends keyof TransactionFormValues>(
    key: K,
    value: TransactionFormValues[K]
  ) => void;
  category: AssetCategory;
  /**
   * Current balance of the asset. Only consulted for non-investment
   * categories when the user picks `调整` — the amount input then
   * prompts for the new total balance instead of a delta (mirroring
   * UpdateBalanceForm's UX for bank/cash). Omit on edit forms so the
   * stored delta remains editable as-is.
   */
  currentBalance?: number;
}) {
  const inv = isInvestment(category);
  const availableTypes = getAvailableTxTypes(category);
  const isAdjustment = !inv && values.type === "adjustment";
  const isAdjustmentAsNewBalance = isAdjustment && currentBalance !== undefined;
  // Three distinct meanings for one input, so say which one is in play. The
  // edit form deliberately exposes the stored signed delta rather than a new
  // balance; labelling that "金额" invited users to retype it as a balance and
  // silently book the difference as gain.
  const amountPlaceholder = isAdjustmentAsNewBalance
    ? "新余额"
    : isAdjustment
      ? "调整金额 (增减)"
      : "金额";

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
            min="0"
            placeholder="数量"
            value={values.quantity}
            onChange={(e) => onChange("quantity", e.target.value)}
            required
          />
          <Input
            type="number"
            step="any"
            min="0"
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
          // Adjustments carry a signed delta, so negatives are valid there and
          // only there.
          min={values.type === "adjustment" ? undefined : "0"}
          placeholder={amountPlaceholder}
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
