import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyPinDto } from './dto/verify-pin.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  /* Más estricto que el límite global: 10 intentos por minuto y por IP. El
     bloqueo por usuario no frena a quien recorre una lista de usuarios.

     La clave debe ser la de un limitador configurado —aquí `medium`, el de
     ventana de un minuto—. Decía `default`, que no existe en esta
     configuración, así que la anulación no se aplicaba a nada: el login
     admitía los 120 intentos por minuto del límite global, doce veces más de
     los que este comentario prometía. Comprobado contra la API: quince
     intentos seguidos y ningún 429. */
  @Throttle({ medium: { ttl: 60_000, limit: 10 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Autoriza una operación sensible contra el PIN de un supervisor.
   *
   * Exige sesión iniciada —no lleva `@Public()`—: quien pide la autorización es
   * un operario que ya entró, y así la petición queda atada a su cuenta. El PIN
   * en sí nunca sale del servidor; la terminal recibe un sí o un no.
   */
  /* Cuatro dígitos son diez mil combinaciones: sin freno, un script las recorre
     en segundos. Cinco por minuto y por IP, además del bloqueo por terminal.
     La clave nombra al limitador de ventana de un minuto; con `default` esta
     anulación no se aplicaba a ninguno. */
  @Throttle({ medium: { ttl: 60_000, limit: 5 } })
  @Post('verify-pin')
  @HttpCode(HttpStatus.OK)
  async verifyPin(@Body() dto: VerifyPinDto) {
    return this.authService.authorizeWithPin(dto.pin, dto.terminalId, dto.action);
  }
}
