import { useEffect } from 'react';
import { useSyncStore } from '../store/useSyncStore';
import { syncWorker } from '../services/syncWorker';
import { localDb } from '../db/sqlite';

export const useOfflineSync = () => {
  const isOnline = useSyncStore((state) => state.isOnline);
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const failedCount = useSyncStore((state) => state.failedCount);

  useEffect(() => {
    // Cargar conteo inicial de la cola local SQLite
    useSyncStore.getState().setPendingCount(localDb.getPendingCount());
    useSyncStore.getState().setFailedCount(localDb.getFailedCount());

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
      /* El intervalo de 30 s seguía vivo tras desmontar: al cerrar sesión la
         terminal seguía sondeando el servidor indefinidamente. */
      syncWorker.stopWorker();
    };
  }, []);

  return { isOnline, pendingCount, failedCount, syncWorker };
};
