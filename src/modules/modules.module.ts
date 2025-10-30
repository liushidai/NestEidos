import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AlbumModule } from './album/album.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [RedisModule, UserModule, AuthModule, AlbumModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class ModulesModule {}
