import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';

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
   * 使用字符串引用避免循环依赖
   */
  @ManyToOne('DeviceGroup', 'peers', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deviceGroupGuid' })
  deviceGroup: any;

  @Column()
  ver: number;

  @Column()
  modifiedAt: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
