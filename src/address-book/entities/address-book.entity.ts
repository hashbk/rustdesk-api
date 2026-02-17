import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AbPeer } from './ab-peer.entity';
import { AbTag } from './ab-tag.entity';
import { SharedAddressBook } from './shared-address-book.entity';

@Entity('address_books')
export class AddressBook {
  @PrimaryColumn()
  guid: string;

  @Column()
  owner: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'text', nullable: true })
  info: string;

  @Column({ default: false })
  isPersonal: boolean;

  @Column({ default: 1000 })
  maxPeers: number;

  @OneToMany(() => AbPeer, peer => peer.addressBook, { cascade: true })
  peers: AbPeer[];

  @OneToMany(() => AbTag, tag => tag.addressBook, { cascade: true })
  tags: AbTag[];

  @OneToMany(() => SharedAddressBook, shared => shared.addressBook, { cascade: true })
  sharedWith: SharedAddressBook[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
