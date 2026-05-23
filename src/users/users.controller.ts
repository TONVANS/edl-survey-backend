import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserEntity } from './entities/user.entity';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserQueryDto } from './dto/user-query.dto';

@Controller('users')
@Roles(Role.SUPER_ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return new UserEntity(user);
  }

  @Get()
  async findAll(@Query() query: UserQueryDto) {
    const { data, meta } = await this.usersService.findAll(query);
    return {
      data: data.map((user) => new UserEntity(user)),
      meta,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return new UserEntity(user);
  }

  @Roles(Role.SUPER_ADMIN, Role.REGION_ADMIN, Role.PROVINCE_ADMIN)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const updatedUser = await this.usersService.changePassword(
      user.userId,
      changePasswordDto,
    );
    return new UserEntity(updatedUser);
  }

  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    const user = await this.usersService.resetPassword(id, resetPasswordDto);
    return new UserEntity(user);
  }

  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    const user = await this.usersService.updateRole(id, updateUserRoleDto);
    return new UserEntity(user);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    const user = await this.usersService.updateStatus(id, updateUserStatusDto);
    return new UserEntity(user);
  }
}
