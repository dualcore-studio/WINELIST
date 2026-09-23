import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-lg border border-transparent bg-field px-3 text-sm text-text outline-none transition-colors placeholder:text-neutral-400 focus:border-accent/30 focus:bg-white focus:ring-2 focus:ring-accent-ring",
          className
        )}
        {...props}
      />
    );
  }
);
