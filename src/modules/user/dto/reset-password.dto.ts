import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsOptional,
} from 'class-validator';

/**
 * 重置密码 DTO
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: '新密码（如果不提供则使用默认密码）',
    example: 'NewPassword123!',
    required: false,
    type: String,
    minLength: 8,
    pattern:
      '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
  })
  @IsOptional()
  @IsString({ message: '新密码必须是字符串' })
  @MinLength(8, { message: '新密码至少需要8个字符' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        '新密码必须至少8位，包含大写字母、小写字母、数字和特殊字符(@$!%*?&)',
    },
  )
  newPassword?: string;

  @ApiProperty({
    description: '是否使用默认密码重置',
    example: false,
    default: false,
    type: Boolean,
  })
  @IsOptional()
  useDefaultPassword?: boolean = false;
}
