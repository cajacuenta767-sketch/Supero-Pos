import React, { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Search, Lock } from 'lucide-react';
import { useSyncStore } from '../store/useSyncStore';
import { CashShiftModal } from './CashShiftModal';
import { Button, Kbd, cn } from '../ui';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ searchQuery, setSearchQuery }) => {
  const { isOnline, pendingCount, lastSyncTime } = useSyncStore();
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K enfoca la búsqueda global.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header
      className={cn(
        'h-14 shrink-0 bg-surface border-b px-4 flex items-center gap-3 select-none',
        /* Offline: borde ámbar sólido permanente. La ansiedad no es información. */
        isOnline ? 'border-line' : 'border-warn',
      )}
    >
      {/* Búsqueda global */}
      <div className="relative flex-1 max-w-xl">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar producto, cliente o documento…"
          className="w-full h-9 pl-9 pr-20 bg-sunken border border-line rounded-md text-base text-ink hover:border-line-strong focus:border-accent transition-colors duration-fast ease-ease"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <Kbd keys={['⌘K', 'F2']} />
        </span>
      </div>

      <div className="flex-1" />

      {/* Cápsula de estado unificada: sync + cola + reloj en un solo indicador */}
      <div className="relative">
        <button
          onClick={() => setStatusOpen((v) => !v)}
          aria-expanded={statusOpen}
          className={cn(
            'h-9 px-3 flex items-center gap-2 rounded-md border text-body font-semibold',
            'transition-colors duration-fast ease-ease',
            isOnline
              ? 'bg-ok-soft text-ok-ink border-ok/25 hover:border-ok/50'
              : 'bg-warn-soft text-warn-ink border-warn/40 hover:border-warn/70',
          )}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {isOnline ? 'En línea' : 'Sin conexión'}
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 h-5 inline-flex items-center rounded-sm bg-ink/10 font-mono tnum text-micro">
              {pendingCount}
            </span>
          )}
        </button>

        {statusOpen && (
          <div className="absolute right-0 top-11 z-40 w-64 p-3 bg-raised border border-line rounded-md shadow-e2 animate-rise-in space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-body text-ink-2">Cola de sincronización</span>
              <span className="font-mono tnum text-base font-semibold text-ink">
                {pendingCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-ink-2">Última sincronización</span>
              <span className="font-mono tnum text-body text-ink">{lastSyncTime}</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-line text-body text-ink-3">
              <RefreshCw className="w-3.5 h-3.5" />
              Worker activo cada 30 s
            </div>
          </div>
        )}
      </div>

      {/* Caja física */}
      <select
        aria-label="Caja física"
        className="h-9 px-2.5 bg-sunken border border-line rounded-md text-body font-semibold text-ink cursor-pointer hover:border-line-strong transition-colors duration-fast ease-ease"
      >
        <option value="caja-1">Caja 1</option>
        <option value="caja-2">Caja 2</option>
      </select>

      <Button
        variant="secondary"
        icon={<Lock className="w-3.5 h-3.5" />}
        onClick={() => setIsShiftModalOpen(true)}
      >
        Turno
      </Button>

      <CashShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} />
    </header>
  );
};
