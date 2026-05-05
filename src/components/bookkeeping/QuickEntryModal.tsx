"use client";

import { useEffect, useState } from "react";
import type { Key } from "@heroui/react";
import {
  Button,
  Chip,
  Input,
  Modal,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { todayLocal } from "@/lib/date";
import { getTopNotesForCategory } from "@/lib/bookkeeping-data";
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
  // Top 5 recently-used notes for this category, shown as tappable chips.
  // Re-fetched on every modal open so new entries reshape the ranking.
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Capture just the id so the effect's deps array doesn't depend on the
  // whole category object (which would refire if the parent passed a new
  // reference for the same category). Resetting suggestions back to []
  // is handled by reset() on close/confirm, not here — React Compiler
  // forbids sync state writes at effect-setup time.
  const categoryId = category?.id ?? null;
  useEffect(() => {
    if (!isOpen || !categoryId) return;
    let cancelled = false;
    getTopNotesForCategory(categoryId, 5)
      .then((top) => {
        if (!cancelled) setSuggestions(top);
      })
      .catch(() => {
        // Non-fatal — just no suggestions. The user can still type freely.
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, categoryId]);

  const reset = () => {
    setAmount("");
    setNotes("");
    setDate(todayLocal());
    setCurrency("JPY");
    setSuggestions([]);
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

              {/* Quick-fill chips: top 5 most-used notes for this category.
                  Tap to prefill; user can still edit afterwards. */}
              {suggestions.length > 0 && (
                <div className="-mt-2 flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNotes(s)}
                      className="transition-transform active:scale-95"
                      aria-label={`使用备注 ${s}`}
                    >
                      <Chip variant="tertiary" size="sm">
                        {s}
                      </Chip>
                    </button>
                  ))}
                </div>
              )}

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
