import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Album } from './entities/album.entity';
import { AlbumService } from './album.service';
import { AlbumRepository } from './repositories/album.repository';
import { ProtectedAlbumController } from './protected-album.controller';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '@/cache';

@Module({
  imports: [TypeOrmModule.forFeature([Album]), AuthModule, CacheModule],
  controllers: [ProtectedAlbumController],
  providers: [AlbumService, AlbumRepository],
  exports: [AlbumService, AlbumRepository],
})
export class AlbumModule {}