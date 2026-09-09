import React from 'react';
import { cn } from './cn';

export interface SkeletonProps {
  variant?: 'text' | 'row' | 'tile';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'text', className }) => (
  <div
    aria-hidden
    className={cn(
      'bg-sunken rounded-md animate-pulse',
      variant === 'text' ? 'h-4 w-full' : variant === 'row' ? 'h-12 w-full' : 'h-28 w-full',
      className,
    )}
  />
);
