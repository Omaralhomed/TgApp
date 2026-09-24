'use client';

import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
}) => {
  return (
    <div className="py-16 px-6 text-center rounded-apple-xl bg-surface-default/40 border border-border border-dashed backdrop-blur-xl animate-fade-in">
      <div className="w-14 h-14 rounded-apple-lg bg-apple-blue/10 text-apple-blue border border-apple-blue/20 flex items-center justify-center mx-auto mb-4 shadow-apple-sm">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1.5 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button
            onClick={onAction}
            size="sm"
            variant="primary"
            leftIcon={actionIcon}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
