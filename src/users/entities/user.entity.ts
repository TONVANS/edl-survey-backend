import { Exclude } from 'class-transformer';
import { Role } from '@prisma/client';

export class UserEntity {
  id: string;
  username: string;
  email: string;

  @Exclude()
  password: string;

  name: string | null;
  role: Role;
  regionId: string | null;
  provinceId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
