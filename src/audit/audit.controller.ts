import { Controller, Post } from '@nestjs/common';

@Controller('audit')
export class AuditController {
  @Post('conn')
  auditConnection() {
    return { message: '审计连接接口', status: 'success' };
  }

  @Post('file')
  auditFile() {
    return { message: '审计文件接口', status: 'success' };
  }
}
