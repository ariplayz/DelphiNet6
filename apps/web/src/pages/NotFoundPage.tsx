import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-6xl font-bold text-text-disabled">404</p>
      <h1 className="text-xl font-semibold text-text-primary">Page not found</h1>
      <p className="text-text-secondary">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="text-brand hover:text-brand-hover underline text-sm transition-colors">
        Go to Dashboard
      </Link>
    </div>
  );
}
