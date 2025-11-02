import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../decorators/strong-password.decorator';

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
    example: 'Password123!',
    required: true,
    type: String,
    minLength: 8,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsStrongPassword({ message: '密码必须至少8位，包含大写字母、小写字母、数字和特殊字符(@$!%*?&)' })
  passWord: string;
}