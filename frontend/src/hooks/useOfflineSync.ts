import { useEffect } from 'react';
import { useSyncStore } from '../store/useSyncStore';
import { syncWorker } from '../services/syncWorker';
import { localDb } from '../db/sqlite';
import { useSettingsStore } from '../store/useSettingsStore';
import { useCatalogStore } from '../store/useCatalogStore';
import { useAuthStore } from '../store/useAuthStore';

export const useOfflineSync = () => {
  const isOnline = useSyncStore((state) => state.isOnline);
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const failedCount = useSyncStore((state) => state.failedCount);

  /* El intervalo sale de los ajustes. Estaba fijo en 30 s y el campo de
     «Sincronización» era decorativo. */
  const syncIntervalSec = useSettingsStore((state) => state.syncIntervalSec);

  /* La caja se pone al día con el catálogo de la central en cuanto hay sesión.
     Sin esto, un producto dado de alta en la central no llegaba nunca a la
     caja, y las ventas de lo que la caja no comparte con el servidor se
     rechazan al sincronizar y se quedan en la cola.

     Va atado al token y no al montaje: el catálogo exige sesión iniciada, así
     que pedirlo al arrancar solo conseguía un 401 por cada intento. */
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;
    void useCatalogStore.getState().syncWithServer();
  }, [token]);

  useEffect(() => {
    // Cargar conteo inicial de la cola local SQLite
    useSyncStore.getState().setPendingCount(localDb.getPendingCount());
    useSyncStore.getState().setFailedCount(localDb.getFailedCount());

    /* Un intervalo por debajo de 5 s martillea el servidor sin ganar nada. */
    syncWorker.startWorker(Math.max(5, syncIntervalSec) * 1000);

    // Detección Pasiva de Red (Listeners online/offline)
    const handleOnline = () => {
      useSyncStore.getState().setIsOnline(true);
      console.log('Detección pasiva: Red ONLINE restablecida. Disparando reconciliación FIFO...');
      void useCatalogStore.getState().syncWithServer();
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
      /* El intervalo seguía vivo tras desmontar: al cerrar sesión la terminal
         seguía sondeando el servidor indefinidamente. */
      syncWorker.stopWorker();
    };
    /* Cambiar el intervalo en Ajustes vuelve a arrancar el worker con el
       nuevo: si no, el valor guardado no se aplicaría hasta reiniciar. */
  }, [syncIntervalSec]);

  return { isOnline, pendingCount, failedCount, syncWorker };
};
