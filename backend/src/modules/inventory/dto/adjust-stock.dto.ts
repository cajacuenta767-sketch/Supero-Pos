import { IsIn, IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/**
 * Contrato validado del ajuste de existencias.
 *
 * El controlador tipaba el cuerpo con una interfaz. Las interfaces desaparecen
 * al compilar, así que el `ValidationPipe` global recibía `Object` y no
 * validaba nada: el servicio comprobaba a mano lo que se le ocurría y el resto
 * entraba en crudo.
 *
 * Y ya no se declara `user_id`: lo traía el cuerpo, de modo que quien firmaba
 * el ajuste era quien el cliente dijera. En un almacén, el responsable de una
 * merma es la mitad del valor de registrarla. Ahora sale de la sesión.
 */

export const ADJUSTMENT_TYPES = [
  'DAMAGED',
  'EXPIRED',
  'INTERNAL_USE',
  'CYCLE_COUNT_DISCREPANCY',
] as const;

export class AdjustStockDto {
  @IsString()
  @IsNotEmpty({ message: 'Falta indicar el producto.' })
  @MaxLength(100)
  product_id!: string;

  /* Decimal por el granel: media caja de 0,5 kg es un ajuste válido. Cero no
     lo es —no ajusta nada— y el tope evita que un error de captura mueva un
     almacén entero de una vez. */
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'La cantidad debe ser un número.' })
  @Min(-1_000_000)
  @Max(1_000_000)
  quantity_delta!: number;

  @IsIn(ADJUSTMENT_TYPES, {
    message: `El tipo de ajuste debe ser uno de: ${ADJUSTMENT_TYPES.join(', ')}.`,
  })
  adjustment_type!: (typeof ADJUSTMENT_TYPES)[number];

  /* Todo ajuste exige motivo: un stock que no cuadra sin explicación no se
     puede conciliar después. */
  @IsString()
  @MinLength(5, { message: 'Explique el motivo del ajuste (mínimo 5 caracteres).' })
  @MaxLength(500)
  reason!: string;
}
