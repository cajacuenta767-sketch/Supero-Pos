import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from './cn';

type Tone = 'info' | 'success' | 'warning' | 'danger';

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

const TONE: Record<Tone, { cls: string; icon: React.ReactNode }> = {
  info:    { cls: 'border-accent/30 bg-accent-soft text-accent-ink', icon: <Info className="w-4 h-4" /> },
  success: { cls: 'border-ok/30 bg-ok-soft text-ok-ink',             icon: <CheckCircle2 className="w-4 h-4" /> },
  warning: { cls: 'border-warn/30 bg-warn-soft text-warn-ink',       icon: <AlertTriangle className="w-4 h-4" /> },
  danger:  { cls: 'border-danger/30 bg-danger-soft text-danger-ink', icon: <XCircle className="w-4 h-4" /> },
};

const ToastCtx = createContext<(message: string, tone?: Tone) => void>(() => {});

export const useToast = () => useContext(ToastCtx);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-2.5 px-4 h-11 rounded-md border shadow-e2',
              'text-base font-semibold animate-rise-in',
              TONE[t.tone].cls,
            )}
          >
            {TONE[t.tone].icon}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};
