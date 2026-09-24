'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'danger' | 'ghost' | 'success' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold tracking-tight transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:opacity-40 disabled:pointer-events-none tap-active select-none cursor-pointer';

    const sizeStyles = {
      xs: 'text-xs px-2.5 py-1 rounded-btn gap-1.5 min-h-[28px]',
      sm: 'text-xs px-3 py-1.5 rounded-btn gap-1.5 min-h-[34px]',
      md: 'text-xs sm:text-sm px-4 py-2.5 rounded-btn gap-2 min-h-[40px]',
      lg: 'text-sm sm:text-base px-5 py-3 rounded-card gap-2.5 min-h-[46px]',
    };

    const variantStyles = {
      primary:
        'bg-brand-primary hover:bg-[#0062CC] text-white shadow-soft-sm shadow-brand-primary/25 hover:shadow-soft-md border border-brand-primary/20',
      secondary:
        'bg-app-subtle hover:bg-app-subtle/90 dark:bg-app-surface dark:hover:bg-app-elevated text-app-text border border-app-border hover:border-app-borderStrong shadow-soft-xs',
      glass:
        'bg-app-surface/80 hover:bg-app-surface text-app-text border border-app-border backdrop-blur-md shadow-soft-xs hover:border-app-borderStrong',
      outline:
        'bg-transparent hover:bg-app-subtle dark:hover:bg-app-surface text-app-text border border-app-border hover:border-app-borderStrong',
      danger:
        'bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger border border-brand-danger/20 hover:border-brand-danger/40',
      success:
        'bg-brand-success/10 hover:bg-brand-success/20 text-brand-success border border-brand-success/20 hover:border-brand-success/40',
      ghost:
        'bg-transparent hover:bg-app-subtle dark:hover:bg-app-surface text-app-muted hover:text-app-text',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0 flex items-center justify-center">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="shrink-0 flex items-center justify-center">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
