import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { UserQueryDto } from './dto/user-query.dto';
import { Prisma, Role } from '@prisma/client';

export const DEFAULT_USER_PASSWORD = 'EDL123456';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    if (createUserDto.role === Role.REGION_ADMIN && !createUserDto.regionId) {
      throw new BadRequestException(
        'REGION_ADMIN must be assigned to a specific region',
      );
    }
    if (
      createUserDto.role === Role.PROVINCE_ADMIN &&
      !createUserDto.provinceId
    ) {
      throw new BadRequestException(
        'PROVINCE_ADMIN must be assigned to a specific province',
      );
    }

    const password = createUserDto.password || DEFAULT_USER_PASSWORD;
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  async findAll(query: UserQueryDto) {
    const { page, limit, role, isActive, search } = query;

    const skip = ((page ?? 1) - 1) * (limit ?? 10);
    const take = limit ?? 10;

    const where: Prisma.UserWhereInput = {};

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: page ?? 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async resetPassword(id: string, resetPasswordDto: ResetPasswordDto) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const password = resetPasswordDto.newPassword || DEFAULT_USER_PASSWORD;
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid old password');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async updateRole(id: string, updateUserRoleDto: UpdateUserRoleDto) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Role validation could be more complex here (e.g. if switching to REGION_ADMIN, they need a regionId).
    // For now, we allow the role update but clear geographic IDs if switching to SUPER_ADMIN to avoid dangling references,
    // though the prompt implies we just need to change the role. Let's do basic validation.
    if (updateUserRoleDto.role === Role.REGION_ADMIN && !user.regionId) {
      throw new BadRequestException(
        'Cannot set role to REGION_ADMIN because user has no region assigned',
      );
    }
    if (updateUserRoleDto.role === Role.PROVINCE_ADMIN && !user.provinceId) {
      throw new BadRequestException(
        'Cannot set role to PROVINCE_ADMIN because user has no province assigned',
      );
    }

    const dataToUpdate: Prisma.UserUncheckedUpdateInput = {
      role: updateUserRoleDto.role,
    };

    if (updateUserRoleDto.role === Role.SUPER_ADMIN) {
      dataToUpdate.regionId = null;
      dataToUpdate.provinceId = null;
    }

    return this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async updateStatus(id: string, updateUserStatusDto: UpdateUserStatusDto) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: updateUserStatusDto.isActive },
    });
  }
}
