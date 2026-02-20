import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { DeviceGroup } from '../../device-group/entities/device-group.entity';

@Entity('peers')
export class Peer {
  @PrimaryColumn()
  uuid: string;

  @Column()
  id: string;

  @Column({ nullable: true })
  @Index()
  userId: number;

  /**
   * 所属设备组GUID
   * 关联到 device_groups 表的 guid 字段
   */
  @Column({ nullable: true })
  @Index()
  deviceGroupGuid: string;

  /**
   * 关联的设备组实体
   * 多对一关系，关联到 DeviceGroup
   */
  @ManyToOne(() => DeviceGroup, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deviceGroupGuid' })
  deviceGroup: DeviceGroup;

  @Column()
  ver: number;

  @Column()
  modifiedAt: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
