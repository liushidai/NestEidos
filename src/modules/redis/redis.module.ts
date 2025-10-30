import { Module, Global } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis';
import { redisConfig } from '../../config/redis.config';

@Global()
@Module({
  imports: [
    NestRedisModule.forRootAsync({
      useFactory: () => ({
        type: 'single',
        ...redisConfig(),
      }),
    }),
  ],
  exports: [NestRedisModule],
})
export class RedisModule {}