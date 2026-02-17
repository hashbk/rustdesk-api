import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// SQLite 不支持 ENUM，所以使用整数代替
// 对于支持 ENUM 的数据库，可以在装饰器中使用 @Column({ type: 'enum', enum: AlarmAuditType })

export const AlarmAuditType = {
  IP_WHITELIST: 0,          // IP白名单违规
  EXCEED_THIRTY_ATTEMPTS: 1, // 超过30次尝试
  SIX_ATTEMPTS_WITHIN_ONE_MINUTE: 2, // 1分钟内6次尝试
  EXCEED_IPV6_PREFIX_ATTEMPTS: 6,     // IPv6前缀尝试过多
} as const;

export type AlarmAuditType = typeof AlarmAuditType[keyof typeof AlarmAuditType];

@Entity('alarm_audits')
export class AlarmAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  deviceId: string;

  @Column({ type: 'text' })
  deviceUuid: string;

  @Column({ type: 'int' }) // SQLite 使用 int，其他数据库可以用 enum
  typ: number;

  @Column({ type: 'json' })
  info: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
