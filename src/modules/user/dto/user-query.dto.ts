import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

/**
 * 用户查询 DTO
 */
export class UserQueryDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    default: 1,
    minimum: 1,
    type: Number,
  })
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小值为1' })
  page: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
    type: Number,
  })
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小值为1' })
  @Max(100, { message: '每页数量最大值为100' })
  limit: number = 10;

  @ApiProperty({
    description: '用户名模糊搜索',
    example: 'admin',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString({ message: '用户名搜索必须是字符串' })
  userName?: string;

  @ApiProperty({
    description: '用户类型筛选',
    example: 10,
    required: false,
    type: Number,
    enum: [1, 10],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '用户类型必须是整数' })
  userType?: number;

  @ApiProperty({
    description: '用户状态筛选',
    example: 1,
    required: false,
    type: Number,
    enum: [1, 2],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '用户状态必须是整数' })
  @IsIn([1, 2], { message: '用户状态只能是 1（正常）或 2（封锁）' })
  userStatus?: number;
}