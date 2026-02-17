import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AddressBook } from './address-book.entity';

@Entity('ab_peers')
export class AbPeer {
  @PrimaryColumn()
  id: string;

  @PrimaryColumn()
  abGuid: string;

  @ManyToOne(() => AddressBook, addressBook => addressBook.peers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'abGuid' })
  addressBook: AddressBook;

  @Column({ type: 'text', nullable: true })
  hash: string;

  @Column({ type: 'text', nullable: true })
  password: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  hostname: string;

  @Column({ nullable: true })
  platform: string;

  @Column({ nullable: true })
  alias: string;

  @Column({ type: 'text', nullable: true })
  tags: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ nullable: true })
  forceAlwaysRelay: string;

  @Column({ nullable: true })
  rdpPort: string;

  @Column({ nullable: true })
  rdpUsername: string;

  @Column({ nullable: true })
  loginName: string;

  @Column({ nullable: true })
  deviceGroupName: string;

  @Column({ type: 'boolean', default: false })
  sameServer: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
