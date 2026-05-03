"use client";

import { useState } from "react";
import { AssetCategory, Currency, Transaction } from "@/lib/types";
import { Card } from "@heroui/react";
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
    <Card>
      <Card.Header>
        <Card.Title>交易记录 ({transactions.length})</Card.Title>
      </Card.Header>
      <Card.Content>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted">暂无</p>
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
      </Card.Content>
    </Card>
  );
}
