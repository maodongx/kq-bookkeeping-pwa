"use client";

import { useState } from "react";
import { AssetCategory, Currency, Transaction } from "@/lib/types";
import { TransactionRow } from "./TransactionRow";

export function TransactionList({
  transactions,
  category,
  currency,
}: {
  transactions: Transaction[];
  category: AssetCategory;
  currency: Currency;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h2 className="font-semibold text-sm mb-2">
        交易记录 ({transactions.length})
      </h2>
      {transactions.length === 0 ? (
        <p className="text-gray-400 text-sm">暂无</p>
      ) : (
        <div>
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              category={category}
              currency={currency}
              isEditing={editingId === tx.id}
              onEditToggle={() =>
                setEditingId(editingId === tx.id ? null : tx.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
