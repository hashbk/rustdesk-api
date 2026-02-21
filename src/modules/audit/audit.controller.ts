import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { AuditService, AuditQueryDto } from './audit.service';
import { ConnectionAuditDto } from './dto/connection-audit.dto';
import { FileAuditDto } from './dto/file-audit.dto';
import { AlarmAuditDto } from './dto/alarm-audit.dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ============ 审计记录接口 ============

  @Public()
  @Post('conn')
  async auditConnection(@Body() dto: ConnectionAuditDto) {
    const result = await this.auditService.auditConnection(dto);
    return { 
      message: '连接审计记录成功', 
      status: 'success',
      data: result
    };
  }

  @Public()
  @Post('file')
  async auditFile(@Body() dto: FileAuditDto) {
    const result = await this.auditService.auditFile(dto);
    return { 
      message: '文件审计记录成功', 
      status: 'success',
      data: result
    };
  }

  @Public()
  @Post('alarm')
  async auditAlarm(@Body() dto: AlarmAuditDto) {
    const result = await this.auditService.auditAlarm(dto);
    return { 
      message: '告警审计记录成功', 
      status: 'success',
      data: result
    };
  }

  // ============ 审计查询接口（管理员） ============

  /**
   * 查询连接审计记录
   * GET /api/audit/connections?page=1&limit=20&deviceId=xxx&startDate=xxx&endDate=xxx&action=xxx&type=0
   */
  @Get('connections')
  async queryConnectionAudits(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('deviceId') deviceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('action') action?: string,
    @Query('type') type?: string,
    @CurrentUser('isAdmin') isAdmin?: boolean,
  ) {
    const query: AuditQueryDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      deviceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      action,
      type: type ? parseInt(type, 10) : undefined,
    };

    return this.auditService.queryConnectionAudits(query);
  }

  /**
   * 查询文件审计记录
   * GET /api/audit/files?page=1&limit=20&deviceId=xxx&startDate=xxx&endDate=xxx
   */
  @Get('files')
  async queryFileAudits(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('deviceId') deviceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('isAdmin') isAdmin?: boolean,
  ) {
    const query: AuditQueryDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      deviceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.auditService.queryFileAudits(query);
  }

  /**
   * 查询告警审计记录
   * GET /api/audit/alarms?page=1&limit=20&deviceId=xxx&startDate=xxx&endDate=xxx
   */
  @Get('alarms')
  async queryAlarmAudits(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('deviceId') deviceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('isAdmin') isAdmin?: boolean,
  ) {
    const query: AuditQueryDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      deviceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.auditService.queryAlarmAudits(query);
  }

  /**
   * 获取审计统计信息
   * GET /api/audit/stats?deviceId=xxx
   */
  @Get('stats')
  async getAuditStats(
    @Query('deviceId') deviceId?: string,
    @CurrentUser('isAdmin') isAdmin?: boolean,
  ) {
    return this.auditService.getAuditStats(deviceId);
  }
}
