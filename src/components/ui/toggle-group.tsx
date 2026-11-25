import type { ComponentProps } from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "../../lib/utils";

export function ToggleGroup({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn(
        "inline-flex rounded-full border border-line bg-field p-0.5",
        className,
      )}
      {...props}
    />
  );
}

export function ToggleGroupItem({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        "rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold data-[state=on]:bg-paper data-[state=on]:text-ink",
        className,
      )}
      {...props}
    />
  );
}
