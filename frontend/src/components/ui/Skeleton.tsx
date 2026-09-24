'use client';

import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rounded',
  width,
  height,
  style,
  ...props
}) => {
  const variantStyles = {
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-apple',
  };

  return (
    <div
      className={`skeleton-shimmer bg-slate-200 dark:bg-slate-800/80 ${variantStyles[variant]} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="apple-glass-card p-5 space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-1.5">
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={10} />
        </div>
      </div>
      <Skeleton width={60} height={20} />
    </div>
    <div className="space-y-2 pt-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} width="100%" height={12} />
      ))}
    </div>
  </div>
);
