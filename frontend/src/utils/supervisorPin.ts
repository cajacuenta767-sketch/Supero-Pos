import { IS_DEMO_MODE } from '../config/env';

/**
 * Autorización por PIN de supervisor en la terminal.
 *
 * Qué se arregló: el PIN estaba en `usePosStore` como la cadena `'1234'` y el
 * modal lo anunciaba en pantalla, así que cualquier cajero se autorizaba sus
 * propios descuentos y anulaciones.
 *
 * Qué NO resuelve esto, y conviene tener claro: un PIN de cuatro dígitos
 * comparado en el cliente es débil por construcción —hay diez mil
 * combinaciones y el código está en el equipo—. Lo que hace este módulo es
 * quitar el secreto en claro del bundle y dejar un único punto por el que pasa
 * la autorización, para que el día que exista un endpoint de autorización en el
 * servidor solo haya que cambiar aquí. Mientras tanto, la comprobación local es
 * un control operativo, no una barrera criptográfica, y toda autorización viaja
 * en el ticket para que el servidor pueda re-verificarla.
 */

/** Comparación en tiempo constante: una comparación normal se corta en el primer
 *  carácter distinto y filtra cuántos dígitos son correctos. */
const constantTimeEquals = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
};

/**
 * PIN configurado para la terminal.
 *
 * Fuera del modo demostración se toma de `VITE_SUPERVISOR_PIN`, que se
 * provisiona por instalación. Sin él configurado no hay autorización local
 * posible: se deniega, en vez de aceptar un valor por defecto conocido.
 */
const configuredPin = (): string | null => {
  const fromEnv = import.meta.env.VITE_SUPERVISOR_PIN;
  if (fromEnv && fromEnv.length >= 4) return fromEnv;
  if (IS_DEMO_MODE) return import.meta.env.VITE_DEMO_SUPERVISOR_PIN ?? '1234';
  return null;
};

export interface PinCheck {
  authorized: boolean;
  message: string;
}

export const verifySupervisorPin = (input: string): PinCheck => {
  const expected = configuredPin();

  if (!expected) {
    return {
      authorized: false,
      message:
        'Esta terminal no tiene PIN de supervisor configurado. Solicite la autorización a un responsable.',
    };
  }

  if (!constantTimeEquals(input.trim(), expected)) {
    return { authorized: false, message: 'PIN de supervisor incorrecto.' };
  }

  return { authorized: true, message: 'Autorización concedida.' };
};
