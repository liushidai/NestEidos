import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsIn, IsNumber, IsDateString } from 'class-validator';

export class CreateImageDto {
  @ApiProperty({
    description: '图片标题，用户可自定义，可为空',
    example: '一只可爱的猫咪',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: '所属相册ID，若未归属任何相册则为0',
    example: '0',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'albumId 不能为空字符串' })
  albumId?: string;

  @ApiProperty({
    description: '图片默认格式',
    example: 'avif',
    enum: ['original', 'webp', 'avif'],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['original', 'webp', 'avif'], { message: 'defaultFormat 必须是 original, webp, avif 之一' })
  defaultFormat?: 'original' | 'webp' | 'avif';

  @ApiProperty({
    description: '过期策略：1=永久保存，2=限时保留，3=限时删除',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @IsIn([1, 2, 3], { message: 'expirePolicy 必须是 1, 2, 3 之一' })
  expirePolicy?: number;

  @ApiProperty({
    description: '过期时间（当 expirePolicy 不为 1 时必填）',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}