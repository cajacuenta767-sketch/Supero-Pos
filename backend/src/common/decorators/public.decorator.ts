import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca una ruta como accesible sin token.
 *
 * Los guardias son globales, así que lo seguro es el estado por defecto: una
 * ruta nueva queda protegida aunque quien la escriba no se acuerde de nada.
 * Abrirla exige este decorador, que es visible en la revisión del código.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
