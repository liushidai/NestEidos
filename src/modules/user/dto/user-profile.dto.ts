import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({
    description: '用户ID',
    example: '1234567890123456789',
    type: 'string',
  })
  id: string;

  @ApiProperty({
    description: '用户名',
    example: 'testuser',
    type: 'string',
    maxLength: 64,
  })
  userName: string;

  @ApiProperty({
    description: '用户类型：1-管理员，10-普通用户',
    example: 10,
    enum: [1, 10],
    type: 'number',
  })
  userType: number;

  @ApiProperty({
    description: '用户状态：1-正常，2-封锁',
    example: 1,
    enum: [1, 2],
    type: 'number',
  })
  userStatus: number;

  @ApiProperty({
    description: '创建时间',
    example: '2024-01-01T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2024-01-01T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;

  static fromUser(user: any): UserProfileDto {
    const userProfile = new UserProfileDto();
    userProfile.id = user.id;
    userProfile.userName = user.userName;
    userProfile.userType = user.userType;
    userProfile.userStatus = user.userStatus;
    userProfile.createdAt = user.createdAt;
    userProfile.updatedAt = user.updatedAt;
    return userProfile;
  }
}
