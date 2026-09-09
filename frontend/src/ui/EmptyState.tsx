import React from 'react';
import { cn } from './cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, hint, action, className }) => (
  <div
    className={cn(
      'h-full flex flex-col items-center justify-center text-center gap-3 p-8',
      className,
    )}
  >
    {icon && (
      <span className="w-14 h-14 rounded-lg bg-sunken text-ink-3 flex items-center justify-center">
        {icon}
      </span>
    )}
    <div className="space-y-1">
      <p className="text-title text-ink-2">{title}</p>
      {hint && <p className="text-body text-ink-3 max-w-sm">{hint}</p>}
    </div>
    {action}
  </div>
);
