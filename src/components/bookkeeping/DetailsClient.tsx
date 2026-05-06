"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "@heroui/react";
import { formatCurrency } from "@/lib/currency";
import { convertCurrency, type RateMap } from "@/lib/exchange-rates";
import { daysAgoLocal, todayLocal } from "@/lib/date";
import {
  SPENDING_CATEGORIES,
  getSpendingTransactions,
  createSpendingTransaction,
  updateSpendingTransaction,
  deleteSpendingTransaction,
} from "@/lib/bookkeeping-data";
import type { SpendingTransaction, SpendingCategory } from "@/lib/bookkeeping-types";
import type { Currency } from "@/lib/types";
import { QuickEntryModal, SpendingEntry } from "./QuickEntryModal";

const categoryMap = new Map(SPENDING_CATEGORIES.map((c) => [c.id, c]));

/** Group transactions by date, sorted descending. */
function groupByDate(txs: SpendingTransaction[]): Map<string, SpendingTransaction[]> {
  const map = new Map<string, SpendingTransaction[]>();
  for (const tx of txs) {
    const list = map.get(tx.date) ?? [];
    list.push(tx);
    map.set(tx.date, list);
  }
  // Sort dates descending
  return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

interface DetailsClientProps {
  /** User's default currency — all displayed amounts are converted to this. */
  displayCurrency: Currency;
  /** Latest rate snapshot, keyed by (base, target). */
  rates: RateMap;
}

export function DetailsClient({ displayCurrency, rates }: DetailsClientProps) {
  const [transactions, setTransactions] = useState<SpendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SpendingCategory | null>(null);
  const [editingTx, setEditingTx] = useState<SpendingTransaction | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);

  // Fetch last 90 days of transactions. Bounds are in the user's local
  // timezone to match how `tx.date` is stored (local YYYY-MM-DD),
  // avoiding off-by-one at midnight UTC.
  useEffect(() => {
    const startStr = daysAgoLocal(90);
    const endStr = todayLocal();

    getSpendingTransactions(startStr, endStr)
      .then(setTransactions)
      .catch(() => toast.danger("加载失败"))
      .finally(() => setLoading(false));
  }, []);

  const grouped = groupByDate(transactions);

  // Open modal for adding new tx on a specific date
  const handleAddOnDate = (date: string) => {
    setPrefillDate(date);
    setEditingTx(null);
    setSelectedCategory(null);
    setModalOpen(true);
  };

  // Open modal for editing existing tx
  const handleEditTx = (tx: SpendingTransaction) => {
    setEditingTx(tx);
    setSelectedCategory(categoryMap.get(tx.categoryId) ?? null);
    setPrefillDate(null);
    setModalOpen(true);
  };

  const handleSave = async (entry: SpendingEntry) => {
    try {
      if (editingTx) {
        const updated = await updateSpendingTransaction(editingTx.id, {
          categoryId: entry.categoryId,
          amount: entry.amount,
          currency: entry.currency,
          date: entry.date,
          notes: entry.notes,
        });
        setTransactions((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        toast.success("已更新");
      } else {
        const created = await createSpendingTransaction({
          categoryId: entry.categoryId,
          amount: entry.amount,
          currency: entry.currency,
          date: entry.date,
          notes: entry.notes,
        });
        setTransactions((prev) => [created, ...prev]);
        toast.success("记账成功");
      }
    } catch {
      toast.danger("保存失败");
    }
  };

  const handleDelete = async () => {
    if (!editingTx) return;
    try {
      await deleteSpendingTransaction(editingTx.id);
      setTransactions((prev) => prev.filter((t) => t.id !== editingTx.id));
      toast.success("已删除");
    } catch {
      toast.danger("删除失败");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-default" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-muted">
        <p className="mb-2 text-4xl">📝</p>
        <p>暂无支出记录</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {[...grouped.entries()].map(([date, txs]) => (
          <div key={date}>
            {/* Date header with + button */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-muted">
                {formatDate(date)}
              </span>
              <button
                type="button"
                onClick={() => handleAddOnDate(date)}
                className="flex size-6 items-center justify-center rounded-full bg-[#E6E0F8] text-[#7C3AED] transition-transform active:scale-95"
                aria-label={`添加 ${date} 的支出`}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Transactions for this date */}
            <div className="space-y-2">
              {txs.map((tx) => {
                const cat = categoryMap.get(tx.categoryId);
                // Convert into the user's display currency. The edit
                // modal still shows the native currency — conversion
                // is display-only.
                const converted = convertCurrency(
                  tx.amount,
                  tx.currency,
                  displayCurrency,
                  rates
                );
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => handleEditTx(tx)}
                    className="flex w-full items-center justify-between rounded-xl bg-surface px-3 py-2 text-left transition-transform active:scale-[0.98]"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{cat?.name ?? "未知"}</span>
                      {tx.notes && (
                        <span className="ml-2 text-sm text-muted">{tx.notes}</span>
                      )}
                    </div>
                    <span className="shrink-0 tabular-nums">
                      {formatCurrency(converted, displayCurrency)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <QuickEntryModal
        key={editingTx?.id ?? prefillDate ?? "new"}
        category={selectedCategory}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTx(null);
          setPrefillDate(null);
          setSelectedCategory(null);
        }}
        onSave={handleSave}
        initialValues={
          editingTx
            ? {
                amount: editingTx.amount,
                currency: editingTx.currency,
                date: editingTx.date,
                notes: editingTx.notes,
              }
            : prefillDate
              ? { amount: 0, currency: "JPY", date: prefillDate, notes: null }
              : null
        }
        onDelete={editingTx ? handleDelete : undefined}
        showCategoryPicker={!editingTx && !selectedCategory}
      />
    </>
  );
}

function formatDate(dateStr: string): string {
  // Compare against local-date helpers — `tx.date` is stored local,
  // so comparing against UTC-derived strings would mislabel near
  // midnight (e.g. a real-yesterday tx reading as "今天").
  if (dateStr === todayLocal()) return "今天";
  if (dateStr === daysAgoLocal(1)) return "昨天";

  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}
