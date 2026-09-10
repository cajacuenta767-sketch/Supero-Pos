import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Contrato validado del registro de un gasto.
 *
 * Un gasto saca dinero del negocio. El controlador aceptaba el cuerpo sin
 * validar —interfaz, no clase— y sin exigir rol alguno, así que cualquier
 * usuario con sesión podía registrarlos. La sucursal venía en el cuerpo y ya
 * no se declara: sale de la sesión.
 */

export const PAYMENT_SOURCES = ['PETTY_CASH', 'BANK_ACCOUNT'] as const;

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty({ message: 'Falta la categoría del gasto.' })
  @MaxLength(100)
  category!: string;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El importe debe ser un número.' })
  @Min(0.0001, { message: 'Un gasto de cero no es un gasto.' })
  @Max(10_000_000)
  amount!: number;

  @IsIn(PAYMENT_SOURCES, { message: 'El origen debe ser PETTY_CASH o BANK_ACCOUNT.' })
  paymentSource!: (typeof PAYMENT_SOURCES)[number];

  /** Número del comprobante físico. Obligatorio para la caja chica. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsString()
  @IsNotEmpty({ message: 'Describa el gasto.' })
  @MaxLength(500)
  description!: string;

  /**
   * PIN de supervisor para retirar de caja chica.
   *
   * Se comprueba contra el hash guardado de un supervisor, como cualquier otra
   * autorización. El servicio lo comparaba con la cadena `'1234'` escrita en el
   * propio código del servidor, junto a un comentario que decía «en un caso
   * real, validar aquí el PIN».
   */
  @IsOptional()
  @IsString()
  @MaxLength(12)
  supervisorPin?: string;
}
