import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessiblePeer, PeerInfo } from './entities/accessible-peer.entity';
import { Peer } from '../heartbeat/entities/peer.entity';
import { Sysinfo } from '../system/entities/sysinfo.entity';
import { PeerQueryDto, CreatePeerDto, UpdatePeerDto } from './dto/peer.dto';

@Injectable()
export class PeerService {
  constructor(
    @InjectRepository(AccessiblePeer)
    private accessiblePeerRepository: Repository<AccessiblePeer>,
    @InjectRepository(Peer)
    private peerRepository: Repository<Peer>,
    @InjectRepository(Sysinfo)
    private sysinfoRepository: Repository<Sysinfo>,
  ) {}

  /**
   * 获取用户可访问的设备列表（分页）
   * 从 peers 表查询用户设备，根据 updatedAt 判断在线状态
   */
  async getAccessiblePeers(
    userId: number,
    query: PeerQueryDto,
  ): Promise<{ data: any[]; total: number }> {
    const { current, pageSize, status } = query;
    const skip = (current - 1) * pageSize;

    // 计算一分钟前的时间
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    // 构建查询条件 - 从 peers 表查询
    const queryBuilder = this.peerRepository
      .createQueryBuilder('peer')
      .where('peer.userId = :userId', { userId });

    // 状态过滤：status='1' 表示只获取在线设备
    if (status === '1') {
      queryBuilder.andWhere('peer.updatedAt > :oneMinuteAgo', { oneMinuteAgo });
    }

    // 分页查询
    queryBuilder
      .orderBy('peer.id', 'ASC')
      .skip(skip)
      .take(pageSize);

    const [peers, total] = await queryBuilder.getManyAndCount();

    // 获取所有设备的 uuid 列表
    const uuids = peers.map(p => p.uuid);

    // 批量查询系统信息
    const sysinfos = uuids.length > 0
      ? await this.sysinfoRepository.findByIds(uuids)
      : [];

    const sysinfoMap = new Map(sysinfos.map(s => [s.uuid, s]));

    // 转换响应格式
    const data = peers.map(peer => {
      const sysinfo = sysinfoMap.get(peer.uuid);
      const isOnline = peer.updatedAt > oneMinuteAgo;

      return {
        id: peer.id,
        uuid: peer.uuid,
        info: {
          username: sysinfo?.username || '',
          hostname: sysinfo?.hostname || '',
          device_name: sysinfo?.hostname || '',
          os: sysinfo?.os || '',
        },
        status: isOnline ? 1 : 0,
        device_group_name: '',
        note: '',
      };
    });

    return { data, total };
  }

  /**
   * 获取所有设备（管理员）
   */
  async findAll(page: number = 1, limit: number = 20): Promise<{ peers: Peer[]; total: number }> {
    const [peers, total] = await this.peerRepository.findAndCount({
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { peers, total };
  }

  /**
   * 根据设备ID和用户ID获取设备
   */
  async findById(peerId: string, userId: number): Promise<Peer | null> {
    return this.peerRepository.findOne({
      where: { id: peerId, userId },
    });
  }

  /**
   * 根据UUID获取设备
   */
  async findByUuid(uuid: string, userId: number): Promise<Peer | null> {
    return this.peerRepository.findOne({
      where: { uuid, userId },
    });
  }

  /**
   * 更新设备信息（通过 sysinfo）
   */
  async updatePeerInfo(uuid: string, updateDto: UpdatePeerDto): Promise<void> {
    // 更新 sysinfo 表
    const sysinfo = await this.sysinfoRepository.findOne({ where: { uuid } });
    if (sysinfo) {
      if (updateDto.hostname !== undefined) sysinfo.hostname = updateDto.hostname;
      if (updateDto.username !== undefined) sysinfo.username = updateDto.username;
      if (updateDto.os !== undefined) sysinfo.os = updateDto.os;
      await this.sysinfoRepository.save(sysinfo);
    }
  }

  /**
   * 删除设备（解除用户绑定）
   */
  async deletePeer(uuid: string, userId: number): Promise<void> {
    const peer = await this.findByUuid(uuid, userId);
    if (peer) {
      // 将设备的 userId 设为 null，表示解除绑定
      peer.userId = null as any;
      await this.peerRepository.save(peer);
    }
  }
}
