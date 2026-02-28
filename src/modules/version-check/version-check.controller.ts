import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { VersionCheckService } from './version-check.service';
import { VersionCheckRequestDto, VersionCheckResponseDto } from './dto';
import { Public } from '../auth/decorators/public.decorator';

/**
 * 版本检查控制器
 * 提供客户端版本更新检查API接口
 *
 * 接口路径: /api/update/check
 * 请求方法: POST
 * 访问权限: 公开访问（无需认证）
 */
@Controller('api/update')
export class VersionCheckController {
  constructor(private readonly versionCheckService: VersionCheckService) {}

  /**
   * 检查最新版本
   *
   * 接收客户端上报的设备信息，返回对应平台的最新版本信息
   *
   * @param request 版本检查请求
   * @returns 版本检查响应
   */
  @Public()
  @Post('check')
  @HttpCode(HttpStatus.OK)
  async checkVersion(
    @Body() request: VersionCheckRequestDto,
  ): Promise<VersionCheckResponseDto> {
    return this.versionCheckService.checkLatestVersion(request);
  }
}
