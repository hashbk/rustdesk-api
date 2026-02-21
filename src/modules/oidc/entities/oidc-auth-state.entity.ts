import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * OIDC 授权状态
 */
export enum OidcAuthStatus {
  PENDING = 'pending',      // 等待用户授权
  AUTHORIZED = 'authorized', // 已授权
  EXPIRED = 'expired',      // 已过期
  CANCELLED = 'cancelled',  // 已取消
}

@Entity('oidc_auth_states')
export class OidcAuthState {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  @Index()
  code: string; // 授权码，用于轮询查询

  @Column()
  @Index()
  op: string; // OIDC 提供商标识，如 oidc/google

  @Column()
  deviceId: string;

  @Column()
  deviceUuid: string;

  @Column({ type: 'text', nullable: true })
  deviceInfo: string; // JSON 格式的设备信息

  @Column({ type: 'text', nullable: true })
  redirectUri: string; // OIDC 回调地址

  @Column({ type: 'text', nullable: true })
  state: string; // OIDC state 参数

  @Column({
    type: 'text',
    default: OidcAuthStatus.PENDING,
  })
  status: OidcAuthStatus;

  // 授权成功后的用户信息
  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  accessToken: string;

  @Column({ type: 'text', nullable: true })
  oidcAccessToken: string; // OIDC 提供商返回的 access_token

  @Column({ type: 'text', nullable: true })
  oidcRefreshToken: string;

  @Column({ type: 'datetime' })
  expiresAt: Date; // 授权码过期时间（3分钟）

  @CreateDateColumn()
  createdAt: Date;
}
