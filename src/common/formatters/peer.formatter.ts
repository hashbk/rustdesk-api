import { Peer } from '../entities/peer.entity';
import { Sysinfo } from '../entities/sysinfo.entity';
import { User } from '../../modules/user/entities/user.entity';

/**
 * 设备信息接口
 */
export interface PeerInfo {
  username: string;
  os: string;
  device_name: string;
}

/**
 * 设备响应格式化接口
 */
export interface PeerResponse {
  id: string;
  info: PeerInfo;
  status: number;
  user: string;
  user_name: string;
  device_group_name?: string;
  note: string;
}

/**
 * 管理端设备响应格式化接口
 */
export interface PeerAdminResponse {
  id: string;
  uuid: string;
  user_id: string | null;  // 保持原有字段名 user_id
  device_group_guid: string | null;
  device_group_name: string;
  ver: number;
  modified_at: number;
  status: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * 设备响应格式化器
 * 统一处理设备数据的响应格式
 */
export class PeerFormatter {
  /**
   * 在线状态阈值（1分钟）
   */
  static readonly ONLINE_THRESHOLD_MS = 60 * 1000;

  /**
   * 判断设备是否在线
   */
  static isOnline(updatedAt: Date): boolean {
    return updatedAt.getTime() > Date.now() - this.ONLINE_THRESHOLD_MS;
  }

  /**
   * 格式化单个设备（客户端格式）
   */
  static format(
    peer: Peer,
    sysinfo?: Sysinfo | null,
    user?: User | null,
  ): PeerResponse {
    const isOnline = this.isOnline(peer.updatedAt);

    return {
      id: peer.id,
      info: {
        username: sysinfo?.username || '',
        os: sysinfo?.os || '',
        device_name: sysinfo?.hostname || '',
      },
      status: isOnline ? 1 : 0,
      user: user?.username || '',
      user_name: user?.username || '',
      device_group_name: peer.deviceGroup?.name || '',
      note: '',
    };
  }

  /**
   * 格式化设备列表
   */
  static formatList(
    peers: Peer[],
    sysinfoMap: Map<string, Sysinfo>,
    userMap: Map<string, User>,
  ): PeerResponse[] {
    return peers.map(peer => {
      const sysinfo = sysinfoMap.get(peer.uuid);
      const user = peer.userGuid ? userMap.get(peer.userGuid) : null;
      return this.format(peer, sysinfo, user);
    });
  }

  /**
   * 格式化管理端设备
   */
  static formatForAdmin(peer: Peer): PeerAdminResponse {
    const isOnline = this.isOnline(peer.updatedAt);

    return {
      id: peer.id,
      uuid: peer.uuid,
      user_id: peer.userGuid,  // 响应字段名保持 user_id，值为 userGuid
      device_group_guid: peer.deviceGroupGuid,
      device_group_name: peer.deviceGroup?.name || '',
      ver: peer.ver,
      modified_at: peer.modifiedAt,
      status: isOnline ? 1 : 0,
      created_at: peer.createdAt,
      updated_at: peer.updatedAt,
    };
  }

  /**
   * 格式化管理端设备列表
   */
  static formatListForAdmin(peers: Peer[]): PeerAdminResponse[] {
    return peers.map(peer => this.formatForAdmin(peer));
  }
}
