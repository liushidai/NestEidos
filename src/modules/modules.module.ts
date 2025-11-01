import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AlbumModule } from './album/album.module';
import { ImageModule } from './image/image.module';
import { RedisModule } from '@/cache/monitoring/redis.module';

@Module({
  imports: [RedisModule, UserModule, AuthModule, AlbumModule, ImageModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class ModulesModule {}
