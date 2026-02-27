import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ConnectionAuditDto } from './dto/connection-audit.dto';
import { FileAuditDto } from './dto/file-audit.dto';
import { AlarmAuditDto } from './dto/alarm-audit.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ============ 审计记录接口（客户端调用，保持公开）============

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
}
