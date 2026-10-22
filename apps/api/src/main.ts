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

  // Permite que o front (Next, em http://localhost:3000) chame esta API.
  // Em produção restringimos a origem; em dev liberamos.
  app.enableCors({ origin: true });

  const port = Number(process.env.API_PORT ?? 3333);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SavingsApp API em http://localhost:${port}`);
}
await bootstrap();
