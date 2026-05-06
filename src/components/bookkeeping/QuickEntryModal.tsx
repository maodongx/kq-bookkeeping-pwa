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
import {
  getTopNotesForCategory,
  SPENDING_CATEGORIES,
  CATEGORY_ICONS,
  CATEGORY_ICON_FALLBACK,
} from "@/lib/bookkeeping-data";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import type { Currency } from "@/lib/types";
import type { SpendingCategory } from "@/lib/bookkeeping-types";

export interface SpendingEntry {
  categoryId: string;
  amount: number;
  currency: Currency;
  date: string;
  notes: string | null;
}

export interface SpendingInitialValues {
  amount: number;
  currency: Currency;
  date: string;
  notes: string | null;
}

interface QuickEntryModalProps {
  category: SpendingCategory | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: SpendingEntry) => void;
  /**
   * When provided, the modal pre-fills with these values and represents
   * editing an existing transaction. The caller is still responsible for
   * actually persisting via `onSave` (e.g. updateSpendingTransaction).
   * Caller should set `key={tx.id}` on the modal so state re-inits when
   * the transaction being edited changes.
   */
  initialValues?: SpendingInitialValues | null;
  /**
   * When provided (edit mode only), renders a muted "删除" button at the
   * bottom that asks for confirmation before firing. Caller handles the
   * actual delete.
   */
  onDelete?: () => void | Promise<void>;
  /**
   * When true, shows a category picker grid before the entry form.
   * Used when adding from /details where no category is pre-selected.
   */
  showCategoryPicker?: boolean;
}

const CURRENCIES: Currency[] = ["JPY", "USD", "CNY"];

/**
 * Spending entry modal. Works for both create (from /spending category
 * tap) and edit (from /analytics transaction row tap) — the `initialValues`
 * and `onDelete` props flip the behavior.
 *
 * Layout top-to-bottom:
 *
 *                [JPY|USD|CNY]          ← currency switcher, centered
 *   [金额____________________]          ← native number input (placeholder only)
 *   [备注（可选）______________]
 *   [chip] [chip] [chip] ...           ← top 5 notes for this category
 *   [date]                     [确认]
 *   (edit mode only) [ 删除 ]          ← muted, centered
 */
export function QuickEntryModal({
  category: categoryProp,
  isOpen,
  onClose,
  onSave,
  initialValues = null,
  onDelete,
  showCategoryPicker = false,
}: QuickEntryModalProps) {
  // Two distinct modes of operation:
  //   - Non-picker (default): `categoryProp` is the source of truth. Used
  //     by /spending (icon tap fixes the category) and by edit flows
  //     (editing an existing tx always has a known category).
  //   - Picker: `categoryProp` is null on open; the user picks inline from
  //     a grid. Used by /details when tapping the "+" on a date with no
  //     pre-selected category.
  // Keeping these separate avoids the props-to-state anti-pattern and the
  // `key` remount hack that was previously layered on top of it.
  const [pickerSelection, setPickerSelection] = useState<SpendingCategory | null>(null);
  const category = showCategoryPicker ? pickerSelection : categoryProp;

  // useState's lazy initializer runs once per mount. Callers editing a
  // different transaction should use `key={tx.id}` on the modal so state
  // re-inits when the transaction being edited changes.
  const [amount, setAmount] = useState(() =>
    initialValues ? String(initialValues.amount) : ""
  );
  const [notes, setNotes] = useState(() => initialValues?.notes ?? "");
  const [date, setDate] = useState(() => initialValues?.date ?? todayLocal());
  const [currency, setCurrency] = useState<Currency>(
    () => initialValues?.currency ?? "JPY"
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [confirmDelete, ConfirmDeleteDialog] = useConfirmDialog();

  // Capture the category id as a stable primitive so the effect's deps
  // don't thrash if the parent passes a new object reference for the
  // same logical category.
  const categoryId = category?.id ?? null;
  useEffect(() => {
    if (!isOpen || !categoryId) return;
    let cancelled = false;
    getTopNotesForCategory(categoryId, 5)
      .then((top) => {
        if (!cancelled) setSuggestions(top);
      })
      .catch(() => {
        // Non-fatal — suggestions are optional UX sugar.
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
    if (showCategoryPicker) setPickerSelection(null);
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

  const handleDelete = async () => {
    if (!onDelete) return;
    const ok = await confirmDelete({
      heading: "确定删除此笔支出？",
      body: "此操作不可恢复。",
      status: "danger",
      confirmLabel: "删除",
    });
    if (!ok) return;
    await onDelete();
    reset();
    onClose();
  };

  const canConfirm = parseFloat(amount) > 0;
  const isEdit = initialValues != null;

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
            <Modal.Heading>
              {showCategoryPicker && !category ? "选择分类" : category?.name}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-4">
              {/* Category picker grid — only when showCategoryPicker and no category selected */}
              {showCategoryPicker && !category && (
                <div className="grid grid-cols-4 gap-3">
                  {SPENDING_CATEGORIES.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.icon] ?? CATEGORY_ICON_FALLBACK;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPickerSelection(cat)}
                        className="flex flex-col items-center gap-1 transition-transform active:scale-95"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E6E0F8]">
                          <Icon size={18} className="text-[#7C3AED]" />
                        </div>
                        <span className="text-xs">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Entry form — only when category is selected */}
              {category && (
                <>
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

              {/* Amount — placeholder only, no external label */}
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                placeholder="金额"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                variant="secondary"
                className="input-flat"
              />

              {/* Notes */}
              <Input
                placeholder="备注（可选）"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                variant="secondary"
                className="input-flat"
              />

              {/* Quick-fill chips */}
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

              {/* Date + Confirm */}
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
                  {isEdit ? "保存" : "确认"}
                </Button>
              </div>

              {/* Delete — only in edit mode */}
              {onDelete && (
                <div className="flex justify-center">
                  <Button
                    variant="tertiary"
                    size="sm"
                    className="text-danger"
                    onPress={handleDelete}
                  >
                    删除
                  </Button>
                </div>
              )}
              </>
              )}
            </div>
            <ConfirmDeleteDialog />
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
