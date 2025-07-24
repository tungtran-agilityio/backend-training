import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { PostModule } from './post/post.module';
import { CommentModule } from './comment/comment.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
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
    AuthModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
