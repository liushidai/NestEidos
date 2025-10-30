import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { Readable } from 'stream';

/**
 * 存储服务接口
 */
export interface StorageProvider {
  upload(filePath: string, buffer: Buffer, contentType: string): Promise<string>;
  delete(key: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  getBucket(): string;
}

/**
 * MinIO 存储服务实现
 */
@Injectable()
export class StorageService implements StorageProvider, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = parseInt(this.configService.get<string>('MINIO_PORT', '9000'));
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'images');

    if (!accessKey || !secretKey) {
      throw new Error('MinIO 凭据未配置: MINIO_ACCESS_KEY 和 MINIO_SECRET_KEY 环境变量是必需的');
    }

    this.client = new Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    this.logger.log(`MinIO 客户端已初始化: ${endPoint}:${port}, bucket: ${this.bucket}`);
  }

  async onModuleInit() {
    try {
      // 检查 bucket 是否存在，不存在则创建
      const bucketExists = await this.client.bucketExists(this.bucket);
      if (!bucketExists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`MinIO bucket 已创建: ${this.bucket}`);
      } else {
        this.logger.log(`MinIO bucket 已存在: ${this.bucket}`);
      }
    } catch (error) {
      this.logger.error('初始化 MinIO 失败', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    // MinIO 客户端会自动清理连接
    this.logger.log('存储服务已关闭');
  }

  /**
   * 上传文件到 MinIO
   */
  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    try {
      const stream = Readable.from(buffer);

      await this.client.putObject(
        this.bucket,
        key,
        stream,
        buffer.length,
        {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // 缓存一年
        }
      );

      this.logger.debug(`文件已上传: ${key}, 大小: ${buffer.length} bytes`);
      return key;
    } catch (error) {
      this.logger.error(`上传文件失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 从 MinIO 删除文件
   */
  async delete(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, key);
      this.logger.debug(`文件已删除: ${key}`);
    } catch (error) {
      this.logger.error(`删除文件失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 批量删除文件
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    try {
      // MinIO 支持批量删除
      await this.client.removeObjects(this.bucket, keys);
      this.logger.debug(`已批量删除 ${keys.length} 个文件`);
    } catch (error) {
      this.logger.error(`批量删除文件失败`, error);
      throw error;
    }
  }

  /**
   * 获取文件的预签名URL
   */
  async getSignedUrl(key: string, expiresIn: number = 24 * 60 * 60): Promise<string> {
    try {
      const url = await this.client.presignedGetObject(
        this.bucket,
        key,
        expiresIn
      );
      return url;
    } catch (error) {
      this.logger.error(`获取预签名URL失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 获取文件元数据
   */
  async getStat(key: string): Promise<any> {
    try {
      return await this.client.statObject(this.bucket, key);
    } catch (error) {
      this.logger.error(`获取文件元数据失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, key);
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      this.logger.error(`检查文件存在性失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 下载文件
   */
  async download(key: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(this.bucket, key);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        stream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        stream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error(`下载文件失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 复制文件
   */
  async copy(sourceKey: string, destKey: string): Promise<void> {
    try {
      await this.client.copyObject(
        this.bucket,
        destKey,
        `/${this.bucket}/${sourceKey}`
      );
      this.logger.debug(`文件已复制: ${sourceKey} -> ${destKey}`);
    } catch (error) {
      this.logger.error(`复制文件失败: ${sourceKey} -> ${destKey}`, error);
      throw error;
    }
  }

  /**
   * 列出指定前缀的文件
   */
  async listFiles(prefix: string = '', recursive: boolean = false): Promise<any[]> {
    try {
      const objectsStream = this.client.listObjects(this.bucket, prefix, recursive);
      const objects: any[] = [];

      return new Promise((resolve, reject) => {
        objectsStream.on('data', (obj) => {
          objects.push(obj);
        });

        objectsStream.on('error', (error) => {
          reject(error);
        });

        objectsStream.on('end', () => {
          resolve(objects);
        });
      });
    } catch (error) {
      this.logger.error(`列出文件失败: prefix=${prefix}`, error);
      throw error;
    }
  }

  /**
   * 获取 bucket 名称
   */
  getBucket(): string {
    return this.bucket;
  }

  /**
   * 获取 MinIO 客户端实例（用于高级操作）
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * 计算文件大小总和
   */
  async getTotalSize(prefix: string = ''): Promise<number> {
    try {
      const objects = await this.listFiles(prefix, true);
      return objects.reduce((total, obj) => total + (obj.size || 0), 0);
    } catch (error) {
      this.logger.error(`计算文件大小总和失败: prefix=${prefix}`, error);
      throw error;
    }
  }
}