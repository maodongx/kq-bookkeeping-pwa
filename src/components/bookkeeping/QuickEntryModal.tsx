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
import { todayLocal } from "@/lib/date";
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
 * Spending entry modal. Native number input instead of a custom keypad —
 * iPhone surfaces its system numeric keyboard for `type="number"` +
 * `inputMode="decimal"`, which takes less screen real-estate than a
 * rendered keypad and feels more native.
 *
 * Layout top-to-bottom:
 *
 *   [备注（可选）______________]
 *                [JPY|USD|CNY]          ← centered
 *   价格     [0________________]
 *   [date]                   [确认]
 *
 * All Inputs opt into the `input-flat` helper class (defined in
 * globals.css) which suppresses HeroUI's default focus ring. Users
 * tapping between fields in a tight modal found the accent-colored
 * ring visually heavy; rely on the cursor for focus indication
 * instead.
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
    const numeric = parseFloat(amount);
    if (!category || !isFinite(numeric) || numeric <= 0) return;
    onSave({
      categoryId: category.id,
      amount: numeric,
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

  const canConfirm = parseFloat(amount) > 0;

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[400px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{category?.name}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-4">
              {/* Notes — compact single-line input */}
              <Input
                placeholder="备注（可选）"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                variant="secondary"
                className="input-flat"
              />

              {/* Currency switcher, centered */}
              <div className="flex justify-center">
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
              </div>

              {/* Price — inline label + number input */}
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-sm text-muted">价格</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  variant="secondary"
                  className="input-flat flex-1"
                />
              </div>

              {/* Date + Confirm — share the bottom row */}
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  variant="secondary"
                  className="input-flat flex-1"
                />
                <Button
                  variant="primary"
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
