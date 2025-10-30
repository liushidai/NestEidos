import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({
    description: '用户名',
    example: 'testuser',
    required: true,
    type: String,
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  userName: string;

  @ApiProperty({
    description: '密码',
    example: 'password123',
    required: true,
    type: String,
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  passWord: string;
}