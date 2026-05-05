"use client";

import { useState } from "react";
import { Button, Input, Label, Modal, TextField, toast } from "@heroui/react";
import { NativeSelect } from "@/components/ui/native-select";
import { upsertCategoryBudget } from "@/lib/bookkeeping-data";
import type { Currency } from "@/lib/types";
import type {
  CategoryBudget,
  SpendingCategory,
} from "@/lib/bookkeeping-types";

interface BudgetSettingsModalProps {
  userId: string;
  category: SpendingCategory;
  currentBudget: CategoryBudget | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (budget: CategoryBudget) => void;
}

const CURRENCY_OPTIONS: Array<{ value: Currency; label: string }> = [
  { value: "JPY", label: "¥ JPY" },
  { value: "USD", label: "$ USD" },
  { value: "CNY", label: "¥ CNY" },
];

/**
 * Edit (or create) the monthly budget for one category. userId is passed
 * in rather than re-fetched — the parent page already trusted layout-
 * level auth — so saving doesn't re-hit auth.getUser().
 */
export function BudgetSettingsModal({
  userId,
  category,
  currentBudget,
  isOpen,
  onClose,
  onSave,
}: BudgetSettingsModalProps) {
  const [amount, setAmount] = useState(
    String(currentBudget?.monthlyBudget ?? "")
  );
  const [currency, setCurrency] = useState<Currency>(
    currentBudget?.currency ?? "JPY"
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount < 0) return;

    setIsSaving(true);
    try {
      const saved = await upsertCategoryBudget({
        userId,
        categoryId: category.id,
        monthlyBudget: numAmount,
        currency,
      });
      onSave(saved);
      toast.success("预算已保存");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.danger("保存失败，请重试", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[400px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{category.name} 预算设置</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-4">
              <TextField>
                <Label>月度预算</Label>
                <Input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  variant="secondary"
                />
              </TextField>
              <TextField>
                <Label>货币</Label>
                <NativeSelect
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </NativeSelect>
              </TextField>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              取消
            </Button>
            <Button
              variant="primary"
              onPress={handleSave}
              isDisabled={isSaving}
            >
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
