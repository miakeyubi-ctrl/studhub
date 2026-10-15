import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SupportController],
})
export class SupportModule {}
