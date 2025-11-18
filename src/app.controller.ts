import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('应用管理')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: '应用健康检查',
    description: '检查应用是否正常运行',
  })
  @ApiResponse({
    status: 200,
    description: '应用正常运行',
    schema: {
      example: {
        message: '欢迎使用 NestEidos 图床服务',
        timestamp: '2024-01-01T00:00:00.000Z',
        version: '2.0.0',
        status: 'healthy',
      },
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
