import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps {
  variant?: 'active' | 'warning' | 'error' | 'info' | 'neutral' | 'purple' | 'primary' | 'success';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  size?: 'sm' | 'md';
}

export function Badge({
  variant = 'neutral',
  children,
  className,
  dot = true,
  size = 'md',
}: BadgeProps) {
  const variantStyles = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    primary: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    neutral: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/20 dark:border-slate-700/60',
  }[variant];

  const dotStyles = {
    active: 'bg-emerald-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500 animate-pulse',
    error: 'bg-rose-500',
    info: 'bg-blue-500',
    primary: 'bg-brand-primary',
    purple: 'bg-purple-500',
    neutral: 'bg-slate-400',
  }[variant];

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-[11px] px-2.5 py-0.5 gap-1.5',
  }[size];

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-semibold border tracking-wide select-none',
        variantStyles,
        sizeStyles,
        className,
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotStyles)} />}
      <span className="truncate">{children}</span>
    </span>
  );
}
