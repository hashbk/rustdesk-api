import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { Peer } from '../../common/entities';

@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name);

  constructor(
    @InjectRepository(Peer)
    private peerRepository: Repository<Peer>,
  ) {}

  async handleHeartbeat(data: HeartbeatDto) {
    this.logger.debug(`收到心跳数据: id=${data.id}, uuid=${data.uuid}`);

    const existingPeer = await this.peerRepository.findOne({
      where: { uuid: data.uuid }
    });

    if (existingPeer) {
      await this.peerRepository.update(
        { uuid: data.uuid },
        {
          id: data.id,
          ver: data.ver,
          modifiedAt: data.modified_at,
        }
      );
    } else {
      const peer = this.peerRepository.create({
        id: data.id,
        uuid: data.uuid,
        ver: data.ver,
        modifiedAt: data.modified_at,
      });
      await this.peerRepository.save(peer);
    }

    return {
      code: 200,
      message: '心跳接收成功',
      data: {
        timestamp: Date.now(),
        device_id: data.id,
      },
    };
  }

  /**
   * 获取设备信息
   */
  async getPeerStatus(peerId: string): Promise<{ online: boolean }> {
    const peer = await this.peerRepository.findOne({
      where: { id: peerId },
    });

    if (!peer) {
      return { online: false };
    }

    return { online: true };
  }

  /**
   * 获取所有设备ID列表
   */
  async getAllPeers(): Promise<string[]> {
    const peers = await this.peerRepository.find();
    return peers.map(peer => peer.id);
  }
}
