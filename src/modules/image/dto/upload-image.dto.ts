import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UploadImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '要上传的图片文件',
    required: true,
  })
  file: Express.Multer.File;

  @ApiProperty({
    description: '所属相册ID，若未归属任何相册则为0',
    example: '0',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'albumId 不能为空字符串' })
  albumId?: string;

  @ApiProperty({
    description: '图片标题，用户可自定义，可为空',
    example: '一只可爱的猫咪',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;
}