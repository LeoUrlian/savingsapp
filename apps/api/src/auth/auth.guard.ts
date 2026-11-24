import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService, type AuthUser } from './auth.service.js';

export const SESSION_COOKIE = 'session';
const IS_PUBLIC = 'isPublic';

/** Marca uma rota como aberta (sem login). Todas as outras exigem sessão. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export type RequestWithUser = Request & { user?: AuthUser };

/** Lê um cookie do cabeçalho, sem depender de cookie-parser. */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      return decodeURIComponent(part.slice(i + 1).trim());
    }
  }
  return undefined;
}

/** Usuário logado da requisição. Só use em rotas que não são @Public(). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<RequestWithUser>().user as AuthUser,
);

/** Guard global: sem sessão válida, 401. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const token = readCookie(req, SESSION_COOKIE);
    const user = token ? await this.auth.validate(token) : null;
    if (!user) throw new UnauthorizedException('Faça login para continuar');
    req.user = user;
    return true;
  }
}
