import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { SnowflakeUtil } from '@/utils/snowflake.util';

@Injectable()
export class ParseSnowflakeIdPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new BadRequestException('ID 参数是必需的');
    }

    // 检查是否为有效的数字字符串
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException('ID 必须是有效的数字');
    }

    // 检查数字长度（雪花算法 ID 通常是 18-19 位）
    const numValue = BigInt(value);
    if (numValue < 1000000000000000000n || numValue > 9999999999999999999n) {
      throw new BadRequestException('ID 格式不正确，应为有效的雪花算法 ID');
    }

    return value;
  }
}