import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_devices')
export class UserDevice {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  @Index()
  userId: number;

  @Column()
  @Index()
  deviceId: string;

  @Column({ nullable: true })
  deviceUuid: string;

  @Column({ nullable: true })
  deviceName: string;

  @Column({ nullable: true })
  platform: string; // windows, macos, linux, android, ios, web

  @Column({ nullable: true })
  osVersion: string;

  @Column({ nullable: true, type: 'text' })
  deviceInfo: string; // JSON 格式的设备详细信息

  @Column({ nullable: true })
  lastIp: string;

  @ManyToOne(() => User, user => user.devices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
