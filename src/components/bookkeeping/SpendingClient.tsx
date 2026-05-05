"use client";

import { useState } from "react";
import { toast } from "@heroui/react";
import { CategoryIcon } from "./CategoryIcon";
import { QuickEntryModal } from "./QuickEntryModal";
import {
  SPENDING_CATEGORIES,
  createSpendingTransaction,
} from "@/lib/bookkeeping-data";
import type { SpendingCategory } from "@/lib/bookkeeping-types";

interface SpendingClientProps {
  userId: string;
}

export function SpendingClient({ userId }: SpendingClientProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<SpendingCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCategoryTap = (category: SpendingCategory) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleSave = async (entry: {
    categoryId: string;
    amount: number;
    date: string;
    notes: string | null;
  }) => {
    try {
      await createSpendingTransaction({
        userId,
        categoryId: entry.categoryId,
        amount: entry.amount,
        currency: "JPY",
        date: entry.date,
        notes: entry.notes,
      });
      toast.success("记账成功");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.danger("保存失败，请重试", { description: message });
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {SPENDING_CATEGORIES.map((category) => (
          <CategoryIcon
            key={category.id}
            category={category}
            onTap={handleCategoryTap}
          />
        ))}
      </div>
      <QuickEntryModal
        category={selectedCategory}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
