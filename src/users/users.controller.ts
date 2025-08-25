import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  Delete,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User as UserEntity } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../enums/roles.enum';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiOkResponse({
    type: [UserEntity],
    description: 'List of all users excluding current user',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  async findAll(@Request() req): Promise<{ users: UserEntity[] }> {
    const users = await this.usersService.findAll(req.user.id);
    return { users };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiCreatedResponse({
    type: UserEntity,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data or role not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with email already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: Request,
  ): Promise<UserEntity> {
    return this.usersService.create(createUserDto, req);
  }

  @Put()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing user (Admin only)' })
  @ApiOkResponse({
    type: UserEntity,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data or role not found',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with email already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  async update(
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: Request,
  ): Promise<UserEntity> {
    return this.usersService.update(updateUserDto, req);
  }

  @Post('reset-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset user password (Admin only)' })
  @ApiOkResponse({
    description: 'Password reset successfully. Returns the new password.',
    schema: {
      type: 'object',
      properties: {
        newPassword: {
          type: 'string',
          description: 'The new password (either custom or generated)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{
    newPassword: string;
  }> {
    return this.usersService.resetPassword(resetPasswordDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user (Admin only - Soft Delete)' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'The unique identifier of the user to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'User deleted successfully.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Success message confirming the user deletion',
          example: 'User "John Doe" has been successfully deleted.',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Admin role required',
  })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: Request,
  ): Promise<{ message: string }> {
    return this.usersService.delete(id, req);
  }
}
