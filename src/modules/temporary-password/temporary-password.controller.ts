import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TemporaryPasswordService } from './temporary-password.service';
import { TemporaryPasswordDto } from './dto';
import { Public } from '../auth/decorators/public.decorator';

/**
 * 临时密码控制器
 * 提供客户端临时密码上传API接口
 *
 * 接口路径: /api/temporary-password
 * 请求方法: POST
 * 访问权限: 公开访问（无需认证）
 */
@Controller('temporary-password')
export class TemporaryPasswordController {
  constructor(private readonly temporaryPasswordService: TemporaryPasswordService) {}

  /**
   * 上传临时密码
   *
   * 接收客户端上传的临时密码，创建或更新记录
   *
   * @param dto 临时密码数据
   * @returns "OK" 字符串
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async uploadTemporaryPassword(
    @Body() dto: TemporaryPasswordDto,
  ): Promise<string> {
    return this.temporaryPasswordService.uploadTemporaryPassword(dto);
  }
}
