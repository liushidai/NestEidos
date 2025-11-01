import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Image } from './entities/image.entity';
import { ImageService } from './image.service';
import { ImageRepository } from './repositories/image.repository';
import { ProtectedImageController } from './protected-image.controller';
import { ImagesController } from './images.controller';
import { ImageUploadController } from './image-upload.controller';
import { AuthModule } from '../auth/auth.module';
import { StorageService } from '../../services/storage.service';
import { TempFileService } from '../../services/temp-file.service';
import { SecureIdUtil } from '../../utils/secure-id.util';
import { CacheModule } from '@/cache';

@Module({
  imports: [
    TypeOrmModule.forFeature([Image]),
    AuthModule,
    ConfigModule,
    CacheModule,
  ],
  controllers: [ProtectedImageController, ImagesController, ImageUploadController],
  providers: [
    ImageService,
    ImageRepository,
    StorageService,
    TempFileService,
    SecureIdUtil,
  ],
  exports: [ImageService, ImageRepository],
})
export class ImageModule {}