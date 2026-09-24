'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'outline' | 'bento';
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', variant = 'default', hoverable = false, ...props }, ref) => {
    const baseStyles = 'rounded-card border transition-all duration-200';

    const variantStyles = {
      default: 'bg-app-card border-app-border shadow-soft-xs text-app-text',
      glass: 'modern-glass text-app-text shadow-soft-sm',
      elevated: 'bg-app-elevated border-app-border shadow-soft-md text-app-text',
      outline: 'bg-transparent border-app-border hover:border-app-borderStrong text-app-text',
      bento: 'bg-app-card border-app-border shadow-soft-xs hover:shadow-soft-md text-app-text',
    };

    const hoverStyles = hoverable
      ? 'hover:-translate-y-0.5 hover:shadow-soft-md hover:border-app-borderStrong cursor-pointer'
      : '';

    return (
      <div
        ref={ref}
        className={clsx(baseStyles, variantStyles[variant], hoverStyles, className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={clsx('p-5 pb-3 border-b border-app-border flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => <div className={clsx('p-5', className)} {...props}>{children}</div>;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={clsx('p-4 pt-3 border-t border-app-border bg-app-subtle/30 rounded-b-card flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);
