// dto/delete-user.dto.ts
import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteUserDto {
  @ApiProperty({
    description: 'The unique identifier of the user to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'ID must be a valid UUID' })
  @IsNotEmpty({ message: 'ID is required' })
  id: string;
}
