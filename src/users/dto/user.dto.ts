import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 6 })
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Juan', required: false })
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Pérez', required: false })
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ example: 'Password123!', required: false })
  @IsOptional()
  @MinLength(6)
  password?: string;
}
