import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AddressBook } from './address-book.entity';

/**
 * 共享权限规则枚举
 * 定义地址簿共享的权限级别
 */
export enum ShareRule {
  /** 只读权限 - 只能查看地址簿内容 */
  READ = 1,
  /** 读写权限 - 可以查看和编辑地址簿内容 */
  READ_WRITE = 2,
  /** 完全控制权限 - 可以查看、编辑、删除和共享地址簿 */
  FULL_CONTROL = 3,
}

/**
 * 地址簿共享实体
 * 管理地址簿的共享关系和权限
 */
@Entity('address_book_shares')
export class AddressBookShare {
  /**
   * 地址簿唯一标识符
   * 关联到 address_books 表的 guid 字段
   */
  @PrimaryColumn()
  addressBookGuid: string;

  /**
   * 共享目标用户ID
   * 标识地址簿共享给哪个用户
   */
  @PrimaryColumn()
  sharedWithUserId: string;

  /**
   * 关联的地址簿实体
   * 多对一关系，关联到 AddressBook
   */
  @ManyToOne(() => AddressBook, addressBook => addressBook.shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addressBookGuid' })
  addressBook: AddressBook;

  /**
   * 共享权限规则
   * 1 - 只读权限 (READ)
   * 2 - 读写权限 (READ_WRITE)
   * 3 - 完全控制权限 (FULL_CONTROL)
   */
  @Column({
    type: 'integer',
    default: ShareRule.READ,
  })
  rule: ShareRule;

  /**
   * 创建时间
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * 更新时间
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
