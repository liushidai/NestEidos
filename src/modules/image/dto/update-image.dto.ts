import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateImageDto {
  @ApiProperty({
    description: '图片标题，用户可自定义',
    example: '更新后的图片标题',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'title 不能为空字符串' })
  title?: string;
}