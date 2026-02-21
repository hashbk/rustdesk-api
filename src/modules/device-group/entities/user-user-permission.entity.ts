import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../user/entities/user.entity';

/**
 * 用户间权限实体
 * 管理用户对其他用户设备的访问权限
 * 使用复合主键 (userId, targetUserId)
 */
@Entity('user_user_permissions')
export class UserUserPermission {
  /**
   * 授权用户ID
   * 拥有访问权限的用户
   */
  @PrimaryColumn()
  @Index()
  userId: number;

  /**
   * 目标用户ID
   * 被授权访问的用户（其设备可被访问）
   */
  @PrimaryColumn()
  @Index()
  targetUserId: number;

  /**
   * 关联的授权用户实体
   * 多对一关系，关联到 User
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * 关联的目标用户实体
   * 多对一关系，关联到 User
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetUserId' })
  targetUser: User;

  /**
   * 创建时间
   */
  @CreateDateColumn()
  createdAt: Date;
}
