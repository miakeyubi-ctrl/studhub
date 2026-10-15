import { Global, Module, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.prisma.$connect();
    } catch (err) {
      // Laisser le boot planter si BDD inaccessible (fail fast)
      // eslint-disable-next-line no-console
      console.error('❌ Prisma connexion BDD échouée :', err);
      throw err;
    }
  }
}
