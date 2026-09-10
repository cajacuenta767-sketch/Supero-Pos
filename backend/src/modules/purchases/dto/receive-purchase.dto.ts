import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Contrato validado de la recepción de mercadería.
 *
 * Recibir suma existencias y recalcula el coste promedio ponderado: es la
 * puerta por la que entra el inventario. El controlador la tenía sin validar
 * —interfaz, no clase— y sin exigir ningún rol, así que cualquier usuario con
 * sesión podía inflar el almacén. La sucursal y el responsable venían en el
 * cuerpo; ahora salen de la sesión y aquí ya no se declaran.
 */

const MAX_COST = 10_000_000;

export class ReceivePurchaseItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Falta indicar el producto de la línea.' })
  @MaxLength(100)
  productId!: string;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'La cantidad debe ser un número.' })
  @Min(0.0001, { message: 'Recibir cero no es recibir.' })
  @Max(1_000_000)
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El costo debe ser un importe.' })
  @Min(0)
  @Max(MAX_COST)
  unitCost!: number;

  /** IMEI de los equipos serializados. Sin ellos no hay trazabilidad. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  @ArrayMaxSize(500)
  serials?: string[];
}

export class ReceivePurchaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Falta indicar la orden de compra.' })
  @MaxLength(100)
  purchaseOrderId!: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'No hay ninguna línea que recibir.' })
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseItemDto)
  items!: ReceivePurchaseItemDto[];
}
