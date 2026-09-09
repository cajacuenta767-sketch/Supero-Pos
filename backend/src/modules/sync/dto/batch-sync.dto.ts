import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * Contrato validado del lote de sincronización.
 *
 * Antes el controlador tipaba el cuerpo con una interfaz. Las interfaces
 * desaparecen al compilar, así que el `ValidationPipe` global no tenía nada que
 * validar: el endpoint por el que entra el dinero aceptaba cualquier JSON, con
 * importes negativos, cantidades absurdas o campos inventados.
 */

export const PAYMENT_METHODS = ['CASH', 'CARD', 'QR', 'MIXED'] as const;

/** Tope por importe. Una cifra desbocada es un error de cliente o un intento de
 *  corromper la contabilidad, nunca una venta real. */
const MAX_AMOUNT = 10_000_000;

export class PaymentBreakdownDto {
  @IsIn(PAYMENT_METHODS)
  payment_method!: (typeof PAYMENT_METHODS)[number];

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(MAX_AMOUNT)
  amount_received!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(MAX_AMOUNT)
  change_given!: number;
}

export class SaleItemDto {
  @IsString()
  @MaxLength(100)
  product_id!: string;

  /* Cantidad decimal por los productos a granel: 0,450 kg es válido. Cero o
     negativo no lo es, y devolver mercancía tiene su propio flujo. */
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(1_000_000)
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(MAX_AMOUNT)
  unit_price!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(MAX_AMOUNT)
  line_subtotal!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  @ArrayMaxSize(500)
  serials_used?: string[];
}

export class TransactionDto {
  @IsUUID('4')
  transaction_id!: string;

  @IsISO8601()
  timestamp!: string;

  @IsString()
  @MaxLength(100)
  branch_id!: string;

  @IsString()
  @MaxLength(100)
  register_id!: string;

  @IsString()
  @MaxLength(100)
  shift_id!: string;

  @IsString()
  @MaxLength(100)
  cashier_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customer_id?: string | null;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(MAX_AMOUNT)
  subtotal!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(MAX_AMOUNT)
  total_discount!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(MAX_AMOUNT)
  grand_total!: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PaymentBreakdownDto)
  payment_breakdown!: PaymentBreakdownDto[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];

  /** Conforme de entrega firmado, PNG en data: URI. */
  @IsOptional()
  @IsString()
  @MaxLength(2_000_000)
  customer_signature?: string;
}

export class BatchSyncDto {
  @IsString()
  @MaxLength(100)
  terminal_id!: string;

  @IsString()
  @MaxLength(100)
  sync_batch_id!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => TransactionDto)
  transactions!: TransactionDto[];
}
