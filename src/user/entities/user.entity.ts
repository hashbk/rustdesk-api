import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { UserToken } from './user-token.entity';
import { UserDevice } from './user-device.entity';

/**
 * 用户状态枚举
 * -1: 未验证邮箱
 * 0: 禁用
 * 1: 正常
 */
export enum UserStatus {
  UNVERIFIED = -1,
  DISABLED = 0,
  ACTIVE = 1,
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ unique: true })
  @Index()
  username: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  note: string;

  @Column({ nullable: true, select: false })
  verifier: string; // 双因素认证密钥

  @Column({
    type: 'integer',
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ nullable: true, select: false })
  emailVerificationCode: string;

  @Column({ nullable: true, select: false })
  tfaSecret: string; // 双因素认证密钥

  @OneToMany(() => UserToken, token => token.user, { cascade: true })
  tokens: UserToken[];

  @OneToMany(() => UserDevice, device => device.user, { cascade: true })
  devices: UserDevice[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
