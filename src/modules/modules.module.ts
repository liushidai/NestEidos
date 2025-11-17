import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { AlbumModule } from './album/album.module';
import { ImageModule } from './image/image.module';
import { SystemModule } from './system/system.module';
import { RedisModule } from '@/cache';

@Module({
  imports: [RedisModule, UserModule, AuthModule, AlbumModule, ImageModule, SystemModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class ModulesModule {}
