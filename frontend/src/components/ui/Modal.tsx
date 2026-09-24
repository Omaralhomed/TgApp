'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  footer?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'lg',
  footer,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-6xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm transition-opacity animate-fade-in"
      />

      {/* Modal Dialog */}
      <div
        className={clsx(
          'relative w-full rounded-t-3xl sm:rounded-modal bg-app-surface border border-app-border shadow-soft-xl z-10 flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-slide-up sm:animate-scale-in transition-all text-start',
          maxWidthClass,
        )}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-app-border flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-9 h-9 rounded-btn bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-app-text">{title}</h3>
              {subtitle && <p className="text-xs text-app-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-app-muted hover:text-app-text p-1.5 rounded-btn hover:bg-app-subtle transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-app-border bg-app-subtle/50 dark:bg-app-subtle/20 flex items-center justify-end gap-3 rounded-b-modal">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
