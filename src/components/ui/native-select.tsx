import * as React from "react";
import { cn } from "@/lib/utils";

function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-xl border border-border bg-field px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { NativeSelect };
