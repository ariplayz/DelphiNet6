import React from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  secondary: 'bg-bg-elevated border border-border text-text-primary hover:bg-bg-hover',
  danger: 'bg-danger text-white hover:opacity-90',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 min-h-[40px] sm:min-h-[36px]',
  md: 'text-sm px-4 py-2 min-h-[44px]',
  lg: 'text-base px-5 py-2.5 min-h-[52px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors touch-manipulation select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </button>
  );
}
