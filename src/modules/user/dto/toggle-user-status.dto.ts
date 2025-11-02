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
    enum: [1, 2],
    enumName: 'UserStatus',
  })
  @IsInt({ message: '用户状态必须是整数' })
  @IsIn([1, 2], { message: '用户状态只能是 1（正常）或 2（封锁）' })
  userStatus: number;
}