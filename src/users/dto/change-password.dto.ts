import { IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty()
  @MinLength(8)
  oldPassword: string;

  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
