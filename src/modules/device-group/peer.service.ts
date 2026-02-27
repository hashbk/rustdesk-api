import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Peer, Sysinfo } from '../../common/entities';
import { User } from '../user/entities/user.entity';
import { DeviceGroup } from './entities/device-group.entity';
import { DeviceGroupUserPermission } from './entities/device-group-user-permission.entity';
import { UserUserPermission } from './entities/user-user-permission.entity';
import { PeerQueryDto } from './dto/peer.dto';

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
    userGuid: string,
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
          peer.userGuid = :userGuid
          -- 用户有权访问的设备组中的设备
          OR EXISTS (
            SELECT 1 FROM device_group_user_permissions udgp
            WHERE udgp.userGuid = :userGuid AND udgp.deviceGroupGuid = peer.deviceGroupGuid
          )
          -- 用户有权访问的其他用户的设备
          OR EXISTS (
            SELECT 1 FROM user_user_permissions uup
            WHERE uup.userGuid = :userGuid AND uup.targetUserGuid = peer.userGuid
          )
        )`,
        { userGuid },
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

    // 获取所有相关的用户GUID
    const userGuids = [...new Set(peers.map(p => p.userGuid).filter(guid => guid != null))];

    // 批量查询用户信息
    const users = userGuids.length > 0
      ? await this.userRepository.find({ where: { guid: In(userGuids) } })
      : [];
    const userMap = new Map(users.map(u => [u.guid, u]));

    // 转换响应格式
    const data = peers.map(peer => {
      const sysinfo = sysinfoMap.get(peer.uuid);
      const isOnline = peer.updatedAt > oneMinuteAgo;
      const user = peer.userGuid ? userMap.get(peer.userGuid) : null;

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
}
