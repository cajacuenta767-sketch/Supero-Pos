import React from 'react';
import { cn } from './cn';

export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md';
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  icon,
  padding = 'md',
  className,
  bodyClassName,
  children,
}) => (
  <section
    className={cn('bg-raised border border-line rounded-lg shadow-e1 overflow-hidden', className)}
  >
    {(title || action) && (
      <header className="flex items-center justify-between gap-3 px-4 h-12 border-b border-line">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && <span className="text-accent shrink-0">{icon}</span>}
          <div className="min-w-0">
            {title && <h2 className="text-title text-ink truncate">{title}</h2>}
            {subtitle && <p className="text-body text-ink-2 truncate">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
    )}
    <div className={cn(padding === 'md' ? 'p-4' : padding === 'sm' ? 'p-3' : '', bodyClassName)}>
      {children}
    </div>
  </section>
);
