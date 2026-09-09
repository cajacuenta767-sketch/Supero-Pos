import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Clock, Search, Lock, LogOut, User } from 'lucide-react';
import { useSyncStore } from '../store/useSyncStore';
import { useAuthStore } from '../store/useAuthStore';
import { CashShiftModal } from './CashShiftModal';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ searchQuery, setSearchQuery }) => {
  const { isOnline, pendingCount, lastSyncTime } = useSyncStore();
  const { user, logout } = useAuthStore();
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  return (
    <header className="h-14 bg-white dark:bg-[#0B0C10] border-b border-gray-200 dark:border-[#1F2833] px-4 flex items-center justify-between transition-colors duration-200 select-none">
      {/* Quick POS Lookup Bar */}
      <div className="relative w-96">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="[F2] Escanear código de barras o buscar..."
          className="w-full pl-9 pr-4 py-1.5 bg-gray-100 dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-gray-400 bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded">
          F2
        </span>
      </div>

      {/* Connectivity, Register & Shift Controls */}
      <div className="flex items-center space-x-3">
        {/* Physical Cash Register Selector */}
        <select className="px-2.5 py-1 bg-gray-100 dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-lg text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none">
          <option value="caja-1">Caja 1</option>
          <option value="caja-2">Caja 2</option>
        </select>

        {/* Cash Shift Button */}
        <button
          onClick={() => setIsShiftModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold text-blue-700 dark:text-blue-300 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Turno de Caja</span>
        </button>

        {/* Offline Sync Status Badge */}
        <div className="flex items-center space-x-2 text-xs">
          {isOnline ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Wifi className="w-3 h-3 mr-1 text-emerald-500" /> ONLINE
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
              <WifiOff className="w-3 h-3 mr-1 text-amber-500" /> OFFLINE
            </span>
          )}
        </div>

        {/* Sync Queue Count */}
        <div className="flex items-center space-x-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#121212] px-3 py-1 rounded-lg border border-gray-200 dark:border-[#1F2833]">
          <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
          <span>Cola:</span>
          <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{pendingCount}</span>
        </div>

        {/* Shift Timer */}
        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{lastSyncTime}</span>
        </div>

        {/* User Capsule & Quick Logout */}
        <div className="flex items-center space-x-2 pl-2 border-l border-gray-200 dark:border-[#1F2833]">
          <div className="hidden sm:flex items-center space-x-1.5 px-2 py-1 bg-gray-100 dark:bg-[#121212] rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300">
            <User className="w-3.5 h-3.5 text-blue-500" />
            <span className="truncate max-w-[100px]">{user?.name || user?.username || 'Usuario'}</span>
          </div>

          <button
            onClick={logout}
            title="Cerrar Sesión"
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cash Shift Modal */}
      <CashShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} />
    </header>
  );
};
