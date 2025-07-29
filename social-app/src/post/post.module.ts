import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [PostController],
  providers: [PostService],
  imports: [PrismaModule],
})
export class PostModule {}
