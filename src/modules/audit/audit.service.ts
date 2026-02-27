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
    // 支持前端发送的下划线格式字段
    const connId = dto.conn_id !== undefined ? String(dto.conn_id) : null;
    const sessionId = dto.session_id !== undefined ? String(dto.session_id) : null;

    // 转换 action 状态
    let action: string;
    if (dto.action === 'new') {
      action = 'open';
    } else if (dto.action === '' || !dto.action) {
      action = 'established';
    } else {
      action = dto.action;
    }

    // 尝试查找现有连接（deviceId、deviceUuid、connId 均相同视为同一连接）
    const whereCondition: any = {
      deviceId: dto.id,
      deviceUuid: dto.uuid,
    };
    if (connId !== null) {
      whereCondition.connId = connId;
    }

    const existingConnection = await this.connectionAuditRepository.findOne({
      where: whereCondition,
    });

    if (existingConnection) {
      // 只更新非空且与数据库中储存的值不同的字段
      if (sessionId !== null && sessionId !== existingConnection.sessionId) {
        existingConnection.sessionId = sessionId;
      }
      if (dto.ip && dto.ip !== existingConnection.ip) {
        existingConnection.ip = dto.ip;
      }
      // 根据不同的 action 更新对应的时间字段
      if (action === 'open' && !existingConnection.requestedAt) {
        existingConnection.requestedAt = new Date();
      }
      if (action === 'established' && !existingConnection.establishedAt) {
        existingConnection.establishedAt = new Date();
      }
      if (action === 'close' && !existingConnection.closedAt) {
        existingConnection.closedAt = new Date();
      }
      existingConnection.action = action; // action 总是更新
      if (dto.peer && dto.peer[0] !== existingConnection.peerId) {
        existingConnection.peerId = dto.peer[0];
      }
      if (dto.peer && dto.peer[1] !== existingConnection.peerName) {
        existingConnection.peerName = dto.peer[1];
      }
      if (dto.type !== undefined && dto.type !== existingConnection.type) {
        existingConnection.type = dto.type;
      }
      return await this.connectionAuditRepository.save(existingConnection);
    }

    // 创建新连接
    const connectionAudit = this.connectionAuditRepository.create({
      deviceId: dto.id,
      deviceUuid: dto.uuid,
      connId,
      sessionId,
      ip: dto.ip || '',
      action,
      peerId: dto.peer ? dto.peer[0] : null,
      peerName: dto.peer ? dto.peer[1] : null,
      type: dto.type !== undefined ? dto.type : null,
      requestedAt: action === 'open' ? new Date() : null,
      establishedAt: action === 'established' ? new Date() : null,
      closedAt: action === 'close' ? new Date() : null,
    });

    return await this.connectionAuditRepository.save(connectionAudit);
  }

  async auditFile(dto: FileAuditDto): Promise<FileAudit> {
    // 解析 info JSON 字符串
    let info: { ip: string; name: string; num: number; files: Array<[string, number]> };
    try {
      info = JSON.parse(dto.info);
    } catch (e) {
      info = { ip: '', name: '', num: 0, files: [] };
    }

    const fileAudit = this.fileAuditRepository.create({
      deviceId: dto.id,
      deviceUuid: dto.uuid,
      peerId: dto.peer_id || '',
      type: dto.type !== undefined ? dto.type : 0,
      path: dto.path || null,
      isFile: dto.is_file || false,
      clientIp: info.ip || '',
      clientName: info.name || '',
      fileCount: info.num || 0,
      files: info.files?.slice(0, 10) || [],
    });

    return await this.fileAuditRepository.save(fileAudit);
  }

  async auditAlarm(dto: AlarmAuditDto): Promise<AlarmAudit> {
    // 解析 info JSON 字符串
    let info: { id?: string; ip: string; name?: string };
    try {
      info = JSON.parse(dto.info);
    } catch (e) {
      info = { ip: '' };
    }

    const alarmAudit = this.alarmAuditRepository.create({
      deviceId: dto.id,
      deviceUuid: dto.uuid,
      typ: dto.typ,
      infoId: info.id || null,
      infoIp: info.ip || '',
      infoName: info.name || null,
    });

    return await this.alarmAuditRepository.save(alarmAudit);
  }
}
