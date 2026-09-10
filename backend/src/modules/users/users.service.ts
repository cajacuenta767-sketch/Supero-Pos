import { 
  Injectable, 
  NotFoundException, 
  ConflictException, 
  BadRequestException,
  ForbiddenException 
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
   * Impide que una baja o un cambio de rol deje el sistema sin administrador.
   *
   * Las dos comprobaciones vivían solo en `UsersView.tsx`, es decir, en el
   * navegador: bastaba una llamada directa al endpoint para saltárselas. Con
   * el último administrador desactivado —o degradado a cajero— nadie puede
   * volver a entrar a gestionar usuarios, y la única salida es tocar la base
   * de datos a mano.
   *
   * Se comprueban dos cosas distintas:
   *
   * 1. Nadie se da de baja a sí mismo. Es casi siempre un descuido, y el
   *    afectado es justo quien no podría deshacerlo.
   * 2. Queda al menos un administrador activo después del cambio. Cuenta
   *    tanto desactivar como quitarle el rol de administrador al último.
   */
  private async assertNoDejaSinAdministrador(params: {
    objetivo: { id: string; isActive: boolean; roleId: string };
    solicitanteId?: string;
    nuevoIsActive?: boolean;
    nuevoRoleId?: string;
  }) {
    const { objetivo, solicitanteId, nuevoIsActive, nuevoRoleId } = params;

    const quedaraInactivo = nuevoIsActive === false;

    if (quedaraInactivo && solicitanteId && solicitanteId === objetivo.id) {
      throw new ForbiddenException({
        success: false,
        status_code: 403,
        message:
          'No puede desactivar su propia cuenta: nadie podría reactivarla en su nombre. Pídaselo a otro administrador.',
      });
    }

    // Solo hay riesgo si el usuario es hoy un administrador activo.
    const rolActual = await this.prisma.role.findUnique({ where: { id: objetivo.roleId } });
    const esAdminActivo = objetivo.isActive && rolActual?.name?.toUpperCase() === 'ADMIN';
    if (!esAdminActivo) return;

    const pierdeElRol =
      nuevoRoleId !== undefined && nuevoRoleId !== objetivo.roleId;
    const seguiraSiendoAdmin = pierdeElRol
      ? (await this.prisma.role.findUnique({ where: { id: nuevoRoleId } }))?.name?.toUpperCase() === 'ADMIN'
      : true;

    if (!quedaraInactivo && seguiraSiendoAdmin) return;

    const otrosAdmins = await this.prisma.user.count({
      where: {
        id: { not: objetivo.id },
        isActive: true,
        role: { name: { equals: 'ADMIN', mode: 'insensitive' } },
      },
    });

    if (otrosAdmins === 0) {
      throw new ConflictException({
        success: false,
        status_code: 409,
        message: quedaraInactivo
          ? 'Es el último administrador activo: desactivarlo dejaría el sistema sin quien lo gestione. Nombre antes a otro administrador.'
          : 'Es el último administrador activo: cambiarle el rol dejaría el sistema sin quien lo gestione. Nombre antes a otro administrador.',
      });
    }
  }

  /**
   * Traduce a identificador el rol que llega, sea un UUID o un nombre.
   *
   * Antes, si no encontraba nada, inventaba el rol: escribir «CAJEROO» en el
   * alta creaba un rol nuevo con ese nombre y permisos mínimos, sin avisar. El
   * usuario quedaba dado de alta con un rol que nadie definió, el rol falso
   * aparecía desde entonces en todos los selectores, y no hay forma de
   * borrarlo desde la aplicación.
   *
   * Los roles son parte del diseño del sistema, no un campo de texto libre: se
   * crean en la semilla. Aquí se rechaza lo que no exista, diciendo cuáles hay.
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
      const disponibles = await this.prisma.role.findMany({
        select: { name: true },
        orderBy: { name: 'asc' },
      });
      throw new BadRequestException({
        success: false,
        status_code: 400,
        message: `El rol '${roleIdOrName}' no existe. Roles disponibles: ${disponibles
          .map((r) => r.name)
          .join(', ')}.`,
      });
    }

    return role.id;
  }

  /**
   * Traduce a identificador la sucursal que llega, sea un UUID o un nombre.
   *
   * Mismo problema que con los roles, y peor: la sucursal inventada se
   * guardaba con una dirección y un teléfono fabricados —«Av. Principal #100»—
   * que parecen datos de verdad. A partir de ahí figura en los informes, en
   * los filtros de existencias y en el selector de sucursal del alta, sin que
   * exista ninguna tienda detrás.
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
      const disponibles = await this.prisma.branch.findMany({
        select: { name: true },
        orderBy: { name: 'asc' },
      });
      throw new BadRequestException({
        success: false,
        status_code: 400,
        message: `La sucursal '${branchIdOrName}' no existe. Sucursales disponibles: ${disponibles
          .map((b) => b.name)
          .join(', ')}.`,
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
  async update(id: string, dto: UpdateUserDto, solicitanteId?: string) {
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

    /* Editar también da de baja y también cambia el rol: la misma guarda que
       en `toggleActive`, o el agujero se abre por la otra puerta. */
    await this.assertNoDejaSinAdministrador({
      objetivo: { id: user.id, isActive: user.isActive, roleId: user.roleId },
      solicitanteId,
      nuevoIsActive: updateData.isActive,
      nuevoRoleId: updateData.roleId,
    });

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
  async toggleActive(id: string, targetState?: boolean, solicitanteId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        success: false,
        status_code: 404,
        message: `El usuario con ID '${id}' no existe.`,
      });
    }

    const newActiveState = targetState !== undefined ? targetState : !user.isActive;

    await this.assertNoDejaSinAdministrador({
      objetivo: { id: user.id, isActive: user.isActive, roleId: user.roleId },
      solicitanteId,
      nuevoIsActive: newActiveState,
    });

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
