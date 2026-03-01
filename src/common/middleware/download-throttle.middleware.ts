import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * 下载速率限制接口
 */
interface RateLimitInfo {
  count: number;
  resetTime: number;
}

/**
 * 下载速率限制中间件
 * 专门用于静态文件下载的速率限制
 */
@Injectable()
export class DownloadThrottleMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DownloadThrottleMiddleware.name);

  // 存储每个 IP 的下载记录
  private readonly rateLimitMap = new Map<string, RateLimitInfo>();

  // 速率限制配置
  private readonly maxDownloads: number;
  private readonly windowMs: number;

  constructor() {
    this.maxDownloads = parseInt(process.env.DOWNLOAD_MAX_REQUESTS || '5', 10); // 默认 5 次
    this.windowMs = parseInt(process.env.DOWNLOAD_WINDOW_MS || '60000', 10); // 默认 60 秒

    this.logger.log(
      `下载速率限制中间件已启用: max=${this.maxDownloads} downloads / ${this.windowMs}ms`
    );

    // 定期清理过期的记录
    this.startCleanup();
  }

  /**
   * 中间件处理函数
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const clientIp = this.getClientIp(req);

    // 检查速率限制
    const rateLimitInfo = this.checkRateLimit(clientIp);

    if (!rateLimitInfo.allowed) {
      this.logger.warn(
        `下载速率限制触发: ip=${clientIp}, count=${rateLimitInfo.count}, max=${this.maxDownloads}`
      );

      res.setHeader('Retry-After', Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000));
      res.setHeader('Content-Type', 'application/json');

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many download requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // 设置速率限制响应头
    res.setHeader('X-Download-RateLimit-Limit', this.maxDownloads);
    res.setHeader('X-Download-RateLimit-Remaining', rateLimitInfo.remaining);
    res.setHeader('X-Download-RateLimit-Reset', new Date(rateLimitInfo.resetTime).toISOString());

    next();
  }

  /**
   * 检查速率限制
   *
   * @param clientIp 客户端 IP
   * @returns 速率限制信息
   */
  private checkRateLimit(clientIp: string): {
    allowed: boolean;
    count: number;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const info = this.rateLimitMap.get(clientIp);

    if (!info) {
      // 第一次请求
      const resetTime = now + this.windowMs;
      this.rateLimitMap.set(clientIp, { count: 1, resetTime });
      return {
        allowed: true,
        count: 1,
        remaining: this.maxDownloads - 1,
        resetTime,
      };
    }

    // 检查是否在时间窗口内
    if (now > info.resetTime) {
      // 时间窗口已过，重置计数
      const resetTime = now + this.windowMs;
      this.rateLimitMap.set(clientIp, { count: 1, resetTime });
      return {
        allowed: true,
        count: 1,
        remaining: this.maxDownloads - 1,
        resetTime,
      };
    }

    // 在时间窗口内，增加计数
    const newCount = info.count + 1;

    if (newCount > this.maxDownloads) {
      // 超过限制
      return {
        allowed: false,
        count: newCount,
        remaining: 0,
        resetTime: info.resetTime,
      };
    }

    // 更新计数
    this.rateLimitMap.set(clientIp, { count: newCount, resetTime: info.resetTime });

    return {
      allowed: true,
      count: newCount,
      remaining: this.maxDownloads - newCount,
      resetTime: info.resetTime,
    };
  }

  /**
   * 获取客户端 IP 地址
   *
   * @param request 请求对象
   * @returns 客户端 IP
   */
  private getClientIp(request: Request): string {
    // 检查代理头（如 Nginx、Cloudflare）
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      // X-Forwarded-For 可能包含多个 IP，取第一个
      return (forwarded as string).split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    // 降级到直接连接的 IP
    return request.socket.remoteAddress || 'unknown';
  }

  /**
   * 启动定期清理任务
   */
  private startCleanup(): void {
    // 每 5 分钟清理一次过期记录
    setInterval(() => {
      this.cleanupExpiredRecords();
    }, 5 * 60 * 1000);

    this.logger.log('下载速率限制记录清理任务已启动');
  }

  /**
   * 清理过期的记录
   */
  private cleanupExpiredRecords(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [ip, info] of this.rateLimitMap.entries()) {
      if (now > info.resetTime) {
        this.rateLimitMap.delete(ip);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`清理了 ${cleanedCount} 个过期的下载速率限制记录`);
    }
  }

  /**
   * 获取当前速率限制统计信息
   *
   * @returns 统计信息
   */
  getStats(): {
    totalIps: number;
    activeIps: number;
    maxDownloads: number;
    windowMs: number;
  } {
    const now = Date.now();
    let activeIps = 0;

    for (const info of this.rateLimitMap.values()) {
      if (now <= info.resetTime) {
        activeIps++;
      }
    }

    return {
      totalIps: this.rateLimitMap.size,
      activeIps,
      maxDownloads: this.maxDownloads,
      windowMs: this.windowMs,
    };
  }

  /**
   * 清除指定 IP 的速率限制记录
   *
   * @param ip IP 地址
   */
  clearIp(ip: string): void {
    this.rateLimitMap.delete(ip);
    this.logger.log(`已清除 IP 的下载速率限制记录: ${ip}`);
  }

  /**
   * 清除所有速率限制记录
   */
  clearAll(): void {
    const count = this.rateLimitMap.size;
    this.rateLimitMap.clear();
    this.logger.log(`已清除所有下载速率限制记录: ${count} 个`);
  }
}
