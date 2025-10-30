import { Module } from '@nestjs/common';
import { UserTempModule } from './user-temp/user-temp.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [RedisModule, UserTempModule, UserModule, AuthModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class ModulesModule {}
