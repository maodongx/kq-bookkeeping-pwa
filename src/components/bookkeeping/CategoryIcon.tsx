"use client";

import { Card } from "@heroui/react";
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_FALLBACK,
} from "@/lib/bookkeeping-data";
import type { SpendingCategory } from "@/lib/bookkeeping-types";

interface CategoryIconProps {
  category: SpendingCategory;
  onTap: (category: SpendingCategory) => void;
}

/**
 * Single tile in the spending-category grid. Tap opens the quick-entry
 * modal. `active:scale-95` gives tactile press feedback on iPhone.
 */
export function CategoryIcon({ category, onTap }: CategoryIconProps) {
  const IconComponent = CATEGORY_ICONS[category.icon] ?? CATEGORY_ICON_FALLBACK;
  return (
    <button
      type="button"
      onClick={() => onTap(category)}
      className="transition-transform active:scale-95"
    >
      <Card className="h-20">
        <Card.Content className="flex flex-col items-center justify-center gap-1 p-2">
          <IconComponent size={28} className="text-accent" />
          <span className="w-full truncate text-center text-sm text-foreground">
            {category.name}
          </span>
        </Card.Content>
      </Card>
    </button>
  );
}
