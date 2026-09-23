import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const byVariant: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-white shadow-sm hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent-ring",
  secondary:
    "bg-white text-text border border-line shadow-sm hover:bg-canvas focus-visible:ring-2 focus-visible:ring-neutral-300",
  ghost: "text-text hover:bg-canvas focus-visible:ring-2 focus-visible:ring-neutral-300"
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        byVariant[variant],
        className
      )}
      {...props}
    />
  );
}
