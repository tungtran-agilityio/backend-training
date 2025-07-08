import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { TaskModule } from './task/task.module';
import { CommonService } from './common/common.service';
import { LogMiddleware } from './common/common.middleware';

@Module({
  imports: [UserModule, TaskModule],
  providers: [CommonService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LogMiddleware).forRoutes('*');
  }
}
