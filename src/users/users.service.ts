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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  // Existing methods...
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
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

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, fullName, role } = createUserDto;

    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(`User with email "${email}" already exists.`);
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

    return this.usersRepository.save(user);
  }

  async update(updateUserDto: UpdateUserDto): Promise<User> {
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
        where: { email, id: { $ne: id } as any },
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

    // Update user
    Object.assign(existingUser, updateData);
    return this.usersRepository.save(existingUser);
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
