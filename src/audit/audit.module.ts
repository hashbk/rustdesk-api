import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { ConnectionAudit } from './entities/connection-audit.entity';
import { FileAudit } from './entities/file-audit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConnectionAudit, FileAudit])],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
