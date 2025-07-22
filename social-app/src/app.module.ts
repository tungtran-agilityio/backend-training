import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { PostModule } from './post/post.module';
import { CommentModule } from './comment/comment.module';
import envSchema from './schemas/env.schema';

@Module({
  imports: [
    UserModule,
    PostModule,
    CommentModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
