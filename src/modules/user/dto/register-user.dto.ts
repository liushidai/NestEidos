import { IsString, IsNotEmpty, IsIn, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({
    description: '用户名',
    example: 'testuser',
    required: true,
    type: String,
    minLength: 3,
    maxLength: 64,
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名至少3个字符' })
  userName: string;

  @ApiProperty({
    description: '密码',
    example: 'password123',
    required: true,
    type: String,
    minLength: 6,
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码至少6个字符' })
  passWord: string;

  @ApiProperty({
    description: '用户类型：1-管理员，10-普通用户',
    example: 10,
    required: true,
    type: Number,
    enum: [1, 10],
  })
  @IsIn([1, 10], { message: '用户类型必须是1(管理员)或10(普通用户)' })
  userType: number;
}