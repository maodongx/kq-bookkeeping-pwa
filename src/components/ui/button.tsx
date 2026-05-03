"use client";

import { Button as HeroButton, type ButtonProps } from "@heroui/react";
import { cn } from "@/lib/utils";

type ShadcnVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
type ShadcnSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

const variantMap: Record<ShadcnVariant, ButtonProps["variant"]> = {
  default: "primary",
  outline: "outline",
  secondary: "secondary",
  ghost: "ghost",
  destructive: "danger",
  link: "ghost",
};

const sizeMap: Record<ShadcnSize, ButtonProps["size"]> = {
  default: "md",
  xs: "sm",
  sm: "sm",
  lg: "lg",
  icon: "md",
  "icon-xs": "sm",
  "icon-sm": "sm",
  "icon-lg": "lg",
};

const iconSizes = new Set<string>(["icon", "icon-xs", "icon-sm", "icon-lg"]);

interface CompatButtonProps extends Omit<ButtonProps, "variant" | "size"> {
  variant?: ShadcnVariant;
  size?: ShadcnSize;
  disabled?: boolean;
}

function Button({
  variant = "default",
  size = "default",
  disabled,
  isDisabled,
  className,
  ...props
}: CompatButtonProps) {
  return (
    <HeroButton
      variant={variantMap[variant]}
      size={sizeMap[size]}
      isIconOnly={iconSizes.has(size)}
      isDisabled={isDisabled ?? disabled}
      className={cn(
        variant === "link" && "underline-offset-4 hover:underline",
        className,
      )}
      {...props}
    />
  );
}

export { Button };
