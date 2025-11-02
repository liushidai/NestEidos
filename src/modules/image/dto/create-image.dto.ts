import { IsString, IsOptional, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateImageDto {
  @ApiProperty({
    description: '图片标题',
    example: '我的图片',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: '图片描述',
    example: '这是一张美丽的图片',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: '相册ID',
    example: '123',
    required: false,
  })
  @IsOptional()
  @IsNotEmpty({ message: 'albumId 不能为空字符串' })
  @Transform(({ value }) => {
    // 统一转换为字符串，支持数字和字符串输入
    return value !== null && value !== undefined ? String(value) : undefined;
  })
  albumId?: string;

  @ApiProperty({
    description: '图片默认格式',
    example: 'webp',
    required: false,
    enum: ['webp', 'avif', 'original'],
  })
  @IsOptional()
  @IsIn(['webp', 'avif', 'original'], { message: 'format 必须是 webp, avif, original 之一' })
  format?: string;

  @ApiProperty({
    description: '过期策略',
    example: 1,
    required: false,
    enum: [1, 2, 3],
  })
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
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiProperty({
    description: '转换质量参数：1=通用，2=高质量，3=极限压缩，4=UI锐利',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsIn([1, 2, 3, 4], { message: 'quality 必须是 1, 2, 3, 4 之一' })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  quality?: number;
}