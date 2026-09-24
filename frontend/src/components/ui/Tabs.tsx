'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
  badge?: string;
}

export interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Tabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className = '',
  size = 'md',
}: TabsProps<T>) {
  const sizeStyles = {
    sm: 'p-1 gap-1 text-xs',
    md: 'p-1.5 gap-1.5 text-xs sm:text-sm',
  };

  return (
    <div
      className={clsx(
        'bg-app-subtle/80 dark:bg-app-surface/90 border border-app-border rounded-btn flex items-center overflow-x-auto no-scrollbar select-none',
        sizeStyles[size],
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            role="tab"
            aria-selected={isActive}
            className={clsx(
              'flex items-center gap-2 px-3.5 py-2 rounded-btn font-semibold transition-all duration-150 shrink-0 select-none tap-active cursor-pointer',
              isActive
                ? 'bg-app-surface text-brand-primary shadow-soft-xs border border-app-border'
                : 'text-app-muted hover:text-app-text hover:bg-app-subtle/50',
            )}
          >
            {Icon && (
              <Icon
                className={clsx(
                  'w-4 h-4 transition-colors',
                  isActive ? 'text-brand-primary' : 'text-app-muted',
                )}
              />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                  isActive
                    ? 'bg-brand-primary/15 text-brand-primary'
                    : 'bg-app-subtle text-app-muted',
                )}
              >
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-success/20 text-brand-success animate-pulse">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
