import { Controller, Post, Body, Req, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login/web')
  @ApiOperation({ summary: 'Web login (non-mobile roles)' })
  @ApiBody({ type: LoginDto, description: 'Provide email and password' })
  async loginWeb(@Body() dto: LoginDto, @Request() req: Request) {
    return this.authService.loginWeb(dto, req);
  }

  @Post('login/mobile')
  @ApiOperation({ summary: 'Mobile login (mobile-only role)' })
  @ApiBody({ type: LoginDto, description: 'Provide email and password' })
  async loginMobile(@Body() dto: LoginDto, @Request() req: Request) {
    return this.authService.loginMobile(dto, req);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT token' })
  async refresh(@Req() req: Request) {
    const token = req.headers['authorization']?.split(' ')[1];

    return this.authService.refreshToken(token);
  }
}
