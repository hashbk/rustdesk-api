import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { VersionCheckService } from './version-check.service';
import { VersionCheckRequestDto, VersionCheckResponseDto, ReleaseSyncRequestDto, ReleaseSyncResponseDto } from './dto';
import { Public } from '../auth/decorators/public.decorator';
import { ReleaseSyncAuthGuard } from './guards';

/**
 * 版本检查控制器
 * 提供客户端版本更新检查API接口
 *
 * 接口路径:
 * - /api/version/check (版本检查，公开访问)
 * - /api/version/release/sync (Release同步，需要Bearer Token认证)
 * 请求方法: POST
 * 访问权限:
 * - /check: 公开访问（无需认证），速率限制：每分钟 10 次
 * - /release/sync: 需要Bearer Token认证
 */
@Controller('api/version')
export class VersionCheckController {
  constructor(private readonly versionCheckService: VersionCheckService) {}

  /**
   * 检查最新版本
   *
   * 接收客户端上报的设备信息，返回对应平台的最新版本信息
   *
   * 速率限制: 每分钟 10 次（防止滥用）
   *
   * @param request 版本检查请求
   * @returns 版本检查响应
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 每分钟 10 次
  @Post('check')
  @HttpCode(HttpStatus.OK)
  async checkVersion(
    @Body() request: VersionCheckRequestDto,
  ): Promise<VersionCheckResponseDto> {
    return this.versionCheckService.checkLatestVersion(request);
  }

  /**
   * 同步 Release
   *
   * 接收 GitHub Action Release Sync 工具推送的版本信息
   * 符合标准 HTTP API 接口规范：POST /api/version/release/sync
   *
   * 认证方式: Bearer Token
   * 请求头: Authorization: Bearer <token>
   *
   * @param request Release 同步请求
   * @returns Release 同步响应
   */
  @UseGuards(ReleaseSyncAuthGuard)
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  async syncRelease(
    @Body() request: ReleaseSyncRequestDto,
  ): Promise<ReleaseSyncResponseDto> {
    return this.versionCheckService.syncRelease(request);
  }
}
