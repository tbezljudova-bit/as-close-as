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
        "inline-flex border border-line bg-transparent",
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
        "rounded-none border-r border-line px-3 py-1.5 text-[13px] text-muted transition-colors last:border-r-0 hover:text-paper focus-visible:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold data-[state=on]:bg-[#15171B] data-[state=on]:text-white",
        className,
      )}
      {...props}
    />
  );
}
