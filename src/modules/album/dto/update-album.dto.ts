import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAlbumDto {
  @ApiProperty({
    description: '相册名称',
    example: '更新后的相册名称',
    required: false,
    type: String,
    minLength: 1,
    maxLength: 128,
  })
  @IsString({ message: '相册名称必须是字符串' })
  @IsNotEmpty({ message: '相册名称不能为空' })
  @MinLength(1, { message: '相册名称至少1个字符' })
  @MaxLength(128, { message: '相册名称最多128个字符' })
  @IsOptional()
  albumName?: string;
}
