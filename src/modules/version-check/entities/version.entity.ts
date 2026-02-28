import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 版本信息实体
 * 用于存储各平台、各架构的RustDesk客户端版本信息
 */
@Entity('versions')
export class Version {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 版本号，遵循语义化版本规范（如 1.2.3）
   */
  @Column({ type: 'varchar', length: 32, default: '' })
  version: string;

  /**
   * 操作系统类型
   * 枚举值: windows, macos, linux, android, ios
   */
  @Column({ type: 'varchar', length: 20, default: '' })
  os: string;

  /**
   * 系统架构
   * 枚举值: x86_64, x86, arm64, armv7
   */
  @Column({ type: 'varchar', length: 20, default: '' })
  arch: string;

  /**
   * 客户端类型
   */
  @Column({ type: 'varchar', length: 50, default: '' })
  typ: string;

  /**
   * 下载链接
   */
  @Column({ type: 'varchar', length: 512, default: '' })
  download_url: string;

  /**
   * 构建时间（秒级Unix时间戳）
   */
  @Column({ type: 'bigint', default: 0 })
  build_date: number;

  /**
   * 是否启用（用于版本上下线管理）
   */
  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /**
   * 备注
   */
  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
