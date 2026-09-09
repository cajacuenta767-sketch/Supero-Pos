import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('AuthService (Sprint 1 QA & Auth Engine)', () => {
  let service: AuthService;

  const mockUser = {
    id: 'usr-1',
    username: 'admin',
    fullName: 'Administrador General',
    passwordHash: '',
    roleId: 'role-1',
    branchId: 'branch-1',
    isActive: true,
    role: { id: 'role-1', name: 'ADMIN' },
    branch: { id: 'branch-1', name: 'Sucursal Central' },
  };

  /* `validateUser` busca con `findFirst` + `mode: 'insensitive'`: el bloqueo se
     indexa en minúsculas y la búsqueda debe usar el mismo criterio, o «Admin» y
     «admin» serían cuentas distintas con contador compartido. */
  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock_jwt_12h_token_string'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser.passwordHash = await argon2.hash('SuperoPOS2026', { type: argon2.argon2id });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should correctly hash passwords with Argon2id', async () => {
    const rawPass = 'SuperoPOS2026';
    const hashed = await service.hashPassword(rawPass);
    expect(hashed).toBeDefined();
    expect(hashed.length).toBeGreaterThan(20);
  });

  it('should authenticate valid user and return 12h JWT token structure', async () => {
    mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

    const result = await service.login({ username: 'admin', password: 'SuperoPOS2026' });
    expect(result.success).toBe(true);
    expect(result.data.access_token).toBe('mock_jwt_12h_token_string');
    expect(result.data.expires_in).toBe(43200); // 12 hours
    expect(result.data.user.username).toBe('admin');
  });

  it('busca al usuario sin distinguir mayúsculas', async () => {
    mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

    await service.login({ username: 'ADMIN', password: 'SuperoPOS2026' });

    expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { username: { equals: 'admin', mode: 'insensitive' } },
      }),
    );
  });

  it('no revela si la cuenta existe: verifica un hash señuelo', async () => {
    mockPrismaService.user.findFirst.mockResolvedValue(null);
    const spy = jest.spyOn(service, 'verifyPassword');

    await expect(
      service.login({ username: 'inexistente', password: 'loquesea' }),
    ).rejects.toThrow(UnauthorizedException);

    // Sin el señuelo, un usuario inexistente respondería antes que uno real y
    // esa diferencia de tiempo delataría qué cuentas existen.
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should lock out account after 5 failed login attempts', async () => {
    mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

    // Attempt 1 to 4 should throw UnauthorizedException
    for (let i = 1; i <= 4; i++) {
      await expect(
        service.login({ username: 'admin', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    }

    // Attempt 5 should throw ForbiddenException indicating account lockout
    await expect(
      service.login({ username: 'admin', password: 'wrongpassword' }),
    ).rejects.toThrow(ForbiddenException);

    // 6th attempt even with correct password should still be locked
    await expect(
      service.login({ username: 'admin', password: 'SuperoPOS2026' }),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('authorizeWithPin', () => {
    const supervisor = {
      id: 'usr-sup',
      username: 'supervisor',
      fullName: 'María López',
      supervisorPinHash: '',
    };

    beforeEach(async () => {
      supervisor.supervisorPinHash = await argon2.hash('4821', { type: argon2.argon2id });
      mockPrismaService.user.findMany.mockResolvedValue([supervisor]);
      /* El bloqueo por terminal es estado del servicio y sobrevive entre
         pruebas: cada una parte de una caja distinta. */
    });

    it('autoriza con el PIN correcto y dice quién lo autorizó', async () => {
      const result = await service.authorizeWithPin('4821', 'caja-a1', 'void_sale');
      expect(result.authorized).toBe(true);
      expect(result.authorizedBy.name).toBe('María López');
      expect(result.action).toBe('void_sale');
    });

    it('el PIN nunca vuelve en la respuesta', async () => {
      const result = await service.authorizeWithPin('4821', 'caja-a2', 'discount');
      expect(JSON.stringify(result)).not.toContain('4821');
    });

    it('rechaza el PIN incorrecto sin decir de quién es cada PIN', async () => {
      await expect(service.authorizeWithPin('0000', 'caja-b1', 'discount')).rejects.toThrow(
        UnauthorizedException,
      );
      try {
        await service.authorizeWithPin('0000', 'caja-b1', 'discount');
      } catch (e) {
        const body = (e as UnauthorizedException).getResponse() as Record<string, unknown>;
        expect(body.message).toBe('PIN de supervisor incorrecto.');
        expect(JSON.stringify(body)).not.toContain('María');
      }
    });

    it('bloquea la terminal tras cinco intentos: cuatro dígitos son diez mil combinaciones', async () => {
      for (let i = 0; i < 5; i++) {
        await expect(service.authorizeWithPin('9999', 'caja-c1', 'discount')).rejects.toThrow();
      }
      await expect(service.authorizeWithPin('4821', 'caja-c1', 'discount')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('el bloqueo es de esa terminal, no de todas', async () => {
      for (let i = 0; i < 5; i++) {
        await expect(service.authorizeWithPin('9999', 'caja-d1', 'discount')).rejects.toThrow();
      }
      await expect(service.authorizeWithPin('4821', 'caja-d2', 'discount')).resolves.toMatchObject({
        authorized: true,
      });
    });

    it('un acierto limpia los intentos fallidos previos', async () => {
      await expect(service.authorizeWithPin('9999', 'caja-e1', 'discount')).rejects.toThrow();
      await service.authorizeWithPin('4821', 'caja-e1', 'discount');
      for (let i = 0; i < 4; i++) {
        await expect(service.authorizeWithPin('9999', 'caja-e1', 'discount')).rejects.toThrow();
      }
      // Si el acierto no hubiera limpiado, el quinto fallo ya habría bloqueado.
      await expect(service.authorizeWithPin('4821', 'caja-e1', 'discount')).resolves.toMatchObject({
        authorized: true,
      });
    });

    it('sin ningún supervisor con PIN puesto, no autoriza a nadie', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      await expect(service.authorizeWithPin('4821', 'caja-f1', 'discount')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
