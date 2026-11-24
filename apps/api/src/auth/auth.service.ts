import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginThrottle } from './login-throttle.js';
import { hashPassword, verifyPassword } from './password.js';

export interface AuthUser {
  id: string;
  email: string;
}

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  private readonly throttle = new LoginThrottle();
  /** Hash de uma senha qualquer: usado para gastar o mesmo tempo quando o e-mail não existe. */
  private dummyHash?: Promise<string>;

  constructor(private readonly prisma: PrismaService) {}

  private normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  /** Cria a conta. A primeira conta do sistema herda as metas criadas antes do login existir. */
  async register(
    rawEmail: string,
    password: string,
  ): Promise<{ user: AuthUser; token: string }> {
    const email = this.normalize(rawEmail);
    const exists = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (exists) throw new ConflictException('E-mail já cadastrado');

    const isFirstUser = (await this.prisma.user.count()) === 0;
    const user = await this.prisma.user.create({
      data: { email, passwordHash: await hashPassword(password) },
      select: { id: true, email: true },
    });
    if (isFirstUser) {
      await this.prisma.goal.updateMany({
        where: { userId: null },
        data: { userId: user.id },
      });
    }
    return { user, token: await this.createSession(user.id) };
  }

  async login(
    rawEmail: string,
    password: string,
    ip: string,
  ): Promise<{ user: AuthUser; token: string }> {
    const email = this.normalize(rawEmail);
    const key = `${ip}|${email}`;
    if (this.throttle.isBlocked(key)) {
      throw new HttpException(
        'Muitas tentativas. Tente de novo em alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const found = await this.prisma.user.findUnique({ where: { email } });
    // Sempre calcula um hash, exista o e-mail ou não, para o tempo de
    // resposta não revelar quais e-mails têm conta.
    this.dummyHash ??= hashPassword('senha-que-nunca-sera-usada');
    const ok = await verifyPassword(
      password,
      found?.passwordHash ?? (await this.dummyHash),
    );
    if (!found || !ok) {
      this.throttle.recordFailure(key);
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    this.throttle.reset(key);
    return {
      user: { id: found.id, email: found.email },
      token: await this.createSession(found.id),
    };
  }

  /** Devolve o usuário dono do token, ou null se o token não existe ou venceu. */
  async validate(token: string): Promise<AuthUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      return null;
    }
    return session.user;
  }

  async logout(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { tokenHash: sha256(token) },
    });
  }

  private async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    return token;
  }
}
