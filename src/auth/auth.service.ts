import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../enums/roles.enum';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { AuditEventService } from 'src/audit-log/audit-event.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditEventService: AuditEventService,
  ) {}

  private async validateUser(email: string, pass: string) {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user)
      throw new UnauthorizedException('Invalid credentials or email not found');
    const matches = await bcrypt.compare(pass, (user as any).password);
    if (!matches) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  private getToken(
    userId: string,
    email: string,
    role: string,
    fullName: string,
  ): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    return this.jwtService.sign(
      { id: userId, email, role, fullName },
      { secret, expiresIn: '7d' },
    );
  }

  async loginWeb(dto: LoginDto, req: any) {
    const user = await this.validateUser(dto.email, dto.password);
    if (user.role.name === UserRole.MOBILE_APP.toString())
      throw new BadRequestException('Use mobile login');

    const token = this.getToken(
      user.id,
      user.email,
      user.role.name,
      user.fullName,
    );

    if (user.id) {
      this.auditEventService.emitLoginEvent(
        user.id,
        user.fullName,
        req?.ip,
        req?.get('User-Agent'),
      );
    }

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role.name,
      },
      token,
    };
  }

  async loginMobile(dto: LoginDto, req: any) {
    const user = await this.validateUser(dto.email, dto.password);
    if (user.role.name !== UserRole.MOBILE_APP.toString())
      throw new BadRequestException('Not a mobile user');
    const token = this.getToken(
      user.id,
      user.email,
      user.role.name,
      user.fullName,
    );

    if (user.id) {
      this.auditEventService.emitLoginEvent(
        user.id,
        user.fullName,
        req?.ip,
        req?.get('User-Agent'),
      );
    }

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role.name,
      },
      token,
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      const user = await this.usersService.findById(payload.id);
      if (!user) throw new UnauthorizedException();
      const newToken = this.getToken(
        user.id,
        user.email,
        user.role.name,
        user.fullName,
      );
      return {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role.name,
        },
        token: newToken,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
