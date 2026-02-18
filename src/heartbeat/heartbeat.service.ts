import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { Peer } from './entities/peer.entity';
import { AccessiblePeer } from '../device-group/entities/accessible-peer.entity';

@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name);

  constructor(
    @InjectRepository(Peer)
    private peerRepository: Repository<Peer>,
    @InjectRepository(AccessiblePeer)
    private accessiblePeerRepository: Repository<AccessiblePeer>,
  ) {}

  async handleHeartbeat(data: HeartbeatDto) {
    this.logger.debug(`收到心跳数据: id=${data.id}, uuid=${data.uuid}`);

    const existingPeer = await this.peerRepository.findOne({
      where: { uuid: data.uuid }
    });

    // 判断设备是否在线：有 conns 数据且数组不为空表示在线
    const isOnline = data.conns && data.conns.length > 0;
    const status = isOnline ? 1 : 0;

    if (existingPeer) {
      await this.peerRepository.update(
        { uuid: data.uuid },
        {
          id: data.id,
          ver: data.ver,
          modifiedAt: data.modified_at,
          conns: data.conns ? JSON.stringify(data.conns) : null,
        }
      );
    } else {
      const peer = this.peerRepository.create({
        id: data.id,
        uuid: data.uuid,
        ver: data.ver,
        modifiedAt: data.modified_at,
        conns: data.conns ? JSON.stringify(data.conns) : null,
      });
      await this.peerRepository.save(peer);
    }

    // 同步更新 AccessiblePeer 表中的设备状态
    await this.accessiblePeerRepository
      .createQueryBuilder()
      .update(AccessiblePeer)
      .set({ status, id: data.id })
      .where('uuid = :peerUuid', { peerUuid: data.uuid })
      .execute();

    return {
      code: 200,
      message: '心跳接收成功',
      data: {
        timestamp: Date.now(),
        device_id: data.id,
        online: isOnline,
      },
    };
  }

  /**
   * 获取设备在线状态
   */
  async getPeerStatus(peerId: string): Promise<{ online: boolean; conns?: number[] }> {
    const peer = await this.peerRepository.findOne({
      where: { id: peerId },
    });

    if (!peer) {
      return { online: false };
    }

    const conns = peer.conns ? JSON.parse(peer.conns) : [];
    return {
      online: conns.length > 0,
      conns,
    };
  }

  /**
   * 获取所有在线设备ID列表
   */
  async getOnlinePeers(): Promise<string[]> {
    const peers = await this.peerRepository
      .createQueryBuilder('peer')
      .where('peer.conns IS NOT NULL')
      .getMany();

    return peers
      .filter(peer => {
        const conns = peer.conns ? JSON.parse(peer.conns) : [];
        return conns.length > 0;
      })
      .map(peer => peer.id);
  }
}
