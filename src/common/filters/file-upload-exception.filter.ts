import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  FileUploadError,
  FILE_UPLOAD_ERROR_CODES,
  FileUploadErrorCode,
} from '../errors/file-upload.errors';

/**
 * 文件上传异常过滤器
 * 统一处理文件上传相关错误，确保API响应格式一致
 *
 * 🎯 功能：
 * 1. 捕获文件上传相关异常
 * 2. 转换为标准HTTP异常响应
 * 3. 记录错误日志
 * 4. 提供统一的错误码和消息格式
 *
 * 📝 支持的错误类型：
 * - FileValidationError 及其子类
 * - 其他意外异常
 */
@Catch()
export class FileUploadExceptionFilter implements ExceptionFilter<FileUploadError> {
  private readonly logger = new Logger(FileUploadExceptionFilter.name);

  catch(exception: FileUploadError | Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // 如果不是我们的自定义错误，使用通用处理
    if (!(exception instanceof FileUploadError)) {
      this.logger.error('文件上传过程中发生未预期错误:', exception);
      return this.sendErrorResponse(
        response,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'INTERNAL_SERVER_ERROR',
        '文件上传过程中发生未知错误，请重试',
        exception.message,
      );
    }

    // 处理我们自定义的文件上传错误
    this.logger.warn(`文件上传验证失败: ${exception.message}`, {
      error: exception.constructor.name,
      code: exception.code,
    });

    const { httpStatus, errorCode, message } = this.getErrorMapping(exception);

    this.sendErrorResponse(
      response,
      httpStatus,
      errorCode,
      exception.constructor.name,
      message,
      exception.message,
    );
  }

  /**
   * 错误映射：将自定义错误映射到HTTP状态码和错误码
   */
  private getErrorMapping(exception: FileUploadError): {
    httpStatus: HttpStatus;
    errorCode: string;
    message: string;
  } {
    const errorCode = exception.code as FileUploadErrorCode;

    switch (errorCode) {
      case FILE_UPLOAD_ERROR_CODES.UNSUPPORTED_FILE_TYPE:
        return {
          httpStatus: HttpStatus.BAD_REQUEST,
          errorCode,
          message: '不支持的文件类型',
        };

      case FILE_UPLOAD_ERROR_CODES.FILE_SIZE_EXCEEDED:
        return {
          httpStatus: HttpStatus.PAYLOAD_TOO_LARGE,
          errorCode,
          message: '文件大小超过限制',
        };

      case FILE_UPLOAD_ERROR_CODES.FILE_CONTENT_MISMATCH:
        return {
          httpStatus: HttpStatus.BAD_REQUEST,
          errorCode,
          message: '文件扩展名与内容不匹配',
        };

      case FILE_UPLOAD_ERROR_CODES.EMPTY_FILENAME:
      case FILE_UPLOAD_ERROR_CODES.MISSING_EXTENSION:
        return {
          httpStatus: HttpStatus.BAD_REQUEST,
          errorCode,
          message: '文件信息不完整',
        };

      case FILE_UPLOAD_ERROR_CODES.EMPTY_FILE_CONTENT:
      case FILE_UPLOAD_ERROR_CODES.FILE_TYPE_RECOGNITION_FAILED:
        return {
          httpStatus: HttpStatus.BAD_REQUEST,
          errorCode,
          message: '文件内容无效或损坏',
        };

      case FILE_UPLOAD_ERROR_CODES.FILE_VALIDATION_SYSTEM_ERROR:
        return {
          httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
          errorCode,
          message: '文件验证系统错误',
        };

      default:
        return {
          httpStatus: HttpStatus.BAD_REQUEST,
          errorCode: FILE_UPLOAD_ERROR_CODES.FILE_VALIDATION_ERROR,
          message: '文件验证失败',
        };
    }
  }

  /**
   * 发送统一格式的错误响应
   */
  private sendErrorResponse(
    response: Response,
    httpStatus: HttpStatus,
    errorCode: string,
    errorType: string,
    message: string,
    originalMessage?: string,
  ): void {
    response.status(httpStatus).json({
      success: false,
      error: {
        code: errorCode,
        type: errorType,
        message,
        details: originalMessage && originalMessage !== message ? originalMessage : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  }
}