"use client";

import { useState } from "react";
import type { Key } from "@heroui/react";
import {
  Button,
  Input,
  Label,
  Modal,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  toast,
} from "@heroui/react";
import { NativeSelect } from "@/components/ui/native-select";
import { upsertCategoryBudget } from "@/lib/bookkeeping-data";
import type { Currency } from "@/lib/types";
import type {
  CategoryBudget,
  SpendingCategory,
} from "@/lib/bookkeeping-types";

interface BudgetSettingsModalProps {
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

type BudgetType = "monthly" | "annual";

/**
 * Edit (or create) the budget for one category. Budgets are shared
 * across the household, so no user id is needed — the RLS policy lets
 * any authenticated user write.
 *
 * Supports both monthly (resets each month) and annual (Jan 1 - Dec 31)
 * budget types.
 */
export function BudgetSettingsModal({
  category,
  currentBudget,
  isOpen,
  onClose,
  onSave,
}: BudgetSettingsModalProps) {
  const [amount, setAmount] = useState(
    String(currentBudget?.budgetAmount ?? "")
  );
  const [currency, setCurrency] = useState<Currency>(
    currentBudget?.currency ?? "JPY"
  );
  const [budgetType, setBudgetType] = useState<BudgetType>(
    currentBudget?.budgetType ?? "monthly"
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount < 0) return;

    setIsSaving(true);
    try {
      const saved = await upsertCategoryBudget({
        categoryId: category.id,
        budgetAmount: numAmount,
        currency,
        budgetType,
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
              {/* Budget type toggle */}
              <div className="flex justify-center">
                <ToggleButtonGroup
                  aria-label="预算类型"
                  selectionMode="single"
                  disallowEmptySelection
                  selectedKeys={new Set<Key>([budgetType])}
                  onSelectionChange={(keys) => {
                    const next = [...keys][0];
                    if (next) setBudgetType(next as BudgetType);
                  }}
                >
                  <ToggleButton id="monthly">月度</ToggleButton>
                  <ToggleButtonGroup.Separator />
                  <ToggleButton id="annual">年度</ToggleButton>
                </ToggleButtonGroup>
              </div>

              <TextField>
                <Label>{budgetType === "annual" ? "年度预算" : "月度预算"}</Label>
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

              {budgetType === "annual" && (
                <p className="text-xs text-muted">
                  年度预算从1月1日至12月31日，显示全年累计支出和剩余额度
                </p>
              )}
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
