"use client";

import { useState } from "react";
import { Button, Input, Modal } from "@heroui/react";
import { NumericKeypad } from "./NumericKeypad";
import { todayLocal } from "@/lib/date";
import type { SpendingCategory } from "@/lib/bookkeeping-types";

interface QuickEntryModalProps {
  category: SpendingCategory | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: {
    categoryId: string;
    amount: number;
    date: string;
    notes: string | null;
  }) => void;
}

/**
 * Spending entry modal. Layout top-to-bottom:
 *
 *   备注: [_______________]      ← notes (compact, at top)
 *         ¥ 1,234                ← amount readout (right-aligned, prominent)
 *   ┌───┬───┬───┐
 *   │ 7 │ 8 │ 9 │
 *   │ 4 │ 5 │ 6 │                ← phone-dialer keypad
 *   │ 1 │ 2 │ 3 │
 *   │ . │ 0 │ ⌫ │
 *   └───┴───┴───┘
 *   [date]   [  确认  ]          ← bottom row
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

  const reset = () => {
    setAmount("");
    setNotes("");
    setDate(todayLocal());
  };

  const handleConfirm = () => {
    if (!category || !amount || parseFloat(amount) === 0) return;
    onSave({
      categoryId: category.id,
      amount: parseFloat(amount),
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

  const canConfirm = !!amount && amount !== "0" && amount !== "." && amount !== "0.";

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

              {/* Amount readout — big, right-aligned, tabular for stable glyph width */}
              <div className="py-1 text-right text-4xl font-semibold tabular-nums">
                ¥{amount || "0"}
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
