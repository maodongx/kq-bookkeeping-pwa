"use client";

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
 * modal. Circular lavender icon with label below.
 */
export function CategoryIcon({ category, onTap }: CategoryIconProps) {
  const IconComponent = CATEGORY_ICONS[category.icon] ?? CATEGORY_ICON_FALLBACK;
  return (
    <button
      type="button"
      onClick={() => onTap(category)}
      className="flex flex-col items-center gap-2 transition-transform active:scale-95"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E6E0F8]">
        <IconComponent size={26} className="text-[#7C3AED]" />
      </div>
      <span className="w-full truncate text-center text-xs text-foreground">
        {category.name}
      </span>
    </button>
  );
}
