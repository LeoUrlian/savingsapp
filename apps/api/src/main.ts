import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Permite que o front (Next, em http://localhost:3000) chame esta API.
  // Em produção restringimos a origem; em dev liberamos.
  app.enableCors({ origin: true });

  const port = Number(process.env.API_PORT ?? 3333);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Migra API em http://localhost:${port}`);
}
await bootstrap();
