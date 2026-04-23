import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const byVariant: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-brand text-white hover:bg-[#e66e00] focus-visible:ring-2 focus-visible:ring-brand/40",
  secondary:
    "bg-white text-text border border-neutral-200 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-300",
  ghost: "text-text hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-300"
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
        "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        byVariant[variant],
        className
      )}
      {...props}
    />
  );
}
