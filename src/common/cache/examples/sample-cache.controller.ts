import { Controller, Get, Post, Delete, Query, Param, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SampleCacheService } from './sample-cache.service';

@ApiTags('缓存示例')
@Controller('cache-demo')
export class SampleCacheController {
  private readonly logger = new Logger(SampleCacheController.name);

  constructor(private readonly sampleCacheService: SampleCacheService) {}

  @Get('user/:id')
  @ApiOperation({ summary: '获取用户信息（带缓存）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUser(@Param('id') id: string) {
    return this.sampleCacheService.getUserById(id);
  }

  @Get('products')
  @ApiOperation({ summary: '获取产品列表（带缓存）' })
  @ApiQuery({ name: 'category', required: true, description: '产品类别' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getProducts(@Query('category') category: string) {
    return this.sampleCacheService.getProductsByCategory(category);
  }

  @Get('hot-products')
  @ApiOperation({ summary: '获取热门产品（带缓存）' })
  @ApiQuery({ name: 'limit', required: false, description: '产品数量限制', type: Number })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getHotProducts(@Query('limit') limit?: number) {
    return this.sampleCacheService.getHotProducts(limit);
  }

  @Get('stock/:productId')
  @ApiOperation({ summary: '获取实时库存（无缓存）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStock(@Param('productId') productId: string) {
    return this.sampleCacheService.getRealTimeStock(productId);
  }

  @Get('user/:id/stats')
  @ApiOperation({ summary: '获取用户统计信息（带缓存）' })
  @ApiQuery({ name: 'includeStats', required: false, description: '是否包含统计信息', type: Boolean })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserWithStats(
    @Param('id') id: string,
    @Query('includeStats') includeStats?: boolean,
  ) {
    return this.sampleCacheService.getUserWithStats(id, includeStats);
  }

  @Post('user/:id')
  @ApiOperation({ summary: '更新用户信息（会清除相关缓存）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: { name?: string; email?: string },
  ) {
    return this.sampleCacheService.updateUser(id, updateData);
  }

  @Post('product-category')
  @ApiOperation({ summary: '更新产品类别（会清除相关缓存）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateProductCategory(
    @Body() data: { oldCategory: string; newCategory: string },
  ) {
    await this.sampleCacheService.updateProductCategory(data.oldCategory, data.newCategory);
    return { message: '产品类别更新成功' };
  }

  @Get('stats')
  @ApiOperation({ summary: '获取缓存统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCacheStats() {
    return this.sampleCacheService.getCacheStats();
  }

  @Delete('cache/all')
  @ApiOperation({ summary: '清除所有缓存' })
  @ApiResponse({ status: 200, description: '清除成功' })
  async clearAllCache() {
    await this.sampleCacheService.clearAllCache();
    return { message: '所有缓存已清除' };
  }

  @Post('cache/custom')
  @ApiOperation({ summary: '手动设置自定义缓存' })
  @ApiResponse({ status: 200, description: '设置成功' })
  async setCustomCache(
    @Body() data: { key: string; value: any; ttl?: number },
  ) {
    await this.sampleCacheService.setCustomCache(data.key, data.value, data.ttl);
    return { message: `缓存已设置: ${data.key}` };
  }

  @Get('cache/custom/:key')
  @ApiOperation({ summary: '获取自定义缓存' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCustomCache(@Param('key') key: string) {
    const value = await this.sampleCacheService.getCustomCache(key);
    return { key, value, exists: value !== undefined };
  }
}