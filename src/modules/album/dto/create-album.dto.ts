import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAlbumDto {
  @ApiProperty({
    description: '相册名称',
    example: '我的相册',
    required: true,
    type: String,
    minLength: 1,
    maxLength: 128,
  })
  @IsString({ message: '相册名称必须是字符串' })
  @IsNotEmpty({ message: '相册名称不能为空' })
  @MinLength(1, { message: '相册名称至少1个字符' })
  @MaxLength(128, { message: '相册名称最多128个字符' })
  albumName: string;
}