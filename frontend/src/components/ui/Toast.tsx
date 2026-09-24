'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 space-y-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
          info: <Info className="w-4 h-4 text-apple-blue shrink-0" />,
        };

        const borderColors = {
          success: 'border-emerald-500/30 bg-slate-950/90 text-white',
          error: 'border-rose-500/30 bg-slate-950/90 text-white',
          info: 'border-blue-500/30 bg-slate-950/90 text-white',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 p-3.5 rounded-apple-xl backdrop-blur-2xl border shadow-apple-xl text-xs font-semibold animate-scale-in select-none ${borderColors[toast.type]}`}
          >
            {icons[toast.type]}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-white/40 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
