import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Peer } from '../heartbeat/entities/peer.entity';
import { Sysinfo } from '../system/entities/sysinfo.entity';
import { User } from '../user/entities/user.entity';
import { DeviceGroup } from './entities/device-group.entity';
import { DeviceGroupUserPermission } from './entities/device-group-user-permission.entity';
import { UserUserPermission } from './entities/user-user-permission.entity';
import { PeerQueryDto, UpdatePeerDto, SetPeerDeviceGroupDto } from './dto/peer.dto';

@Injectable()
export class PeerService {
  constructor(
    @InjectRepository(Peer)
    private peerRepository: Repository<Peer>,
    @InjectRepository(Sysinfo)
    private sysinfoRepository: Repository<Sysinfo>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DeviceGroup)
    private deviceGroupRepository: Repository<DeviceGroup>,
    @InjectRepository(DeviceGroupUserPermission)
    private deviceGroupUserPermissionRepository: Repository<DeviceGroupUserPermission>,
    @InjectRepository(UserUserPermission)
    private userUserPermissionRepository: Repository<UserUserPermission>,
  ) {}

  /**
   * 获取用户可访问的设备列表（分页）
   * GET /api/peers?current=1&pageSize=100&accessible=&status=1
   * 
   * 权限逻辑：
   * 1. 管理员可以看到所有设备
   * 2. 普通用户：
   *    - 用户自己的设备
   *    - 用户有权访问的设备组中的设备
   *    - 用户有权访问的其他用户的设备
   */
  async getAccessiblePeers(
    userId: number,
    query: PeerQueryDto,
    isAdmin: boolean = false,
  ): Promise<{ data: any[]; total: number }> {
    const { current, pageSize, status } = query;
    const skip = (current - 1) * pageSize;

    // 计算一分钟前的时间（用于判断在线状态）
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    // 构建查询
    const queryBuilder = this.peerRepository
      .createQueryBuilder('peer')
      .leftJoinAndSelect('peer.deviceGroup', 'deviceGroup');

    // 管理员可以看到所有设备
    if (!isAdmin) {
      queryBuilder.where(
        `(
          -- 用户自己的设备
          peer.userId = :userId
          -- 用户有权访问的设备组中的设备
          OR EXISTS (
            SELECT 1 FROM device_group_user_permissions udgp
            WHERE udgp.userId = :userId AND udgp.deviceGroupGuid = peer.deviceGroupGuid
          )
          -- 用户有权访问的其他用户的设备
          OR EXISTS (
            SELECT 1 FROM user_user_permissions uup
            WHERE uup.userId = :userId AND uup.targetUserId = peer.userId
          )
        )`,
        { userId },
      );
    }

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

    // 获取所有相关的用户ID
    const userIds = [...new Set(peers.map(p => p.userId).filter(id => id != null))];
    
    // 批量查询用户信息
    const users = userIds.length > 0
      ? await this.userRepository.find({ where: { id: In(userIds) } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    // 转换响应格式
    const data = peers.map(peer => {
      const sysinfo = sysinfoMap.get(peer.uuid);
      const isOnline = peer.updatedAt > oneMinuteAgo;
      const user = peer.userId ? userMap.get(peer.userId) : null;

      return {
        id: peer.id,
        info: {
          username: sysinfo?.username || '',
          os: sysinfo?.os || '',
          device_name: sysinfo?.hostname || '',
        },
        status: isOnline ? 1 : 0,
        user: user?.username || '',
        user_name: user?.username || '', // 用于前端过滤
        device_group_name: peer.deviceGroup?.name || '',
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
      relations: ['deviceGroup'],
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { peers, total };
  }

  /**
   * 根据设备ID获取设备
   */
  async findById(peerId: string): Promise<Peer | null> {
    return this.peerRepository.findOne({
      where: { id: peerId },
      relations: ['deviceGroup'],
    });
  }

  /**
   * 根据UUID获取设备
   */
  async findByUuid(uuid: string): Promise<Peer | null> {
    return this.peerRepository.findOne({
      where: { uuid },
      relations: ['deviceGroup'],
    });
  }

  /**
   * 更新设备信息
   */
  async updatePeerInfo(uuid: string, updateDto: UpdatePeerDto): Promise<void> {
    const peer = await this.findByUuid(uuid);
    if (!peer) {
      throw new NotFoundException('设备不存在');
    }

    // 更新设备组
    if (updateDto.deviceGroupGuid !== undefined) {
      if (updateDto.deviceGroupGuid) {
        const deviceGroup = await this.deviceGroupRepository.findOne({
          where: { guid: updateDto.deviceGroupGuid },
        });
        if (!deviceGroup) {
          throw new NotFoundException('设备组不存在');
        }
        peer.deviceGroupGuid = updateDto.deviceGroupGuid;
      } else {
        peer.deviceGroupGuid = null as any;
      }
    }

    await this.peerRepository.save(peer);
  }

  /**
   * 删除设备（解除用户绑定）
   */
  async deletePeer(uuid: string): Promise<void> {
    const peer = await this.findByUuid(uuid);
    if (peer) {
      // 将设备的 userId 和 deviceGroupGuid 设为 null，表示解除绑定
      peer.userId = null as any;
      peer.deviceGroupGuid = null as any;
      await this.peerRepository.save(peer);
    }
  }

  /**
   * 批量设置设备的设备组
   */
  async setPeerDeviceGroup(dto: SetPeerDeviceGroupDto): Promise<void> {
    if (dto.peerIds.length === 0) {
      return;
    }

    // 检查设备组是否存在
    if (dto.deviceGroupGuid) {
      const deviceGroup = await this.deviceGroupRepository.findOne({
        where: { guid: dto.deviceGroupGuid },
      });
      if (!deviceGroup) {
        throw new NotFoundException('设备组不存在');
      }
    }

    // 批量更新
    await this.peerRepository.update(
      { id: In(dto.peerIds) },
      { deviceGroupGuid: dto.deviceGroupGuid || (null as any) },
    );
  }
}
