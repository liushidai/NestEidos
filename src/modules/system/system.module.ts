import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SystemController } from './system.controller';

/**
 * 系统配置模块
 * 提供系统级配置信息的访问接口
 */
@Module({
  imports: [ConfigModule],
  controllers: [SystemController],
})
export class SystemModule {}