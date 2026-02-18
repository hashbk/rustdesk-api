import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { DeviceGroup } from './device-group.entity';

/**
 * 可访问的设备（Peer）
 * 用于存储用户可访问的设备信息
 */
@Entity('accessible_peers')
export class AccessiblePeer {
  @PrimaryColumn()
  id: string; // 设备ID

  @Column()
  @PrimaryColumn()
  userId: number; // 所属用户ID，联合主键

  @Column()
  uuid: string; // 设备UUID（唯一标识）

  // 设备详细信息（JSON 格式）
  @Column({ type: 'text', nullable: true })
  info: string; // JSON: { username, hostname, device_name, os }

  @Column({ type: 'integer', nullable: true })
  status: number; // 1=在线，其他=离线

  @Column({ nullable: true })
  ownerUsername: string; // 设备所有者的用户名

  @Column({ nullable: true })
  ownerName: string; // 设备所有者的显示名称

  @Column({ nullable: true })
  deviceGroupName: string; // 设备所属组名称

  @Column({ nullable: true })
  note: string; // 设备备注

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 获取解析后的 info
  getInfo(): PeerInfo {
    if (!this.info) {
      return { username: '', hostname: '', device_name: '', os: '' };
    }
    try {
      return JSON.parse(this.info);
    } catch {
      return { username: '', hostname: '', device_name: '', os: '' };
    }
  }

  // 设置 info
  setInfo(info: PeerInfo): void {
    this.info = JSON.stringify(info);
  }
}

/**
 * 设备信息
 */
export interface PeerInfo {
  username: string;    // 系统用户名
  hostname: string;    // 主机名
  device_name: string; // 设备名称
  os: string;          // 操作系统
}
