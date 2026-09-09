import React from 'react';
import { cn } from './cn';

const CONTROL =
  'w-full bg-raised border border-line-strong rounded-md text-ink text-base ' +
  'transition-colors duration-fast ease-ease ' +
  'hover:border-ink-3 focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed';

interface Shell {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

const Wrap: React.FC<Shell & { children: React.ReactNode; htmlFor?: string }> = ({
  label, hint, error, className, htmlFor, children,
}) => (
  <div className={cn('space-y-1.5', className)}>
    {label && (
      <label htmlFor={htmlFor} className="block text-micro uppercase text-ink-2">
        {label}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-body text-danger">{error}</p>
    ) : hint ? (
      <p className="text-body text-ink-3">{hint}</p>
    ) : null}
  </div>
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>, Shell {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  inputSize?: 'md' | 'lg' | 'display';
}

export const Input: React.FC<InputProps> = ({
  label, hint, error, className, leading, trailing, inputSize = 'md', ...rest
}) => (
  <Wrap label={label} hint={hint} error={error} className={className} htmlFor={rest.id}>
    <div className="relative">
      {leading && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none">
          {leading}
        </span>
      )}
      <input
        {...rest}
        className={cn(
          CONTROL,
          inputSize === 'display' ? 'h-16 text-display px-4 font-mono' : inputSize === 'lg' ? 'h-11 px-3.5' : 'h-9 px-3',
          leading ? 'pl-9' : '',
          trailing ? 'pr-11' : '',
          error && 'border-danger',
        )}
      />
      {trailing && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">{trailing}</span>
      )}
    </div>
  </Wrap>
);

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>, Shell {}

export const Select: React.FC<SelectProps> = ({
  label, hint, error, className, children, ...rest
}) => (
  <Wrap label={label} hint={hint} error={error} className={className} htmlFor={rest.id}>
    <select {...rest} className={cn(CONTROL, 'h-9 px-2.5 cursor-pointer', error && 'border-danger')}>
      {children}
    </select>
  </Wrap>
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, Shell {}

export const Textarea: React.FC<TextareaProps> = ({
  label, hint, error, className, ...rest
}) => (
  <Wrap label={label} hint={hint} error={error} className={className} htmlFor={rest.id}>
    <textarea {...rest} className={cn(CONTROL, 'p-3 resize-y min-h-[80px]', error && 'border-danger')} />
  </Wrap>
);
