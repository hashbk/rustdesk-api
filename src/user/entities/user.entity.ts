import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { UserToken } from './user-token.entity';

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

/**
 * 用户信息设置
 */
export interface UserInfo {
  email_verification?: boolean;
  email_alarm_notification?: boolean;
  login_device_whitelist?: WhitelistItem[];
  other?: Record<string, any>;
}

/**
 * 白名单项
 */
export interface WhitelistItem {
  data: string;      // IP 地址或设备 UUID
  info: DeviceInfo;  // 设备信息
  exp: number;       // 过期时间戳（秒）
}

/**
 * 设备信息
 */
export interface DeviceInfo {
  os: string;    // 操作系统：Linux, Windows, Android...
  type: string;  // 类型：browser 或 client
  name: string;  // 设备名称或浏览器信息
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ unique: true })
  @Index()
  username: string;

  @Column({ unique: true, nullable: true })
  @Index()
  email: string;

  @Column({ select: false, nullable: true })
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

  // 用户信息设置（JSON 格式存储）
  @Column({ type: 'text', nullable: true })
  info: string; // JSON string of UserInfo

  // 第三方认证类型
  @Column({ nullable: true })
  thirdAuthType: string; // oidc, ldap, etc.

  @OneToMany(() => UserToken, token => token.user, { cascade: true })
  tokens: UserToken[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 获取解析后的 UserInfo
  getUserInfo(): UserInfo {
    if (!this.info) {
      return {
        email_verification: false,
        email_alarm_notification: false,
        login_device_whitelist: [],
        other: {},
      };
    }
    try {
      return JSON.parse(this.info);
    } catch {
      return {
        email_verification: false,
        email_alarm_notification: false,
        login_device_whitelist: [],
        other: {},
      };
    }
  }

  // 设置 UserInfo
  setUserInfo(info: UserInfo): void {
    this.info = JSON.stringify(info);
  }
}
