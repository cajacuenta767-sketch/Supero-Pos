import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Patch, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('api/v1/users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  async findAll(
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('branchId') branchId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.findAll({ search, roleId, branchId, isActive });
  }

  @Get('roles')
  @Roles('ADMIN', 'SUPERVISOR')
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Get('branches')
  @Roles('ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO')
  async getBranches() {
    return this.usersService.getBranches();
  }

  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/toggle-active')
  @Roles('ADMIN')
  async toggleActive(
    @Param('id') id: string,
    @Body('isActive') isActive?: boolean,
  ) {
    return this.usersService.toggleActive(id, isActive);
  }
}
