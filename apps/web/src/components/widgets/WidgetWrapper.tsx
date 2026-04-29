import React from 'react';
import clsx from 'clsx';

interface WidgetWrapperProps {
  title?: string;
  action?: React.ReactNode;
  editMode?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function WidgetWrapper({
  title,
  action,
  editMode,
  children,
  className,
}: WidgetWrapperProps) {
  return (
    <div
      className={clsx(
        'bg-bg-surface rounded-xl border border-border h-full p-4 flex flex-col overflow-hidden',
        className,
      )}
    >
      {(title || editMode || action) && (
        <div className="flex items-center justify-between mb-3 gap-2">
          {editMode ? (
            <div
              className="flex-1 cursor-grab active:cursor-grabbing text-text-secondary text-xs uppercase tracking-wide select-none"
              title="Drag to move"
            >
              ⋮⋮ {title ?? 'Widget'}
            </div>
          ) : (
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          )}
          {action && <div className="no-drag">{action}</div>}
        </div>
      )}
      <div className={clsx('flex-1 min-h-0 no-drag', editMode && 'pointer-events-none opacity-90')}>
        {children}
      </div>
    </div>
  );
}
