import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { AddressBook } from './address-book.entity';

/**
 * 地址簿规则实体
 * 管理地址簿的访问权限规则
 * 
 * 规则类型:
 * - user: 针对特定用户的规则
 * - group: 针对特定组的规则
 * - everyone: 针对所有用户的规则（user 和 group 都为空）
 * 
 * 权限级别:
 * - 1: Read (只读)
 * - 2: ReadWrite (读写)
 * - 3: FullControl (完全控制)
 */
@Entity('address_book_rules')
export class AddressBookRule {
  /**
   * 规则唯一标识符
   * UUID 格式，用于唯一标识一个规则
   */
  @PrimaryColumn()
  guid: string;

  /**
   * 所属地址簿
   * 多对一关系，关联到 AddressBook
   */
  @PrimaryColumn()
  ab: string;

  /**
   * 规则目标用户
   * 当 rule_type 为 'user' 时，此字段为用户名
   * 当 rule_type 为 'group' 或 'everyone' 时，此字段为空
   */
  @Column({ type: 'varchar', nullable: true })
  user: string;

  /**
   * 规则目标组
   * 当 rule_type 为 'group' 时，此字段为组名
   * 当 rule_type 为 'user' 或 'everyone' 时，此字段为空
   */
  @Column({ type: 'varchar', nullable: true })
  group: string;

  /**
   * 规则权限级别
   * 1: Read (只读)
   * 2: ReadWrite (读写)
   * 3: FullControl (完全控制)
   */
  @Column({ type: 'int', default: 1 })
  rule: number;

  /**
   * 关联的地址簿
   */
  @ManyToOne(() => AddressBook, (addressBook) => addressBook.rules, {
    onDelete: 'CASCADE',
  })
  addressBook: AddressBook;

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

  /**
   * 获取规则类型
   * @returns "user" | "group" | "everyone"
   */
  get ruleType(): 'user' | 'group' | 'everyone' {
    if (this.user) {
      return 'user';
    }
    if (this.group) {
      return 'group';
    }
    return 'everyone';
  }
}
