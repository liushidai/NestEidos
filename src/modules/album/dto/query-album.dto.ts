import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryAlbumDto {
  @ApiProperty({
    description: '页码，从1开始',
    example: 1,
    required: false,
    type: Number,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为1' })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 10,
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为1' })
  @Max(100, { message: '每页数量最大为100' })
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    description: '相册名称模糊搜索',
    example: '我的',
    required: false,
    type: String,
  })
  @IsString({ message: '搜索关键词必须是字符串' })
  @IsOptional()
  search?: string;
}
