import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, suppressHydrationWarning, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border/90 bg-white/90 px-4 py-2 text-base text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors placeholder:text-muted-foreground/80 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        // Браузерные менеджеры паролей меняют атрибуты до гидрации (aria-autocomplete и т.п.)
        suppressHydrationWarning={
          suppressHydrationWarning ??
          (type === "password" || type === "email" || type === "tel")
        }
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
