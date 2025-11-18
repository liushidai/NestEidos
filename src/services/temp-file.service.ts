import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * 临时文件服务
 * 负责处理上传文件的临时存储和清理
 */
@Injectable()
export class TempFileService {
  private readonly logger = new Logger(TempFileService.name);
  private readonly tempDir: string;

  constructor() {
    // 创建专用的临时目录
    this.tempDir = join(tmpdir(), 'nestjs-image-upload');
    this.ensureTempDir();
  }

  /**
   * 确保临时目录存在
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      this.logger.log(`临时目录已创建: ${this.tempDir}`);
    } catch (error) {
      this.logger.error('创建临时目录失败', error);
      throw error;
    }
  }

  /**
   * 生成临时文件路径
   */
  generateTempPath(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = originalName.split('.').pop() || 'tmp';
    const filename = `${timestamp}_${random}.${extension}`;
    return join(this.tempDir, filename);
  }

  /**
   * 将上传文件保存到临时位置
   */
  async saveTempFile(file: Express.Multer.File): Promise<string> {
    const tempPath = this.generateTempPath(file.originalname);

    try {
      // 如果文件已经在磁盘上（Multer保存的），直接移动
      if (file.path) {
        await fs.rename(file.path, tempPath);
        this.logger.debug(`文件已移动到临时位置: ${tempPath}`);
      } else if (file.buffer) {
        // 如果文件在内存中，写入磁盘
        await fs.writeFile(tempPath, file.buffer);
        this.logger.debug(`文件已写入临时位置: ${tempPath}`);
      } else {
        throw new Error('文件数据不可用');
      }

      return tempPath;
    } catch (error) {
      this.logger.error(`保存临时文件失败: ${file.originalname}`, error);
      throw error;
    }
  }

  /**
   * 创建新的临时文件并写入内容
   */
  async createTempFile(
    content: Buffer | string,
    extension: string = 'tmp',
  ): Promise<string> {
    const tempPath = this.generateTempPath(`temp.${extension}`);

    try {
      await fs.writeFile(tempPath, content);
      this.logger.debug(`临时文件已创建: ${tempPath}`);
      return tempPath;
    } catch (error) {
      this.logger.error(`创建临时文件失败`, error);
      throw error;
    }
  }

  /**
   * 读取临时文件内容
   */
  async readTempFile(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error(`读取临时文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 删除单个临时文件
   */
  async deleteTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.debug(`临时文件已删除: ${filePath}`);
    } catch (error) {
      // 如果文件不存在，不报错
      if (error.code !== 'ENOENT') {
        this.logger.error(`删除临时文件失败: ${filePath}`, error);
        throw error;
      }
    }
  }

  /**
   * 批量删除临时文件
   */
  async deleteTempFiles(filePaths: string[]): Promise<void> {
    const deletePromises = filePaths.map((path) =>
      this.deleteTempFile(path).catch((error) => {
        this.logger.error(`删除临时文件失败: ${path}`, error);
      }),
    );

    await Promise.all(deletePromises);
  }

  /**
   * 清理所有临时文件（谨慎使用）
   */
  async cleanupAllTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const deletePromises = files.map((file) =>
        fs.unlink(join(this.tempDir, file)),
      );

      await Promise.all(deletePromises);
      this.logger.log(`已清理 ${files.length} 个临时文件`);
    } catch (error) {
      this.logger.error('清理临时文件失败', error);
      throw error;
    }
  }

  /**
   * 清理过期的临时文件（超过指定时间未修改的文件）
   */
  async cleanupExpiredFiles(
    maxAge: number = 24 * 60 * 60 * 1000,
  ): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = join(this.tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          const fileAge = now - stats.mtime.getTime();

          if (fileAge > maxAge) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          // 忽略单个文件的错误，继续处理其他文件
          this.logger.warn(`处理文件失败: ${filePath}`, error);
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`已清理 ${cleanedCount} 个过期临时文件`);
      }
    } catch (error) {
      this.logger.error('清理过期临时文件失败', error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件大小
   */
  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      this.logger.error(`获取文件大小失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 获取临时目录路径
   */
  getTempDirectory(): string {
    return this.tempDir;
  }
}
