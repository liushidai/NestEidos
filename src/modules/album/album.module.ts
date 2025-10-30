import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Album } from './entities/album.entity';
import { AlbumService } from './album.service';
import { ProtectedAlbumController } from './protected-album.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Album]), AuthModule],
  controllers: [ProtectedAlbumController],
  providers: [AlbumService],
  exports: [AlbumService],
})
export class AlbumModule {}