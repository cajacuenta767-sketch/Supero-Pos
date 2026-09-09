import { IsString, IsEmail, IsNotEmpty, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio.' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es obligatorio.' })
  fullName: string;

  @IsEmail({}, { message: 'El correo electrónico debe tener un formato válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'El rol asignado es obligatorio.' })
  roleId: string;

  @IsString()
  @IsNotEmpty({ message: 'La sucursal asignada es obligatoria.' })
  branchId: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
