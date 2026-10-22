import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Serviço que encapsula o PrismaClient e seu ciclo de vida no Nest.
 *
 * No Prisma 7 a conexão não vem mais de uma URL no schema: instanciamos um
 * driver adapter (aqui o PrismaPg, para Postgres) com a connection string e
 * passamos ao PrismaClient. Isso desacopla o client do driver de banco.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL não definida no ambiente');
    }
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
