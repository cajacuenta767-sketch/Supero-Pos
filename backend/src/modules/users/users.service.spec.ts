import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: any;

  const mockUser = {
    id: 'user-uuid-1',
    username: 'jperez',
    fullName: 'Juan Pérez',
    email: 'juan.perez@superopos.com',
    phone: '+591 71234567',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=1$mockhash',
    roleId: 'role-uuid-cajero',
    branchId: 'branch-uuid-central',
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date(),
    role: { id: 'role-uuid-cajero', name: 'CAJERO', permissions: {} },
    branch: { id: 'branch-uuid-central', name: 'Sucursal Central', address: 'Main St', phone: '123456' },
  };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findMany: jest.fn().mockResolvedValue([mockUser]),
        findUnique: jest.fn().mockResolvedValue(mockUser),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockResolvedValue({ ...mockUser, isActive: false }),
        count: jest.fn().mockResolvedValue(1),
      },
      role: {
        findUnique: jest.fn().mockResolvedValue({ id: 'role-uuid-cajero', name: 'CAJERO' }),
        findFirst: jest.fn().mockResolvedValue({ id: 'role-uuid-cajero', name: 'CAJERO' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'role-uuid-cajero', name: 'CAJERO' }]),
        create: jest.fn().mockResolvedValue({ id: 'role-uuid-cajero', name: 'CAJERO' }),
      },
      branch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'branch-uuid-central', name: 'Sucursal Central' }),
        findFirst: jest.fn().mockResolvedValue({ id: 'branch-uuid-central', name: 'Sucursal Central' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'branch-uuid-central', name: 'Sucursal Central' }]),
        create: jest.fn().mockResolvedValue({ id: 'branch-uuid-central', name: 'Sucursal Central' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of users without passwordHash', async () => {
      const result = await service.findAll();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      /* El tipo de retorno ya omite los secretos —nombrarlos aquí no
         compilaría—, así que se comprueba sobre el objeto en crudo que
         tampoco viajan en tiempo de ejecución. */
      const crudo = result.data[0] as unknown as Record<string, unknown>;
      expect(crudo.passwordHash).toBeUndefined();
      expect(crudo.supervisorPinHash).toBeUndefined();
      expect(result.data[0].username).toBe('jperez');
      expect(result.data[0].role.name).toBe('CAJERO');
    });
  });

  describe('findOne', () => {
    it('should return user details by id', async () => {
      const result = await service.findOne('user-uuid-1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('user-uuid-1');
      const crudo = result.data as unknown as Record<string, unknown>;
      expect(crudo.passwordHash).toBeUndefined();
      expect(crudo.supervisorPinHash).toBeUndefined();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new user with Argon2id password hashing', async () => {
      const dto = {
        username: 'newuser',
        fullName: 'Nuevo Usuario',
        email: 'nuevo@superopos.com',
        password: 'SecurePassword123!',
        roleId: 'CAJERO',
        branchId: 'Sucursal Central',
      };

      const result = await service.create(dto);
      expect(result.success).toBe(true);
      expect(result.status_code).toBe(201);
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if username already exists', async () => {
      prismaMock.user.findFirst.mockResolvedValueOnce(mockUser);
      const dto = {
        username: 'jperez',
        fullName: 'Juan Pérez Duplicate',
        email: 'another@superopos.com',
        password: 'Password123!',
        roleId: 'CAJERO',
        branchId: 'Sucursal Central',
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('toggleActive (Soft Delete)', () => {
    it('should deactivate user without deleting record from database', async () => {
      const result = await service.toggleActive('user-uuid-1', false);
      expect(result.success).toBe(true);
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid-1' },
          data: { isActive: false },
        }),
      );
    });
  });

  /**
   * Quedarse sin administrador no se puede deshacer desde la aplicación: hay
   * que entrar a la base de datos. Estas guardas vivían solo en el navegador.
   */
  describe('no dejar el sistema sin administrador', () => {
    const admin = {
      ...mockUser,
      id: 'user-uuid-admin',
      username: 'admin',
      roleId: 'role-uuid-admin',
      role: { id: 'role-uuid-admin', name: 'ADMIN', permissions: {} },
    };

    const comoAdmin = () => {
      prismaMock.user.findUnique.mockResolvedValue(admin);
      prismaMock.role.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve(
          where.id === 'role-uuid-admin'
            ? { id: 'role-uuid-admin', name: 'ADMIN' }
            : { id: 'role-uuid-cajero', name: 'CAJERO' },
        ),
      );
    };

    it('rechaza que alguien se desactive a sí mismo', async () => {
      comoAdmin();
      prismaMock.user.count.mockResolvedValue(5);

      await expect(service.toggleActive(admin.id, false, admin.id)).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('rechaza desactivar al último administrador activo', async () => {
      comoAdmin();
      prismaMock.user.count.mockResolvedValue(0);

      await expect(service.toggleActive(admin.id, false, 'user-uuid-otro-admin')).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('permite desactivar a un administrador si queda otro activo', async () => {
      comoAdmin();
      prismaMock.user.count.mockResolvedValue(1);

      await expect(
        service.toggleActive(admin.id, false, 'user-uuid-otro-admin'),
      ).resolves.toMatchObject({ success: true });
      expect(prismaMock.user.update).toHaveBeenCalled();
    });

    it('rechaza quitarle el rol al último administrador desde la edición', async () => {
      comoAdmin();
      prismaMock.user.count.mockResolvedValue(0);
      prismaMock.role.findFirst.mockResolvedValue({ id: 'role-uuid-cajero', name: 'CAJERO' });

      await expect(
        service.update(admin.id, { roleId: 'CAJERO' }, 'user-uuid-otro-admin'),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('rechaza la baja del último administrador también desde la edición', async () => {
      comoAdmin();
      prismaMock.user.count.mockResolvedValue(0);

      await expect(
        service.update(admin.id, { isActive: false }, 'user-uuid-otro-admin'),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('no estorba al desactivar a un cajero', async () => {
      prismaMock.user.count.mockResolvedValue(0);

      await expect(
        service.toggleActive(mockUser.id, false, 'user-uuid-admin'),
      ).resolves.toMatchObject({ success: true });
      expect(prismaMock.user.count).not.toHaveBeenCalled();
    });
  });
});
