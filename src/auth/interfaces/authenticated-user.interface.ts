import { Role } from '@prisma/client';

export class AuthenticatedUser {
  userId: string;
  username: string;
  role: Role;
  regionId?: string;
  provinceId?: string;
}
