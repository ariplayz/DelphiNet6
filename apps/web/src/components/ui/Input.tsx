import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={clsx(
          'w-full rounded-lg px-3 py-2 text-sm',
          'bg-bg-elevated border border-border text-text-primary',
          'placeholder:text-text-disabled',
          'focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className,
        )}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
