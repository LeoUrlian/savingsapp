// Carrega o .env ANTES de qualquer outra importação: o PrismaService lê
// process.env.DATABASE_URL já no construtor, então as variáveis precisam
// existir antes de o Nest instanciar os providers. (dotenv já é dep do
// prisma.config.ts — reaproveitamos em vez de adicionar @nestjs/config agora.)
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Valida e sanitiza TODA entrada contra os DTOs:
  //  whitelist            — descarta campos não declarados no DTO
  //  forbidNonWhitelisted — rejeita (400) se vierem campos extras
  //  transform            — instancia o DTO e converte tipos primitivos
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Cabeçalhos básicos de segurança. A API só devolve JSON, então nada aqui
  // atrapalha o front.
  app.use(
    (
      _req: unknown,
      res: { setHeader(name: string, value: string): void },
      next: () => void,
    ) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Cache-Control', 'no-store');
      next();
    },
  );

  // CORS com cookie de sessão: o navegador só envia o cookie para uma origem
  // EXATA (nunca "*" nem "refletir qualquer origem"). Em produção, defina
  // WEB_ORIGIN com o endereço do front.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = Number(process.env.API_PORT ?? 3333);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SavingsApp API em http://localhost:${port}`);
}
await bootstrap();
