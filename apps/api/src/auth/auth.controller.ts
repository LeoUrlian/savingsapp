import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginDto, RegisterDto } from './auth.dto.js';
import {
  CurrentUser,
  Public,
  readCookie,
  SESSION_COOKIE,
} from './auth.guard.js';
import { AuthService, SESSION_TTL_MS, type AuthUser } from './auth.service.js';

const cookieOptions = () => ({
  httpOnly: true, // o JavaScript da página não consegue ler o cookie
  sameSite: 'lax' as const, // não vai em POST vindo de outro site
  secure: process.env.NODE_ENV === 'production', // só HTTPS em produção
  path: '/',
});

/**
 *   POST /auth/register  cria a conta e já entra
 *   POST /auth/login     entra
 *   POST /auth/logout    sai
 *   GET  /auth/me        quem sou eu
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const { user, token } = await this.auth.register(dto.email, dto.password);
    res.cookie(SESSION_COOKIE, token, {
      ...cookieOptions(),
      maxAge: SESSION_TTL_MS,
    });
    return user;
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const { user, token } = await this.auth.login(
      dto.email,
      dto.password,
      req.ip ?? 'desconhecido',
    );
    res.cookie(SESSION_COOKIE, token, {
      ...cookieOptions(),
      maxAge: SESSION_TTL_MS,
    });
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) await this.auth.logout(token);
    res.clearCookie(SESSION_COOKIE, cookieOptions());
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
