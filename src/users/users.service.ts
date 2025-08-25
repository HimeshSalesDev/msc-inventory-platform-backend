import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuditEventService } from 'src/audit-log/audit-event.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    private auditEventService: AuditEventService,
  ) {}

  // Existing methods...
  async findByEmail(email: string): Promise<User | null> {
    const trimmedEmail = email?.trim();
    if (!trimmedEmail) {
      return null;
    }

    return this.usersRepository.findOne({
      where: { email: trimmedEmail },
      relations: ['role'],
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    const trimmedEmail = email?.trim();
    if (!trimmedEmail) {
      return null;
    }

    return this.usersRepository.findOne({
      where: { email: trimmedEmail },
      relations: ['role'],
      select: ['id', 'email', 'password', 'fullName', 'role'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  async findAll(currentUserId: string): Promise<User[]> {
    return this.usersRepository.find({
      where: { id: Not(currentUserId) },
      relations: ['role'],
      select: ['id', 'email', 'fullName', 'createdAt', 'updatedAt', 'role'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(createUserDto: CreateUserDto, req: any): Promise<User> {
    const { email, password, fullName, role } = createUserDto;

    const trimmedEmail = email?.trim();
    if (!trimmedEmail) {
      throw new BadRequestException(`Email is required.`);
    }

    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email },
      withDeleted: true,
    });

    if (existingUser) {
      if (existingUser.deletedAt) {
        // User exists but is soft-deleted
        throw new ConflictException(
          `An account with email "${email}" was previously deleted. Please contact administrator to restore the account or use a different email.`,
        );
      } else {
        // User exists and is active
        throw new ConflictException(
          `User with email "${email}" already exists.`,
        );
      }
    }

    // Find role by name
    const roleRecord = await this.rolesRepository.findOne({
      where: { name: role },
    });

    if (!roleRecord) {
      throw new BadRequestException(`Role "${role}" not found.`);
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      fullName,
      role: roleRecord,
    });

    const newUser = await this.usersRepository.save(user);

    if (req?.user?.id) {
      const requestContext = {
        userId: req.user.id,
        userName: req.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        controllerPath: req.route?.path || req.originalUrl,
      };
      this.auditEventService.emitUserCreated(
        requestContext,
        {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role.name,
        },
        newUser.id,
      );
    }

    return newUser;
  }

  async update(updateUserDto: UpdateUserDto, req: any): Promise<User> {
    const { id, email, fullName, role } = updateUserDto;

    // Check if user exists
    const existingUser = await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    // Check email uniqueness if email is being updated
    if (email && email !== existingUser.email) {
      const emailExists = await this.usersRepository.findOne({
        where: { email, id: Not(id) },
      });

      if (emailExists) {
        throw new ConflictException(
          `User with email "${email}" already exists.`,
        );
      }
    }

    // Update data object
    const updateData: Partial<User> = {};

    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;

    // Handle role update
    if (role) {
      const roleRecord = await this.rolesRepository.findOne({
        where: { name: role },
      });

      if (!roleRecord) {
        throw new BadRequestException(`Role "${role}" not found.`);
      }

      updateData.role = roleRecord;
    }
    const previousData = {
      id: existingUser.id,
      email: existingUser.email,
      fullName: existingUser.fullName,
      role: existingUser.role.name,
    };
    // Update user
    Object.assign(existingUser, updateData);
    const updatedUser = await this.usersRepository.save(existingUser);

    if (req?.user?.id) {
      const requestContext = {
        userId: req.user.id,
        userName: req.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        controllerPath: req.route?.path || req.originalUrl,
      };
      this.auditEventService.emitUserUpdated(
        requestContext,
        previousData,
        {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          role: updatedUser.role.name,
        },
        updatedUser.id,
      );
    }

    return updatedUser;
  }

  async delete(id: string, req: any): Promise<{ message: string }> {
    // Check if user exists (this will automatically exclude soft-deleted users)
    const existingUser = await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    // Store user data for audit log before deletion
    const userData = {
      id: existingUser.id,
      email: existingUser.email,
      fullName: existingUser.fullName,
      role: existingUser.role.name,
    };

    // Perform soft delete
    await this.usersRepository.softDelete(id);

    // Emit audit event
    if (req?.user?.id) {
      const requestContext = {
        userId: req.user.id,
        userName: req.user.fullName,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
        controllerPath: req.route?.path || req.originalUrl,
      };

      this.auditEventService.emitIUserDeleted(requestContext, userData, id);
    }

    return {
      message: `User "${existingUser.fullName}" has been successfully deleted.`,
    };
  }

  private generateRandomPassword(length: number = 8): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }

    return password;
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ newPassword: string }> {
    const { id, customPassword } = resetPasswordDto;

    // Check if user exists
    const existingUser = await this.usersRepository.findOne({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    // Determine new password
    let newPassword: string;
    if (customPassword && customPassword.trim()) {
      newPassword = customPassword.trim();
    } else {
      newPassword = this.generateRandomPassword();
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    await this.usersRepository.update({ id }, { password: hashedNewPassword });

    return { newPassword };
  }
}
