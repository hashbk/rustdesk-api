import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectionAudit, ConnAction, ConnType } from './entities/connection-audit.entity';
import { FileAudit, FileAuditType } from './entities/file-audit.entity';
import { ConnectionAuditDto } from './dto/connection-audit.dto';
import { FileAuditDto } from './dto/file-audit.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(ConnectionAudit)
    private readonly connectionAuditRepository: Repository<ConnectionAudit>,
    @InjectRepository(FileAudit)
    private readonly fileAuditRepository: Repository<FileAudit>,
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
}
