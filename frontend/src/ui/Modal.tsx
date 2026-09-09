import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { cn } from './cn';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: Size;
  footer?: React.ReactNode;
  /** Modales críticos (turno de caja) que no deben cerrarse por accidente. */
  dismissable?: boolean;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  footer,
  dismissable = true,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc cierra + el foco queda atrapado dentro del panel.
  useEffect(() => {
    if (!isOpen) return;

    const previous = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [isOpen, onClose, dismissable]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'w-full bg-surface border border-line rounded-lg shadow-e3',
          'flex flex-col max-h-[90vh] animate-rise-in',
          SIZE[size],
        )}
      >
        {title && (
          <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <span className="w-9 h-9 rounded-md bg-accent-soft text-accent-ink flex items-center justify-center shrink-0">
                  {icon}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="text-title text-ink truncate">{title}</h2>
                {subtitle && <p className="text-body text-ink-2">{subtitle}</p>}
              </div>
            </div>
            {dismissable && (
              <IconButton label="Cerrar" onClick={onClose}>
                <X className="w-4 h-4" />
              </IconButton>
            )}
          </header>
        )}

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <footer className="px-5 py-4 border-t border-line bg-sunken flex items-center justify-end gap-2">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};
