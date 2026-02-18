import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConnectionAudit } from './entities/connection-audit.entity';
import { FileAudit } from './entities/file-audit.entity';
import { AlarmAudit } from './entities/alarm-audit.entity';
import { ConnectionAuditDto } from './dto/connection-audit.dto';
import { FileAuditDto } from './dto/file-audit.dto';
import { AlarmAuditDto } from './dto/alarm-audit.dto';

export interface AuditQueryDto {
  page?: number;
  limit?: number;
  deviceId?: string;
  startDate?: Date;
  endDate?: Date;
  action?: string;
  type?: number;
}

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

  // ============ 查询接口 ============

  /**
   * 查询连接审计记录
   */
  async queryConnectionAudits(query: AuditQueryDto) {
    const { page = 1, limit = 20, deviceId, startDate, endDate, action, type } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.connectionAuditRepository.createQueryBuilder('audit');

    if (deviceId) {
      queryBuilder.andWhere('audit.deviceId = :deviceId', { deviceId });
    }

    if (startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate });
    }

    if (action) {
      queryBuilder.andWhere('audit.action = :action', { action });
    }

    if (type !== undefined) {
      queryBuilder.andWhere('audit.type = :type', { type });
    }

    queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(audit => ({
        id: audit.id,
        device_id: audit.deviceId,
        device_uuid: audit.deviceUuid,
        conn_id: audit.connId,
        session_id: audit.sessionId,
        ip: audit.ip,
        action: audit.action,
        peer_id: audit.peerId,
        peer_name: audit.peerName,
        type: audit.type,
        created_at: audit.createdAt,
        requested_at: audit.requestedAt,
        established_at: audit.establishedAt,
        closed_at: audit.closedAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * 查询文件审计记录
   */
  async queryFileAudits(query: AuditQueryDto) {
    const { page = 1, limit = 20, deviceId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.fileAuditRepository.createQueryBuilder('audit');

    if (deviceId) {
      queryBuilder.andWhere('audit.deviceId = :deviceId', { deviceId });
    }

    if (startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate });
    }

    queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(audit => ({
        id: audit.id,
        device_id: audit.deviceId,
        device_uuid: audit.deviceUuid,
        peer_id: audit.peerId,
        type: audit.type,
        path: audit.path,
        is_file: audit.isFile,
        client_ip: audit.clientIp,
        client_name: audit.clientName,
        file_count: audit.fileCount,
        files: audit.files,
        created_at: audit.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * 查询告警审计记录
   */
  async queryAlarmAudits(query: AuditQueryDto) {
    const { page = 1, limit = 20, deviceId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.alarmAuditRepository.createQueryBuilder('audit');

    if (deviceId) {
      queryBuilder.andWhere('audit.deviceId = :deviceId', { deviceId });
    }

    if (startDate) {
      queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate });
    }

    queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(audit => ({
        id: audit.id,
        device_id: audit.deviceId,
        device_uuid: audit.deviceUuid,
        type: audit.typ,
        info: {
          id: audit.infoId,
          ip: audit.infoIp,
          name: audit.infoName,
        },
        created_at: audit.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * 获取审计统计信息
   */
  async getAuditStats(deviceId?: string) {
    const connectionQuery = this.connectionAuditRepository.createQueryBuilder('audit');
    const fileQuery = this.fileAuditRepository.createQueryBuilder('audit');
    const alarmQuery = this.alarmAuditRepository.createQueryBuilder('audit');

    if (deviceId) {
      connectionQuery.andWhere('audit.deviceId = :deviceId', { deviceId });
      fileQuery.andWhere('audit.deviceId = :deviceId', { deviceId });
      alarmQuery.andWhere('audit.deviceId = :deviceId', { deviceId });
    }

    const [totalConnections, totalFiles, totalAlarms] = await Promise.all([
      connectionQuery.getCount(),
      fileQuery.getCount(),
      alarmQuery.getCount(),
    ]);

    // 获取今日统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayConnectionQuery = this.connectionAuditRepository.createQueryBuilder('audit')
      .where('audit.createdAt >= :today', { today });
    const todayFileQuery = this.fileAuditRepository.createQueryBuilder('audit')
      .where('audit.createdAt >= :today', { today });
    const todayAlarmQuery = this.alarmAuditRepository.createQueryBuilder('audit')
      .where('audit.createdAt >= :today', { today });

    if (deviceId) {
      todayConnectionQuery.andWhere('audit.deviceId = :deviceId', { deviceId });
      todayFileQuery.andWhere('audit.deviceId = :deviceId', { deviceId });
      todayAlarmQuery.andWhere('audit.deviceId = :deviceId', { deviceId });
    }

    const [todayConnections, todayFiles, todayAlarms] = await Promise.all([
      todayConnectionQuery.getCount(),
      todayFileQuery.getCount(),
      todayAlarmQuery.getCount(),
    ]);

    return {
      total: {
        connections: totalConnections,
        files: totalFiles,
        alarms: totalAlarms,
      },
      today: {
        connections: todayConnections,
        files: todayFiles,
        alarms: todayAlarms,
      },
    };
  }
}
