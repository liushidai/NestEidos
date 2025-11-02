import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsIn } from 'class-validator';

/**
 * 用户状态切换 DTO
 */
export class ToggleUserStatusDto {
  @ApiProperty({
    description: '用户状态',
    example: 1,
    type: Number,
    enum: [0, 1],
    enumName: 'UserStatus',
  })
  @IsInt({ message: '用户状态必须是整数' })
  @IsIn([0, 1], { message: '用户状态只能是 0（禁用）或 1（启用）' })
  userStatus: number;
}