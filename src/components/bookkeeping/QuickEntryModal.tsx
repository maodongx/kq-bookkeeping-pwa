"use client";

import { useState } from "react";
import type { Key } from "@heroui/react";
import {
  Button,
  Input,
  Modal,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { NumericKeypad } from "./NumericKeypad";
import { todayLocal } from "@/lib/date";
import { CURRENCY_SYMBOLS } from "@/lib/currency";
import type { Currency } from "@/lib/types";
import type { SpendingCategory } from "@/lib/bookkeeping-types";

interface QuickEntryModalProps {
  category: SpendingCategory | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: {
    categoryId: string;
    amount: number;
    currency: Currency;
    date: string;
    notes: string | null;
  }) => void;
}

const CURRENCIES: Currency[] = ["JPY", "USD", "CNY"];

/**
 * Spending entry modal. Layout top-to-bottom:
 *
 *   备注: [_______________]          ← notes (compact, at top)
 *   [JPY|USD|CNY]       ¥ 1,234      ← currency picker + amount readout
 *   ┌───┬───┬───┐
 *   │ 7 │ 8 │ 9 │
 *   │ 4 │ 5 │ 6 │                    ← phone-dialer keypad
 *   │ 1 │ 2 │ 3 │
 *   │ . │ 0 │ ⌫ │
 *   └───┴───┴───┘
 *   [date]   [  确认  ]              ← bottom row
 */
export function QuickEntryModal({
  category,
  isOpen,
  onClose,
  onSave,
}: QuickEntryModalProps) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayLocal());
  // Default to JPY — daily spending in Japan is almost always yen. Users
  // who pay in USD or CNY can flip per-entry via the toggle.
  const [currency, setCurrency] = useState<Currency>("JPY");

  const reset = () => {
    setAmount("");
    setNotes("");
    setDate(todayLocal());
    setCurrency("JPY");
  };

  const handleConfirm = () => {
    if (!category || !amount || parseFloat(amount) === 0) return;
    onSave({
      categoryId: category.id,
      amount: parseFloat(amount),
      currency,
      date,
      notes: notes.trim() || null,
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canConfirm =
    !!amount && amount !== "0" && amount !== "." && amount !== "0.";

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[420px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{category?.name}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-3">
              {/* Notes — compact single-line input at the top */}
              <Input
                placeholder="备注（可选）"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                variant="secondary"
              />

              {/* Currency picker + amount readout — same row, opposite sides.
                  ToggleButtonGroup matches the pattern used by CurrencySwitcher
                  on the dashboard so the two stay visually consistent. */}
              <div className="flex items-center justify-between gap-2 py-1">
                <ToggleButtonGroup
                  aria-label="货币"
                  selectionMode="single"
                  disallowEmptySelection
                  selectedKeys={new Set<Key>([currency])}
                  onSelectionChange={(keys) => {
                    const next = [...keys][0];
                    if (next) setCurrency(next as Currency);
                  }}
                >
                  {CURRENCIES.map((c, i) => (
                    <ToggleButton key={c} id={c}>
                      {i > 0 && <ToggleButtonGroup.Separator />}
                      {c}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                <div className="text-right text-4xl font-semibold tabular-nums">
                  {CURRENCY_SYMBOLS[currency]}
                  {amount || "0"}
                </div>
              </div>

              {/* Numeric keypad */}
              <NumericKeypad value={amount} onChange={setAmount} />

              {/* Date + Confirm — share the bottom row */}
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  variant="secondary"
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="lg"
                  onPress={handleConfirm}
                  isDisabled={!canConfirm}
                >
                  确认
                </Button>
              </div>
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
