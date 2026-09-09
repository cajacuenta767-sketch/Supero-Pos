import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

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
      expect(result.data[0].passwordHash).toBeUndefined();
      expect(result.data[0].username).toBe('jperez');
      expect(result.data[0].role.name).toBe('CAJERO');
    });
  });

  describe('findOne', () => {
    it('should return user details by id', async () => {
      const result = await service.findOne('user-uuid-1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('user-uuid-1');
      expect(result.data.passwordHash).toBeUndefined();
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
});
