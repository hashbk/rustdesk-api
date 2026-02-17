import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { Peer } from './entities/peer.entity';

@Injectable()
export class HeartbeatService {
  constructor(
    @InjectRepository(Peer)
    private peerRepository: Repository<Peer>,
  ) {}

  async handleHeartbeat(data: HeartbeatDto) {
    console.log('收到心跳数据：', data);

    const existingPeer = await this.peerRepository.findOne({
      where: { id: data.id, uuid: data.uuid }
    });

    if (existingPeer) {
      await this.peerRepository.update(
        { id: data.id, uuid: data.uuid },
        {
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

    return {
      code: 200,
      message: '心跳接收成功',
      data: {
        timestamp: Date.now(),
        device_id: data.id,
      },
    };
  }
}
