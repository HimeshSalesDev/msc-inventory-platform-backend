import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'User ID to reset password for' })
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional({
    description:
      'Custom password to set. If not provided, a random password will be generated',
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  customPassword?: string;
}
