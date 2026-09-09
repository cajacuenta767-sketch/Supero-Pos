import { IS_DEMO_MODE } from '../config/env';

/**
 * Autorización por PIN de supervisor en la terminal.
 *
 * Qué se arregló: el PIN estaba en `usePosStore` como la cadena `'1234'` y el
 * modal lo anunciaba en pantalla, así que cualquier cajero se autorizaba sus
 * propios descuentos y anulaciones.
 *
 * Con red, quien decide es el servidor: el PIN viaja, se compara contra su
 * hash y vuelve un sí o un no con el nombre de quien autorizó. El número no
 * está en el equipo, así que leerlo del bundle ya no sirve de nada.
 *
 * Sin red queda la comprobación local, que es un control operativo y no una
 * barrera criptográfica: un PIN de cuatro dígitos comparado en el cliente tiene
 * diez mil combinaciones y el código está en la caja. Se conserva porque una
 * tienda sin conexión tiene que poder anular un ticket mal cobrado, y toda
 * autorización viaja en el ticket para que el servidor la re-verifique al
 * sincronizar.
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
  /** Quién autorizó, cuando lo decidió el servidor. */
  authorizedBy?: string;
  /** `true` cuando se resolvió sin red, con la comprobación local. */
  offline?: boolean;
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

/**
 * Autorización contra el servidor, con la comprobación local como respaldo.
 *
 * Es la que deben usar las pantallas. `verifySupervisorPin` se queda para el
 * camino sin red y para las pruebas.
 */
export const authorizeSupervisor = async (
  input: string,
  action: string,
  terminalId: string,
): Promise<PinCheck> => {
  try {
    const { apiClient } = await import('../services/api.client');
    const { data } = await apiClient.post('/auth/verify-pin', {
      pin: input.trim(),
      terminalId,
      action,
    });
    return {
      authorized: true,
      message: `Autorizado por ${data?.authorizedBy?.name ?? 'un supervisor'}.`,
      authorizedBy: data?.authorizedBy?.name,
    };
  } catch (error) {
    const response = (error as { response?: { status?: number; data?: { message?: string } } })
      .response;

    /* El servidor contestó y dijo que no: se le hace caso. Reintentar en local
       sería darle al cajero una segunda oportunidad con reglas más flojas. */
    if (response?.status === 401 || response?.status === 403 || response?.status === 429) {
      return {
        authorized: false,
        message: response.data?.message ?? 'PIN de supervisor incorrecto.',
      };
    }

    /* No hubo respuesta —sin red, servidor caído—: se resuelve en la terminal,
       y se dice, porque no es la misma garantía. */
    const local = verifySupervisorPin(input);
    return {
      ...local,
      offline: true,
      message: local.authorized
        ? 'Autorizado sin conexión · se re-verificará al sincronizar.'
        : local.message,
    };
  }
};
