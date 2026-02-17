import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectionAudit } from './entities/connection-audit.entity';
import { FileAudit } from './entities/file-audit.entity';
import { AlarmAudit } from './entities/alarm-audit.entity';
import { ConnectionAuditDto } from './dto/connection-audit.dto';
import { FileAuditDto } from './dto/file-audit.dto';
import { AlarmAuditDto } from './dto/alarm-audit.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(ConnectionAudit)
    private readonly connectionAuditRepository: Repository<ConnectionAudit>,
    @InjectRepository(FileAudit)
    private readonly fileAuditRepository: Repository<FileAudit>,
    @InjectRepository(AlarmAudit)
    private readonly alarmAuditRepository: Repository<AlarmAudit>,
  ) {}

  async auditConnection(dto: ConnectionAuditDto): Promise<ConnectionAudit> {
    const connectionAudit = this.connectionAuditRepository.create({
      deviceId: dto.id,
      deviceUuid: dto.uuid,
      connId: dto.connId || null,
      sessionId: dto.sessionId || null,
      ip: dto.ip,
      action: dto.action,
      peerId: dto.peer ? dto.peer[0] : null,
      peerName: dto.peer ? dto.peer[1] : null,
      type: dto.type !== undefined ? dto.type : null,
    });

    return await this.connectionAuditRepository.save(connectionAudit);
  }

  async auditFile(dto: FileAuditDto): Promise<FileAudit> {
    const fileAudit = this.fileAuditRepository.create({
      deviceId: dto.id,
      deviceUuid: dto.uuid,
      peerId: dto.peer_id,
      type: dto.type,
      path: dto.path || null,
      isFile: dto.is_file,
      clientIp: dto.info.ip,
      clientName: dto.info.name,
      fileCount: dto.info.num,
      files: dto.info.files.slice(0, 10),
    });

    return await this.fileAuditRepository.save(fileAudit);
  }

  async auditAlarm(dto: AlarmAuditDto): Promise<AlarmAudit> {
    const alarmAudit = this.alarmAuditRepository.create({
      deviceId: dto.id,
      deviceUuid: dto.uuid,
      typ: dto.typ,
      info: dto.info,
    });

    return await this.alarmAuditRepository.save(alarmAudit);
  }
}
