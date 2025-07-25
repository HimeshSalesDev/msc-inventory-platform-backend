import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Role) private rolesRepo: Repository<Role>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const role = await this.rolesRepo.findOneBy({ name: dto.role });

    const hashPassword = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepo.create({
      fullName: dto.fullName,
      email: dto.email,
      password: hashPassword,
      role_id: role.id,
    });
    return this.usersRepo.save(user);
  }

  async findByEmailWithPassword(email: string): Promise<User | undefined> {
    return this.usersRepo.findOne({
      where: { email },
      select: ['id', 'fullName', 'email', 'password'], // explicitly select password
      relations: ['role'],
    });
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepo.findOne({ where: { email }, relations: ['role'] });
  }

  async findByEmailAndRole(
    email: string,
    roleName: string,
  ): Promise<User | undefined> {
    return this.usersRepo
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.role', 'role', 'role.name = :roleName', {
        roleName,
      })
      .where('user.email = :email', { email })
      .getOne();
  }
}
