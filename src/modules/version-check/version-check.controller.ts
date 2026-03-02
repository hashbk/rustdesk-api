import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FilesInterceptor } from '@nestjs/platform-express';
import { VersionCheckService } from './version-check.service';
import { VersionCheckRequestDto, VersionCheckResponseDto, ReleaseSyncResponseDto } from './dto';
import { Public } from '../auth/decorators/public.decorator';
import { ReleaseSyncAuthGuard } from './guards';

/**
 * 版本检查控制器
 * 提供客户端版本更新检查API接口
 *
 * 接口路径:
 * - /api/version/check (版本检查，公开访问)
 * - /api/version/upload (Release上传，需要Bearer Token认证)
 * 请求方法: POST
 * 访问权限:
 * - /check: 公开访问（无需认证），速率限制：每分钟 10 次
 * - /upload: 需要Bearer Token认证
 */
@Controller('version')
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
   * 上传 Release (FormData 模式)
   *
   * 接收 multipart/form-data 格式的 Release 上传请求
   * 符合标准 HTTP API 接口规范：POST /api/version/upload
   *
   * 认证方式: Bearer Token
   * 请求头: Authorization: Bearer <token>
   *
   * FormData 字段:
   * - tag: 标签名
   * - name: Release 名称
   * - body: Release 描述
   * - draft: 是否为草稿
   * - prerelease: 是否为预发布
   * - metadata: JSON 字符串格式的元数据
   * - files: 文件字段（可多个）
   *
   * @param tag 标签名
   * @param name Release 名称
   * @param body Release 描述
   * @param draft 是否为草稿
   * @param prerelease 是否为预发布
   * @param metadata 元数据
   * @param files 上传的文件列表
   * @returns Release 上传响应
   */
  @Public()
  @UseGuards(ReleaseSyncAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  async uploadRelease(
    @Body('tag') tag: string,
    @Body('name') name: string,
    @Body('body') body: string,
    @Body('draft') draft: string,
    @Body('prerelease') prerelease: string,
    @Body('metadata') metadata: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ReleaseSyncResponseDto> {
    return this.versionCheckService.uploadRelease({
      tag,
      name,
      body,
      draft: draft === 'true',
      prerelease: prerelease === 'true',
      metadata: metadata ? JSON.parse(metadata) : null,
      files,
    });
  }
}
