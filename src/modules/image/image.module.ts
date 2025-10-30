import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Image } from './entities/image.entity';
import { ImageService } from './image.service';
import { ProtectedImageController } from './protected-image.controller';
import { ImageUploadController } from './image-upload.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Image]), AuthModule],
  controllers: [ProtectedImageController, ImageUploadController],
  providers: [ImageService],
  exports: [ImageService],
})
export class ImageModule {}