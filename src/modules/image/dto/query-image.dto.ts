import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumberString, IsNotEmpty } from 'class-validator';

export class QueryImageDto {
  @ApiProperty({
    description: '页码，从1开始',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @ApiProperty({
    description: '每页数量',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumberString()
  limit?: string = '10';

  @ApiProperty({
    description: '图片标题模糊搜索',
    example: '猫咪',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: '所属相册ID筛选',
    example: '1234567890123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'albumId 不能为空字符串' })
  albumId?: string;

  @ApiProperty({
    description: 'MIME类型筛选，支持多选',
    example: ['image/jpeg', 'image/png'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mimeType?: string[];
}