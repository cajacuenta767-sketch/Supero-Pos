import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
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

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private getLockState(username: string): LockoutState {
    const key = username.toLowerCase().trim();
    if (!this.failedAttemptsMap.has(key)) {
      this.failedAttemptsMap.set(key, { count: 0, lockedUntil: null });
    }
    return this.failedAttemptsMap.get(key)!;
  }

  async verifyPassword(hash: string, plainText: string): Promise<boolean> {
    try {
      if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const bcrypt = require('bcryptjs');
          return await bcrypt.compare(plainText, hash);
        } catch {
          return false;
        }
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

    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { role: true, branch: true },
    });

    if (!user || !user.isActive) {
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
