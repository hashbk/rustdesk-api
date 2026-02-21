import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConnectionAudit } from './entities/connection-audit.entity';
import { FileAudit } from './entities/file-audit.entity';
import { AlarmAudit } from './entities/alarm-audit.entity';

describe('AuditController', () => {
  let controller: AuditController;
  let service: AuditService;

  const mockConnectionAudit = {
    id: 1,
    deviceId: 'device123',
    deviceUuid: 'uuid123',
    connId: 'conn123',
    sessionId: 'session123',
    ip: '192.168.1.1',
    action: 'new' as const,
    peerId: 'peer123',
    peerName: 'peerName',
    type: 0,
    createdAt: new Date(),
  };

  const mockFileAudit = {
    id: 1,
    deviceId: 'device123',
    deviceUuid: 'uuid123',
    peerId: 'peer123',
    type: 0,
    path: '/path/to/file',
    isFile: true,
    clientIp: '192.168.1.1',
    clientName: 'clientName',
    fileCount: 2,
    files: [['file1.txt', 1024], ['file2.txt', 2048]],
    createdAt: new Date(),
  };

  const mockAlarmAudit = {
    id: 1,
    deviceId: 'device123',
    deviceUuid: 'uuid123',
    typ: 0,
    info: { ip: '192.168.1.1', reason: 'IP whitelist violation' },
    createdAt: new Date(),
  };

  const mockAuditService = {
    auditConnection: jest.fn().mockResolvedValue(mockConnectionAudit),
    auditFile: jest.fn().mockResolvedValue(mockFileAudit),
    auditAlarm: jest.fn().mockResolvedValue(mockAlarmAudit),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(ConnectionAudit),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(FileAudit),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AlarmAudit),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('auditConnection', () => {
    it('should audit a connection successfully', async () => {
      const dto = {
        id: 'device123',
        uuid: 'uuid123',
        connId: 'conn123',
        sessionId: 'session123',
        ip: '192.168.1.1',
        action: 'new' as const,
        peer: ['peer123', 'peerName'],
        type: 0,
      };

      jest.spyOn(service, 'auditConnection').mockResolvedValue(mockConnectionAudit);

      const result = await controller.auditConnection(dto);

      expect(result).toEqual({
        message: '连接审计记录成功',
        status: 'success',
        data: mockConnectionAudit,
      });
      expect(service.auditConnection).toHaveBeenCalledWith(dto);
    });
  });

  describe('auditFile', () => {
    it('should audit a file transfer successfully', async () => {
      const dto = {
        id: 'device123',
        uuid: 'uuid123',
        peer_id: 'peer123',
        type: 0,
        path: '/path/to/file',
        is_file: true,
        info: {
          ip: '192.168.1.1',
          name: 'clientName',
          num: 2,
          files: [['file1.txt', 1024], ['file2.txt', 2048]],
        },
      };

      jest.spyOn(service, 'auditFile').mockResolvedValue(mockFileAudit);

      const result = await controller.auditFile(dto);

      expect(result).toEqual({
        message: '文件审计记录成功',
        status: 'success',
        data: mockFileAudit,
      });
      expect(service.auditFile).toHaveBeenCalledWith(dto);
    });
  });

  describe('auditAlarm', () => {
    it('should audit an alarm successfully', async () => {
      const dto = {
        id: 'device123',
        uuid: 'uuid123',
        typ: 0,
        info: { ip: '192.168.1.1', reason: 'IP whitelist violation' },
      };

      jest.spyOn(service, 'auditAlarm').mockResolvedValue(mockAlarmAudit);

      const result = await controller.auditAlarm(dto);

      expect(result).toEqual({
        message: '告警审计记录成功',
        status: 'success',
        data: mockAlarmAudit,
      });
      expect(service.auditAlarm).toHaveBeenCalledWith(dto);
    });
  });
});
