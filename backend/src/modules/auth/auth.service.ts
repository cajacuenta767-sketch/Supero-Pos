import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

interface LockoutState {
  count: number;
  lockedUntil: Date | null;
}

@Injectable()
export class AuthService {
  private failedAttemptsMap = new Map<string, LockoutState>();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos
  /* El mapa vive en memoria y crecía sin techo: bastaba probar usuarios
     inventados para agotarla. Al llegar al límite se descartan las entradas
     caducadas y, si aún sobra, las más antiguas. */
  private readonly MAX_TRACKED_ACCOUNTS = 10_000;

  /**
   * Hash de referencia para comparar contra usuarios inexistentes.
   *
   * Sin él, un usuario que no existe responde mucho antes que uno que sí,
   * porque nunca se llega a verificar contraseña. Esa diferencia de tiempo
   * revela qué cuentas existen. Se calcula una vez y se reutiliza.
   */
  private decoyHash: Promise<string> | null = null;

  private getDecoyHash(): Promise<string> {
    if (!this.decoyHash) {
      this.decoyHash = argon2.hash('contrasena-inexistente', { type: argon2.argon2id });
    }
    return this.decoyHash;
  }

  private evictStaleLockStates() {
    if (this.failedAttemptsMap.size < this.MAX_TRACKED_ACCOUNTS) return;
    const now = Date.now();
    for (const [key, state] of this.failedAttemptsMap) {
      if (!state.lockedUntil || state.lockedUntil.getTime() <= now) {
        this.failedAttemptsMap.delete(key);
      }
    }
    // Si todas seguían vigentes, se sueltan las más antiguas por orden de inserción.
    while (this.failedAttemptsMap.size >= this.MAX_TRACKED_ACCOUNTS) {
      const oldest = this.failedAttemptsMap.keys().next();
      if (oldest.done) break;
      this.failedAttemptsMap.delete(oldest.value);
    }
  }

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private getLockState(username: string): LockoutState {
    const key = username.toLowerCase().trim();
    if (!this.failedAttemptsMap.has(key)) {
      this.evictStaleLockStates();
      this.failedAttemptsMap.set(key, { count: 0, lockedUntil: null });
    }
    return this.failedAttemptsMap.get(key)!;
  }

  /**
   * Verifica una contraseña contra su hash.
   *
   * Acepta hashes bcrypt heredados además de argon2. Antes bcryptjs se cargaba
   * con un `require` dentro de un try/catch y no figuraba en package.json: la
   * carga fallaba siempre y devolvía `false`, de modo que ningún usuario con
   * hash bcrypt podía entrar y nadie se enteraba. Ahora es una dependencia
   * declarada y se importa arriba.
   */
  async verifyPassword(hash: string, plainText: string): Promise<boolean> {
    try {
      if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
        return await bcrypt.compare(plainText, hash);
      }
      return await argon2.verify(hash, plainText);
    } catch {
      return false;
    }
  }

  async validateUser(username: string, pass: string) {
    const key = username.toLowerCase().trim();
    const lockState = this.getLockState(key);

    // Check if account is locked out
    if (lockState.lockedUntil && lockState.lockedUntil > new Date()) {
      const remainingSeconds = Math.ceil((lockState.lockedUntil.getTime() - Date.now()) / 1000);
      throw new ForbiddenException({
        success: false,
        status_code: 403,
        message: `Cuenta bloqueada temporalmente por superar el límite de ${this.MAX_FAILED_ATTEMPTS} intentos fallidos. Intente de nuevo en ${remainingSeconds} segundos.`,
        isLocked: true,
        remainingSeconds,
      });
    }

    // Reset lockout if expired
    if (lockState.lockedUntil && lockState.lockedUntil <= new Date()) {
      lockState.count = 0;
      lockState.lockedUntil = null;
    }

    /* El bloqueo se indexa en minúsculas pero la búsqueda era sensible a
       mayúsculas: «Admin» y «admin» compartían contador y eran cuentas
       distintas. Ahora ambas cosas usan el mismo criterio. */
    const user = await this.prisma.user.findFirst({
      where: { username: { equals: key, mode: 'insensitive' } },
      include: { role: true, branch: true },
    });

    if (!user || !user.isActive) {
      // Se consume el mismo tiempo que una verificación real (ver `getDecoyHash`).
      await this.verifyPassword(await this.getDecoyHash(), pass);
      lockState.count += 1;
      if (lockState.count >= this.MAX_FAILED_ATTEMPTS) {
        lockState.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
        throw new ForbiddenException({
          success: false,
          status_code: 403,
          message: `Cuenta bloqueada tras ${this.MAX_FAILED_ATTEMPTS} intentos fallidos. Intente más tarde.`,
          isLocked: true,
          failedAttempts: lockState.count,
        });
      }
      const remaining = this.MAX_FAILED_ATTEMPTS - lockState.count;
      throw new UnauthorizedException({
        success: false,
        status_code: 401,
        message: `Credenciales incorrectas. Intento ${lockState.count} de ${this.MAX_FAILED_ATTEMPTS}. Quedan ${remaining} intento(s).`,
        failedAttempts: lockState.count,
        remainingAttempts: remaining,
        isLocked: false,
      });
    }

    const isMatch = await this.verifyPassword(user.passwordHash, pass);
    if (!isMatch) {
      lockState.count += 1;
      if (lockState.count >= this.MAX_FAILED_ATTEMPTS) {
        lockState.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
        throw new ForbiddenException({
          success: false,
          status_code: 403,
          message: `Cuenta bloqueada tras ${this.MAX_FAILED_ATTEMPTS} intentos fallidos. Intente más tarde.`,
          isLocked: true,
          failedAttempts: lockState.count,
        });
      }
      const remaining = this.MAX_FAILED_ATTEMPTS - lockState.count;
      throw new UnauthorizedException({
        success: false,
        status_code: 401,
        message: `Credenciales incorrectas. Intento ${lockState.count} de ${this.MAX_FAILED_ATTEMPTS}. Quedan ${remaining} intento(s).`,
        failedAttempts: lockState.count,
        remainingAttempts: remaining,
        isLocked: false,
      });
    }

    // Reset failed attempts counter on success
    this.failedAttemptsMap.delete(key);

    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    } catch {
      // Ignore if DB update fails
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role?.name || 'CAJERO',
      branchId: loginDto.branchId || user.branchId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      status_code: 200,
      message: 'Autenticación exitosa',
      data: {
        access_token: accessToken,
        expires_in: 43200, // 12 hours (seconds)
        user: {
          id: user.id,
          username: user.username,
          name: user.fullName,
          role: user.role?.name || 'CAJERO',
          branchId: loginDto.branchId || user.branchId,
          branchName: user.branch?.name || 'Sucursal Principal',
        },
      },
    };
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  getFailedAttemptsCount(username: string): number {
    const key = username.toLowerCase().trim();
    return this.failedAttemptsMap.get(key)?.count || 0;
  }

  resetLockout(username: string): void {
    const key = username.toLowerCase().trim();
    this.failedAttemptsMap.delete(key);
  }
}
