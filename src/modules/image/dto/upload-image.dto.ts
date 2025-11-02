import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsIn, IsNumber, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

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

  @ApiProperty({
    description: '图片默认格式',
    example: 'avif',
    enum: ['original', 'jpeg', 'webp', 'avif'],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['original', 'jpeg', 'webp', 'avif'], { message: 'defaultFormat 必须是 original, jpeg, webp, avif 之一' })
  defaultFormat?: 'original' | 'jpeg' | 'webp' | 'avif';

  @ApiProperty({
    description: '过期策略：1=永久保存，2=限时保留，3=限时删除',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @IsIn([1, 2, 3], { message: 'expirePolicy 必须是 1, 2, 3 之一' })
  @Transform(({ value }) => {
    // 统一转换为数字，支持字符串和数字输入
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  expirePolicy?: number;

  @ApiProperty({
    description: '过期时间（当 expirePolicy 不为 1 时必填）',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiProperty({
    description: '转换质量参数：1=通用，2=高质量，3=极限压缩，4=UI锐利',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @IsIn([1, 2, 3, 4], { message: 'quality 必须是 1, 2, 3, 4 之一' })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  quality?: number;
}