import { ApiProperty } from '@nestjs/swagger';

export class ImageResponseDto {
  @ApiProperty({
    description: '图片ID',
    example: '1234567890123456789',
  })
  id: string;

  @ApiProperty({
    description: '所属用户ID',
    example: '1234567890123456788',
  })
  userId: string;

  @ApiProperty({
    description: '所属相册ID，若未归属任何相册则为0',
    example: '0',
  })
  albumId: string;

  @ApiProperty({
    description: '原始文件名（含扩展名）',
    example: 'photo.jpg',
  })
  originalName: string;

  @ApiProperty({
    description: '图片标题，用户可自定义',
    example: '一只可爱的猫咪',
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: '文件内容的 SHA256 哈希值',
    example: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
  })
  imageHash: string;

  @ApiProperty({
    description: '原始文件大小，单位：字节',
    example: 1024000,
  })
  imageSize: number;

  @ApiProperty({
    description: '原始 MIME 类型',
    example: 'image/jpeg',
  })
  imageMimeType: string;

  @ApiProperty({
    description: '原始图片宽度，单位：像素',
    example: 1920,
  })
  imageWidth: number;

  @ApiProperty({
    description: '原始图片高度，单位：像素',
    example: 1080,
  })
  imageHeight: number;

  @ApiProperty({
    description: '原始文件在对象存储中的路径',
    example: 'originals/abc123def456.jpg',
  })
  originalKey: string;

  @ApiProperty({
    description: 'JPEG 格式文件在对象存储中的路径',
    example: 'processed/abc123def456.jpg',
    required: false,
  })
  jpegKey?: string;

  @ApiProperty({
    description: 'WebP 格式文件在对象存储中的路径',
    example: 'processed/abc123def456.webp',
    required: false,
  })
  webpKey?: string;

  @ApiProperty({
    description: 'AVIF 格式文件在对象存储中的路径',
    example: 'processed/abc123def456.avif',
    required: false,
  })
  avifKey?: string;

  @ApiProperty({
    description: '是否已成功生成 JPEG 格式',
    example: true,
  })
  hasJpeg: boolean;

  @ApiProperty({
    description: '是否已成功生成 WebP 格式',
    example: true,
  })
  hasWebp: boolean;

  @ApiProperty({
    description: '是否已成功生成 AVIF 格式',
    example: true,
  })
  hasAvif: boolean;

  @ApiProperty({
    description: '图片默认格式',
    example: 'avif',
    enum: ['original', 'webp', 'avif'],
  })
  defaultFormat: 'original' | 'webp' | 'avif';

  @ApiProperty({
    description: '图片过期策略：1=永久保存，2=限时保留，3=限时删除',
    example: 1,
    enum: [1, 2, 3],
  })
  expirePolicy: number;

  @ApiProperty({
    description: '图片过期时间',
    example: '9999-12-31T23:59:59Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: '图片 NSFW 分数（0.0 到 1.0）',
    example: 0.1,
    required: false,
  })
  nsfwScore?: number;

  @ApiProperty({
    description: '创建时间',
    example: '2024-01-01T12:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: '更新时间',
    example: '2024-01-01T12:00:00Z',
  })
  updatedAt: string;
}