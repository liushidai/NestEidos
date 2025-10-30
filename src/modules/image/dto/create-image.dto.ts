import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

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
}