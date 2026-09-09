import { 
  Injectable, 
  NotFoundException, 
  ConflictException, 
  BadRequestException 
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Quita del usuario todo lo que no debe salir de la base.
   *
   * Antes solo apartaba `passwordHash`. Al añadir el PIN de supervisor, su
   * hash habría viajado en la respuesta de cada endpoint de usuarios: un hash
   * de un número de seis dígitos se rompe sin esfuerzo con una tabla, así que
   * publicarlo equivale a publicar el PIN.
   *
   * Se listan los campos secretos en un sitio para que añadir uno nuevo al
   * modelo obligue a decidir aquí si sale o no.
   */
  private sanitizeUser<T extends Record<string, unknown>>(user: T | null) {
    if (!user) return null;
    const { passwordHash: _password, supervisorPinHash: _pin, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Helper to resolve Role ID by UUID or Role Name
   */
  private async resolveRoleId(roleIdOrName: string): Promise<string> {
    if (!roleIdOrName) {
      throw new BadRequestException('El rol asignado es obligatorio.');
    }

    // Try finding by ID
    let role = await this.prisma.role.findUnique({
      where: { id: roleIdOrName },
    });

    if (!role) {
      // Try finding by Name (e.g. 'ADMIN', 'CAJERO', 'ALMACENERO', 'SUPERVISOR')
      role = await this.prisma.role.findFirst({
        where: { name: { equals: roleIdOrName, mode: 'insensitive' } },
      });
    }

    if (!role) {
      // If role does not exist, auto-create it with standard defaults
      role = await this.prisma.role.create({
        data: {
          name: roleIdOrName.toUpperCase(),
          permissions: {
            'pos.create': true,
            'pos.discount': roleIdOrName.toUpperCase() === 'ADMIN' || roleIdOrName.toUpperCase() === 'SUPERVISOR',
            'pos.void': roleIdOrName.toUpperCase() === 'ADMIN' || roleIdOrName.toUpperCase() === 'SUPERVISOR',
          },
        },
      });
    }

    return role.id;
  }

  /**
   * Helper to resolve Branch ID by UUID or Branch Name
   */
  private async resolveBranchId(branchIdOrName: string): Promise<string> {
    if (!branchIdOrName) {
      throw new BadRequestException('La sucursal asignada es obligatoria.');
    }

    // Try finding by ID
    let branch = await this.prisma.branch.findUnique({
      where: { id: branchIdOrName },
    });

    if (!branch) {
      // Try finding by Name
      branch = await this.prisma.branch.findFirst({
        where: { name: { equals: branchIdOrName, mode: 'insensitive' } },
      });
    }

    if (!branch) {
      // Auto-create branch if missing
      branch = await this.prisma.branch.create({
        data: {
          name: branchIdOrName,
          address: 'Av. Principal #100',
          phone: '+591 4-4000000',
        },
      });
    }

    return branch.id;
  }

  /**
   * Get all users with Role and Branch relations
   */
  async findAll(filters?: { search?: string; roleId?: string; branchId?: string; isActive?: boolean | string }) {
    const whereClause: any = {};

    if (filters?.search && filters.search.trim() !== '') {
      const q = filters.search.trim();
      whereClause.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filters?.roleId && filters.roleId !== 'ALL') {
      whereClause.OR = [
        { roleId: filters.roleId },
        { role: { name: { equals: filters.roleId, mode: 'insensitive' } } },
      ];
    }

    if (filters?.branchId && filters.branchId !== 'ALL') {
      whereClause.OR = [
        { branchId: filters.branchId },
        { branch: { name: { contains: filters.branchId, mode: 'insensitive' } } },
      ];
    }

    if (filters?.isActive !== undefined && filters.isActive !== 'ALL') {
      const activeBool = typeof filters.isActive === 'boolean' 
        ? filters.isActive 
        : filters.isActive === 'true' || filters.isActive === 'ACTIVE';
      whereClause.isActive = activeBool;
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      include: {
        role: true,
        branch: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitizedUsers = users.map((user) => this.sanitizeUser(user));

    return {
      success: true,
      status_code: 200,
      message: 'Listado de usuarios recuperado exitosamente',
      data: sanitizedUsers,
    };
  }

  /**
   * Get single user by ID
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        branch: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        success: false,
        status_code: 404,
        message: `El usuario con ID '${id}' no existe.`,
      });
    }

    return {
      success: true,
      status_code: 200,
      message: 'Detalle de usuario recuperado exitosamente',
      data: this.sanitizeUser(user),
    };
  }

  /**
   * Create User with Argon2id Hashing & Mandatory Role/Branch
   */
  async create(dto: CreateUserDto) {
    // 1. Verify unique username
    const existingUsername = await this.prisma.user.findFirst({
      where: { username: { equals: dto.username.trim(), mode: 'insensitive' } },
    });
    if (existingUsername) {
      throw new ConflictException({
        success: false,
        status_code: 409,
        message: `El nombre de usuario '${dto.username}' ya está registrado.`,
      });
    }

    // 2. Verify unique email
    const existingEmail = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email.trim(), mode: 'insensitive' } },
    });
    if (existingEmail) {
      throw new ConflictException({
        success: false,
        status_code: 409,
        message: `El correo electrónico '${dto.email}' ya está en uso.`,
      });
    }

    // 3. Resolve Role & Branch
    const resolvedRoleId = await this.resolveRoleId(dto.roleId);
    const resolvedBranchId = await this.resolveBranchId(dto.branchId);

    // 4. Hash password with Argon2id
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    // 5. Create user record
    const user = await this.prisma.user.create({
      data: {
        username: dto.username.trim(),
        fullName: dto.fullName.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        passwordHash,
        roleId: resolvedRoleId,
        branchId: resolvedBranchId,
        isActive: dto.isActive ?? true,
      },
      include: {
        role: true,
        branch: true,
      },
    });

    return {
      success: true,
      status_code: 201,
      message: 'Usuario registrado exitosamente en el sistema',
      data: this.sanitizeUser(user),
    };
  }

  /**
   * Update User
   */
  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        success: false,
        status_code: 404,
        message: `El usuario con ID '${id}' no existe.`,
      });
    }

    const updateData: any = {};

    if (dto.username && dto.username.trim() !== user.username) {
      const existingUsername = await this.prisma.user.findFirst({
        where: {
          username: { equals: dto.username.trim(), mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existingUsername) {
        throw new ConflictException({
          success: false,
          status_code: 409,
          message: `El nombre de usuario '${dto.username}' ya pertenece a otro operador.`,
        });
      }
      updateData.username = dto.username.trim();
    }

    if (dto.email && dto.email.trim().toLowerCase() !== user.email.toLowerCase()) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: { equals: dto.email.trim(), mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existingEmail) {
        throw new ConflictException({
          success: false,
          status_code: 409,
          message: `El correo electrónico '${dto.email}' ya pertenece a otro usuario.`,
        });
      }
      updateData.email = dto.email.trim().toLowerCase();
    }

    if (dto.fullName) {
      updateData.fullName = dto.fullName.trim();
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone ? dto.phone.trim() : null;
    }

    if (dto.roleId) {
      updateData.roleId = await this.resolveRoleId(dto.roleId);
    }

    if (dto.branchId) {
      updateData.branchId = await this.resolveBranchId(dto.branchId);
    }

    if (dto.password && dto.password.trim() !== '') {
      updateData.passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
        branch: true,
      },
    });

    return {
      success: true,
      status_code: 200,
      message: 'Datos del usuario actualizados correctamente',
      data: this.sanitizeUser(updatedUser),
    };
  }

  /**
   * Toggle Active / Soft Delete (Baja Lógica / Reactivación)
   */
  async toggleActive(id: string, targetState?: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        success: false,
        status_code: 404,
        message: `El usuario con ID '${id}' no existe.`,
      });
    }

    const newActiveState = targetState !== undefined ? targetState : !user.isActive;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: newActiveState },
      include: {
        role: true,
        branch: true,
      },
    });

    return {
      success: true,
      status_code: 200,
      message: newActiveState
        ? `Usuario '@${updatedUser.username}' reactivado operativamente.`
        : `Baja lógica aplicada: El usuario '@${updatedUser.username}' fue desactivado sin eliminar historial de auditoría ni ventas.`,
      data: this.sanitizeUser(updatedUser),
    };
  }

  /**
   * Get list of Roles
   */
  async getRoles() {
    let roles = await this.prisma.role.findMany();
    if (roles.length === 0) {
      // Seed default roles if none exist
      const defaultRoles = ['ADMIN', 'CAJERO', 'ALMACENERO', 'SUPERVISOR'];
      for (const roleName of defaultRoles) {
        await this.prisma.role.create({
          data: {
            name: roleName,
            permissions: { 'pos.create': true },
          },
        });
      }
      roles = await this.prisma.role.findMany();
    }
    return {
      success: true,
      status_code: 200,
      message: 'Catálogo de roles cargado',
      data: roles,
    };
  }

  /**
   * Get list of Branches
   */
  async getBranches() {
    let branches = await this.prisma.branch.findMany();
    if (branches.length === 0) {
      // Seed default branch if none exist
      await this.prisma.branch.create({
        data: {
          name: 'Sucursal Central',
          address: 'Av. Principal #100',
          phone: '+591 4-4000000',
        },
      });
      branches = await this.prisma.branch.findMany();
    }
    return {
      success: true,
      status_code: 200,
      message: 'Catálogo de sucursales cargado',
      data: branches,
    };
  }
}
