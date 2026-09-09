import React from 'react';
import { cn } from './cn';

export interface KbdProps {
  keys: string | string[];
  className?: string;
}

export const Kbd: React.FC<KbdProps> = ({ keys, className }) => (
  <span className="inline-flex items-center gap-1">
    {(Array.isArray(keys) ? keys : [keys]).map((k) => (
      <kbd
        key={k}
        className={cn(
          'inline-flex items-center justify-center h-5 min-w-[1.5rem] px-1.5',
          'font-mono text-micro font-bold rounded-sm',
          'bg-sunken text-ink-2 border border-line-strong',
          className,
        )}
      >
        {k}
      </kbd>
    ))}
  </span>
);
