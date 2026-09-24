'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label className="block text-xs font-semibold text-app-text">
            {label}
            {props.required && <span className="text-brand-danger ms-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute start-3.5 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none z-10 flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full text-xs sm:text-sm bg-app-subtle/70 dark:bg-app-surface border rounded-btn py-2.5 text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-150 ${
              leftIcon ? 'ps-10 pe-3.5' : rightIcon ? 'ps-3.5 pe-10' : 'px-3.5'
            } ${
              error
                ? 'border-brand-danger focus:border-brand-danger focus:ring-brand-danger/20'
                : 'border-app-border hover:border-app-borderStrong'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute end-3.5 top-1/2 -translate-y-1/2 text-app-muted z-10 flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-[11px] font-medium text-brand-danger">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-app-muted">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label className="block text-xs font-semibold text-app-text">
            {label}
            {props.required && <span className="text-brand-danger ms-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full text-xs sm:text-sm bg-app-subtle/70 dark:bg-app-surface border rounded-btn p-3 text-app-text placeholder:text-app-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-150 resize-y min-h-[90px] ${
            error
              ? 'border-brand-danger focus:border-brand-danger focus:ring-brand-danger/20'
              : 'border-app-border hover:border-app-borderStrong'
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-[11px] font-medium text-brand-danger">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-app-muted">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, leftIcon, className = '', children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-start">
        {label && (
          <label className="block text-xs font-semibold text-app-text">
            {label}
            {props.required && <span className="text-brand-danger ms-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute start-3.5 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none z-10 flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <select
            ref={ref}
            className={`w-full text-xs sm:text-sm bg-app-subtle/70 dark:bg-app-surface border rounded-btn py-2.5 text-app-text focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all duration-150 appearance-none cursor-pointer ${
              leftIcon ? 'ps-10 pe-9' : 'ps-3.5 pe-9'
            } ${
              error
                ? 'border-brand-danger focus:border-brand-danger focus:ring-brand-danger/20'
                : 'border-app-border hover:border-app-borderStrong'
            } ${className}`}
            {...props}
          >
            {children}
          </select>
          <div className="absolute end-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-app-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error ? (
          <p className="text-[11px] font-medium text-brand-danger">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-app-muted">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = 'Select';
