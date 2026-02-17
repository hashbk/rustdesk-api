import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AddressBook } from './address-book.entity';

export enum ShareRule {
  READ = 1,
  READ_WRITE = 2,
  FULL_CONTROL = 3,
}

@Entity('shared_address_books')
export class SharedAddressBook {
  @PrimaryColumn()
  abGuid: string;

  @PrimaryColumn()
  sharedWith: string;

  @ManyToOne(() => AddressBook, addressBook => addressBook.sharedWith, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'abGuid' })
  addressBook: AddressBook;

  @Column({
    type: 'integer',
    default: ShareRule.READ,
  })
  rule: ShareRule;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
