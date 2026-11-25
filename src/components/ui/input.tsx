import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-line bg-field px-3 text-[15px] text-paper outline-none transition-colors placeholder:text-faint focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/30",
        className,
      )}
      {...props}
    />
  );
}
