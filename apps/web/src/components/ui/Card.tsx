import React from 'react';
import clsx from 'clsx';

interface CardProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ title, action, children, className, padding = true }: CardProps) {
  return (
    <div className={clsx('bg-bg-surface rounded-xl border border-border', padding && 'p-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
