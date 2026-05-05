"use client";

import { useState } from "react";
import { Input, Label, Modal, TextField } from "@heroui/react";
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
 * Bottom-sheet-style modal that opens when a category tile is tapped.
 * Amount → keypad; notes + date are optional plain inputs below.
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
            <div className="flex flex-col gap-4">
              <NumericKeypad
                value={amount}
                onChange={setAmount}
                onConfirm={handleConfirm}
              />
              <TextField>
                <Label>备注</Label>
                <Input
                  placeholder="可选"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  variant="secondary"
                />
              </TextField>
              <TextField>
                <Label>日期</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  variant="secondary"
                />
              </TextField>
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
