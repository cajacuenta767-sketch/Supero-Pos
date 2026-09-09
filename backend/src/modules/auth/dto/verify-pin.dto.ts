import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

export class VerifyPinDto {
  /** Entre 4 y 12 dígitos: por debajo no es un PIN, por encima no lo teclea nadie. */
  @IsString()
  @IsNotEmpty({ message: 'El PIN es obligatorio.' })
  @Length(4, 12, { message: 'El PIN debe tener entre 4 y 12 caracteres.' })
  pin!: string;

  /** Caja desde la que se pide. El bloqueo por intentos va por terminal. */
  @IsString()
  @IsNotEmpty({ message: 'Falta identificar la terminal.' })
  @MaxLength(64)
  terminalId!: string;

  /** Qué se está autorizando: `void_sale`, `discount`, `stock_adjustment`… */
  @IsString()
  @IsNotEmpty({ message: 'Falta indicar qué se autoriza.' })
  @MaxLength(64)
  action!: string;
}
