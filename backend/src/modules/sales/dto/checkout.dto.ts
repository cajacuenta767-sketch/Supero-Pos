import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * Contrato de `POST /sales/checkout`.
 *
 * Era una `interface` de TypeScript, y una interfaz no existe en tiempo de
 * ejecución: `ValidationPipe` recibía `Object` y no comprobaba absolutamente
 * nada. Se colaba lo que fuera —cantidades negativas incluidas, que en vez de
 * descontar existencias las creaban—.
 *
 * Como clase, las reglas se aplican de verdad. `userId` y `branchId` no están
 * aquí a propósito: los pone el controlador desde la sesión.
 */
export class CheckoutItemDto {
  @IsString()
  productId!: string;

  /* Positivo y acotado: con `-10` la venta incrementaba el stock en diez
     unidades y dejaba un movimiento de kardex que decía «venta». */
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive({ message: 'La cantidad vendida debe ser mayor que cero.' })
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitPrice!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  subtotal!: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serialsUsed?: string[];
}

export class CheckoutDto {
  @IsString()
  @MaxLength(64)
  @IsOptional()
  ticketNumber?: string;

  @IsString()
  registerId!: string;

  @IsString()
  shiftId!: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  subtotal!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  tax?: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  totalAmount!: number;

  @IsIn(['CASH', 'CARD', 'QR', 'MIXED'])
  paymentMethod!: 'CASH' | 'CARD' | 'QR' | 'MIXED';

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  receivedAmount!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  changeAmount!: number;

  @IsArray()
  @ArrayNotEmpty({ message: 'El carrito de venta no contiene productos.' })
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];
}

/** Lo que el servicio recibe: el contrato más la identidad que pone la sesión. */
export interface CheckoutPayload extends CheckoutDto {
  userId: string;
  branchId: string;
  role: string;
}
