import { useEffect } from 'react';
import { useSyncStore } from '../store/useSyncStore';
import { syncWorker } from '../services/syncWorker';
import { localDb } from '../db/sqlite';

export const useOfflineSync = () => {
  const isOnline = useSyncStore((state) => state.isOnline);
  const pendingCount = useSyncStore((state) => state.pendingCount);

  useEffect(() => {
    // Cargar conteo inicial de la cola local SQLite
    useSyncStore.getState().setPendingCount(localDb.getPendingCount());

    // Iniciar worker activo de 30s
    syncWorker.startWorker(30000);

    // Detección Pasiva de Red (Listeners online/offline)
    const handleOnline = () => {
      useSyncStore.getState().setIsOnline(true);
      console.log('Detección pasiva: Red ONLINE restablecida. Disparando reconciliación FIFO...');
      syncWorker.triggerManualSync();
    };

    const handleOffline = () => {
      useSyncStore.getState().setIsOnline(false);
      console.log('Detección pasiva: Red OFFLINE. Modo autónomo activado.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, pendingCount, syncWorker };
};
