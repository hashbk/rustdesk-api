import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessiblePeer, PeerInfo } from './entities/accessible-peer.entity';
import { PeerQueryDto, CreatePeerDto, UpdatePeerDto } from './dto/peer.dto';

@Injectable()
export class PeerService {
  constructor(
    @InjectRepository(AccessiblePeer)
    private peerRepository: Repository<AccessiblePeer>,
  ) {}

  /**
   * 获取用户可访问的设备列表（分页）
   */
  async getAccessiblePeers(
    userId: number,
    query: PeerQueryDto,
  ): Promise<{ data: any[]; total: number }> {
    const { current, pageSize, status } = query;
    const skip = (current - 1) * pageSize;

    // 构建查询条件
    const queryBuilder = this.peerRepository
      .createQueryBuilder('peer')
      .where('peer.userId = :userId', { userId });

    // 状态过滤：status='1' 表示只获取在线设备
    if (status === '1') {
      queryBuilder.andWhere('peer.status = 1');
    }

    // 分页查询
    queryBuilder
      .orderBy('peer.id', 'ASC')
      .skip(skip)
      .take(pageSize);

    const [peers, total] = await queryBuilder.getManyAndCount();

    // 转换响应格式
    const data = peers.map(peer => {
      const info = peer.getInfo();
      return {
        id: peer.id,
        info: {
          username: info.username,
          hostname: info.hostname,
          device_name: info.device_name,
          os: info.os,
        },
        status: peer.status,
        user: peer.ownerUsername,
        user_name: peer.ownerName,
        device_group_name: peer.deviceGroupName,
        note: peer.note || '',
      };
    });

    return { data, total };
  }

  /**
   * 获取所有设备（管理员）
   */
  async findAll(page: number = 1, limit: number = 20): Promise<{ peers: AccessiblePeer[]; total: number }> {
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
  async findById(peerId: string, userId: number): Promise<AccessiblePeer | null> {
    return this.peerRepository.findOne({
      where: { id: peerId, userId },
    });
  }

  /**
   * 创建或更新设备
   */
  async upsertPeer(userId: number, createDto: CreatePeerDto): Promise<AccessiblePeer> {
    let peer = await this.findById(createDto.id, userId);

    const info: PeerInfo = {
      username: createDto.username || '',
      hostname: createDto.hostname || '',
      device_name: createDto.deviceName || '',
      os: createDto.os || '',
    };

    if (peer) {
      // 更新
      peer.setInfo(info);
      peer.ownerUsername = createDto.ownerUsername || peer.ownerUsername;
      peer.ownerName = createDto.ownerName || peer.ownerName;
      peer.deviceGroupName = createDto.deviceGroupName || peer.deviceGroupName;
      peer.note = createDto.note !== undefined ? createDto.note : peer.note;
    } else {
      // 创建
      peer = this.peerRepository.create({
        id: createDto.id,
        userId,
        ownerUsername: createDto.ownerUsername,
        ownerName: createDto.ownerName,
        deviceGroupName: createDto.deviceGroupName,
        note: createDto.note || '',
        status: 0, // 默认离线
      });
      peer.setInfo(info);
    }

    return this.peerRepository.save(peer);
  }

  /**
   * 更新设备
   */
  async updatePeer(peerId: string, userId: number, updateDto: UpdatePeerDto): Promise<AccessiblePeer> {
    const peer = await this.findById(peerId, userId);
    if (!peer) {
      throw new NotFoundException('设备不存在');
    }

    // 更新 info 字段
    const info = peer.getInfo();
    if (updateDto.username !== undefined) info.username = updateDto.username;
    if (updateDto.hostname !== undefined) info.hostname = updateDto.hostname;
    if (updateDto.deviceName !== undefined) info.device_name = updateDto.deviceName;
    if (updateDto.os !== undefined) info.os = updateDto.os;
    peer.setInfo(info);

    // 更新其他字段
    if (updateDto.deviceGroupName !== undefined) peer.deviceGroupName = updateDto.deviceGroupName;
    if (updateDto.note !== undefined) peer.note = updateDto.note;
    if (updateDto.status !== undefined) peer.status = updateDto.status;

    return this.peerRepository.save(peer);
  }

  /**
   * 更新设备在线状态
   */
  async updateStatus(peerId: string, userId: number, status: number): Promise<void> {
    await this.peerRepository.update(
      { id: peerId, userId },
      { status },
    );
  }

  /**
   * 删除设备
   */
  async deletePeer(peerId: string, userId: number): Promise<void> {
    const peer = await this.findById(peerId, userId);
    if (peer) {
      await this.peerRepository.remove(peer);
    }
  }

  /**
   * 批量更新设备状态（用于心跳同步）
   */
  async batchUpdateStatus(peerIds: string[], status: number): Promise<void> {
    if (peerIds.length === 0) return;

    await this.peerRepository
      .createQueryBuilder()
      .update()
      .set({ status })
      .where('id IN (:...peerIds)', { peerIds })
      .execute();
  }
}
