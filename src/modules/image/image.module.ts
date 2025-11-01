import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Image } from './entities/image.entity';
import { File } from './entities/file.entity';
import { ImageService } from './image.service';
import { ImageRepository } from './repositories/image.repository';
import { FileRepository } from './repositories/file.repository';
import { ProtectedImageController } from './protected-image.controller';
import { ImageUploadController } from './image-upload.controller';
import { AuthModule } from '../auth/auth.module';
import { StorageService } from '../../services/storage.service';
import { TempFileService } from '../../services/temp-file.service';
import { SecureIdUtil } from '../../utils/secure-id.util';
import { SimpleCacheModule } from '../../common/cache';

@Module({
  imports: [
    TypeOrmModule.forFeature([Image, File]),
    AuthModule,
    ConfigModule,
    SimpleCacheModule,
  ],
  controllers: [ProtectedImageController, ImageUploadController],
  providers: [
    ImageService,
    ImageRepository,
    FileRepository,
    StorageService,
    TempFileService,
    SecureIdUtil,
  ],
  exports: [ImageService, ImageRepository, FileRepository],
})
export class ImageModule {}