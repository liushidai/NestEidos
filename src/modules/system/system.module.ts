import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SystemController } from './system.controller';
import { HealthController } from './health.controller';

/**
 * 系统配置模块
 * 提供系统级配置信息和健康检查的访问接口
 */
@Module({
  imports: [ConfigModule, TypeOrmModule],
  controllers: [SystemController, HealthController],
})
export class SystemModule {}
