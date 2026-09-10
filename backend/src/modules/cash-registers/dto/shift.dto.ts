import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Contratos validados de la apertura y el cierre de turno.
 *
 * Antes el controlador tipaba el cuerpo con una interfaz. Las interfaces
 * desaparecen al compilar, así que el `ValidationPipe` global recibía `Object`
 * y no validaba nada: el cuerpo entraba en crudo.
 *
 * Y, sobre todo, **aquí ya no se declaran `userId` ni `branchId`**. Los traía
 * el cuerpo de la petición y el controlador los prefería a los de la sesión
 * (`dto.userId || userCtx.id`), de modo que un cajero abría un turno a nombre
 * de otro empleado. Con `forbidNonWhitelisted`, mandarlos ahora es un 400.
 */

/** Tope del fondo y del conteo. Una cifra desbocada es un error de cliente. */
const MAX_CASH = 10_000_000;

export class OpenShiftDto {
  @IsString()
  @IsNotEmpty({ message: 'Falta indicar la caja.' })
  @MaxLength(100)
  registerId!: string;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El fondo inicial debe ser un importe.' })
  @Min(0)
  @Max(MAX_CASH)
  initialFloat!: number;
}

export class CloseShiftDto {
  @IsString()
  @IsNotEmpty({ message: 'Falta indicar el turno.' })
  @MaxLength(100)
  shiftId!: string;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El conteo debe ser un importe.' })
  @Min(0)
  @Max(MAX_CASH)
  countedCash!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
