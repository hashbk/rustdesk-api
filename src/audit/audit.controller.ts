import { Controller, Post, Body } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ConnectionAuditDto } from './dto/connection-audit.dto';
import { FileAuditDto } from './dto/file-audit.dto';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('conn')
  async auditConnection(@Body() dto: ConnectionAuditDto) {
    const result = await this.auditService.auditConnection(dto);
    return { 
      message: '连接审计记录成功', 
      status: 'success',
      data: result
    };
  }

  @Post('file')
  async auditFile(@Body() dto: FileAuditDto) {
    const result = await this.auditService.auditFile(dto);
    return { 
      message: '文件审计记录成功', 
      status: 'success',
      data: result
    };
  }
}
