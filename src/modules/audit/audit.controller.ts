import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuditService } from './audit.service';
import { ConnectionAuditDto } from './dto/connection-audit.dto';
import { FileAuditDto } from './dto/file-audit.dto';
import { AlarmAuditDto } from './dto/alarm-audit.dto';
import { Public } from '../auth/decorators/public.decorator';

/**
 * 审计控制器
 * 负责处理审计相关的HTTP请求，记录连接、文件传输和告警事件
 *
 * 端点数量：3个
 * - POST /api/audit/conn - 记录连接审计
 * - POST /api/audit/file - 记录文件审计
 * - POST /api/audit/alarm - 记录告警审计
 */
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ============ 审计记录接口（客户端调用，保持公开）============

  /**
   * 记录连接审计
   * 记录远程桌面连接事件，包括连接时间、连接双方、连接时长等信息
   *
   * 功能说明：
   * - 记录连接发起方和接收方的设备信息
   * - 记录连接开始和结束时间
   * - 记录连接类型和状态
   * - 支持高频率记录（限流：每分钟50次）
   *
   * 安全措施：
   * - 使用@Public装饰器，设备使用自己的令牌进行认证
   * - 启用限流保护：每分钟最多50次请求
   *
   * @param dto 连接审计数据传输对象
   * @returns 记录成功返回消息、状态和审计记录ID
   */
  @Public()
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @Post('conn')
  async auditConnection(@Body() dto: ConnectionAuditDto) {
    const result = await this.auditService.auditConnection(dto);
    return {
      message: '连接审计记录成功',
      status: 'success',
      data: result
    };
  }

  /**
   * 记录文件审计
   * 记录文件传输事件，包括文件名称、大小、传输方向、传输状态等信息
   *
   * 功能说明：
   * - 记录文件传输的发起方和接收方
   * - 记录文件的基本信息（名称、大小、类型）
   * - 记录传输方向（上传/下载）
   * - 记录传输状态和结果
   * - 支持高频率记录（限流：每分钟50次）
   *
   * 安全措施：
   * - 使用@Public装饰器，设备使用自己的令牌进行认证
   * - 启用限流保护：每分钟最多50次请求
   *
   * @param dto 文件审计数据传输对象
   * @returns 记录成功返回消息、状态和审计记录ID
   */
  @Public()
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @Post('file')
  async auditFile(@Body() dto: FileAuditDto) {
    const result = await this.auditService.auditFile(dto);
    return {
      message: '文件审计记录成功',
      status: 'success',
      data: result
    };
  }

  /**
   * 记录告警审计
   * 记录安全告警事件，包括告警类型、告警级别、告警内容等信息
   *
   * 功能说明：
   * - 记录告警的类型（如异常登录、未授权访问等）
   * - 记录告警的级别（低/中/高/严重）
   * - 记录告警的详细内容
   * - 记录告警的时间和来源设备
   * - 支持高频率记录（限流：每分钟50次）
   *
   * 安全措施：
   * - 使用@Public装饰器，设备使用自己的令牌进行认证
   * - 启用限流保护：每分钟最多50次请求
   *
   * @param dto 告警审计数据传输对象
   * @returns 记录成功返回消息、状态和审计记录ID
   */
  @Public()
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @Post('alarm')
  async auditAlarm(@Body() dto: AlarmAuditDto) {
    const result = await this.auditService.auditAlarm(dto);
    return {
      message: '告警审计记录成功',
      status: 'success',
      data: result
    };
  }
}
