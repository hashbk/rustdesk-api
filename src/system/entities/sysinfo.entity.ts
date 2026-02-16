import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('sysinfo')
export class Sysinfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  hostname: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  os: string;

  @Column({ nullable: true })
  platform: string;

  @Column({ nullable: true })
  cpu: string;

  @Column({ nullable: true })
  memory: string;

  @Column({ nullable: true })
  display: string;

  @Column({ nullable: true })
  version: string;

  @Column({ nullable: true })
  deviceId: string;

  @Column({ nullable: true })
  uuid: string;

  @Column({ name: 'preset_address_book_name', nullable: true })
  presetAddressBookName: string;

  @Column({ name: 'preset_address_book_tag', nullable: true })
  presetAddressBookTag: string;

  @Column({ name: 'preset_address_book_alias', nullable: true })
  presetAddressBookAlias: string;

  @Column({ name: 'preset_address_book_password', nullable: true })
  presetAddressBookPassword: string;

  @Column({ name: 'preset_address_book_note', nullable: true })
  presetAddressBookNote: string;

  @Column({ name: 'preset_username', nullable: true })
  presetUsername: string;

  @Column({ name: 'preset_strategy_name', nullable: true })
  presetStrategyName: string;

  @Column({ name: 'preset_device_group_name', nullable: true })
  presetDeviceGroupName: string;

  @Column({ name: 'preset_note', nullable: true })
  presetNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @CreateDateColumn()
  updatedAt: Date;
}
