import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HashService } from './services/hash.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [HashService],
  exports: [HashService],
})
export class CommonModule {}
