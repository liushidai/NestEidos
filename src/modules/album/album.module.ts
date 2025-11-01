import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Album } from './entities/album.entity';
import { AlbumService } from './album.service';
import { AlbumRepository } from './repositories/album.repository';
import { ProtectedAlbumController } from './protected-album.controller';
import { AuthModule } from '../auth/auth.module';
import { SimpleCacheModule } from '@/common/cache';

@Module({
  imports: [TypeOrmModule.forFeature([Album]), AuthModule, SimpleCacheModule],
  controllers: [ProtectedAlbumController],
  providers: [AlbumService, AlbumRepository],
  exports: [AlbumService, AlbumRepository],
})
export class AlbumModule {}