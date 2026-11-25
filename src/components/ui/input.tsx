import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-none border border-line bg-transparent px-3 text-sm text-paper outline-none transition-colors placeholder:text-faint focus-visible:border-gold",
        className,
      )}
      {...props}
    />
  );
}
