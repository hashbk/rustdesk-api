import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// SQLite 不支持 ENUM，所以使用字符串和整数代替
// 对于支持 ENUM 的数据库，可以在装饰器中使用 @Column({ type: 'enum', enum: ConnAction })

export const ConnAction = {
  OPEN: 'open',
  ESTABLISHED: 'established',
  CLOSE: 'close',
} as const;

export type ConnAction = typeof ConnAction[keyof typeof ConnAction];

export const ConnType = {
  REMOTE_CONTROL: 0,
  FILE_TRANSFER: 1,
  PORT_FORWARD: 2,
  CAMERA: 3,
  TERMINAL: 4,
} as const;

export type ConnType = typeof ConnType[keyof typeof ConnType];

@Entity('connection_audits')
export class ConnectionAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  deviceId: string;

  @Column({ type: 'text' })
  deviceUuid: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  connId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sessionId: string | null;

  @Column({ type: 'varchar', length: 45 })
  ip: string;

  @Column({ type: 'varchar', length: 10 }) // SQLite 使用 varchar，其他数据库可以用 enum
  action: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  peerId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  peerName: string | null;

  @Column({ type: 'int', nullable: true }) // SQLite 使用 int，其他数据库可以用 enum
  type: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  requestedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  establishedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  closedAt: Date | null;
}
