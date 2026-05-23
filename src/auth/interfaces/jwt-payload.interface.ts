import { Role } from '@prisma/client';

export class JwtPayload {
  username: string;
  sub: string;
  role: Role;
  regionId?: string | null;
  provinceId?: string | null;
}
