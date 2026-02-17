import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AddressBook } from './address-book.entity';

@Entity('ab_tags')
export class AbTag {
  @PrimaryColumn()
  name: string;

  @PrimaryColumn()
  abGuid: string;

  @ManyToOne(() => AddressBook, addressBook => addressBook.tags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'abGuid' })
  addressBook: AddressBook;

  @Column({ type: 'bigint', default: 0 })
  color: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
