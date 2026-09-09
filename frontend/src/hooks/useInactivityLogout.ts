import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';

/**
 * Cierra la sesión tras un rato sin actividad.
 *
 * El campo «Cierre de sesión por inactividad» existía en Ajustes desde el
 * principio y no lo leía nadie: se configuraban quince minutos y la terminal
 * se quedaba abierta toda la noche en el mostrador, con la caja y el catálogo
 * a la vista de cualquiera.
 *
 * Cuenta desde el último gesto real del operador. Cero lo desactiva, que es lo
 * que hace falta en una terminal de autoservicio que nadie atiende.
 */
export const useInactivityLogout = () => {
  const minutes = useSettingsStore((state) => state.inactivityTimeoutMins);
  const token = useAuthStore((state) => state.token);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (minutes <= 0 || !token) return;

    const limit = minutes * 60_000;

    const arm = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        /* Se avisa por el canal que sobrevive al cierre: la pantalla siguiente
           es la de acceso, así que un aviso flotante no se vería. */
        useAuthStore.getState().logout();
      }, limit);
    };

    /* `pointerdown` y `keydown` bastan: cubren ratón, dedo y teclado sin
       rearmar el contador con cada píxel de movimiento del cursor. */
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'wheel'];
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();

    return () => {
      events.forEach((e) => window.removeEventListener(e, arm));
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [minutes, token]);
};
