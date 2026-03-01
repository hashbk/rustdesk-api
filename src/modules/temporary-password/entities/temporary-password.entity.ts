import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 临时密码实体
 * 用于存储客户端上传的临时密码信息
 */
@Entity('temporary_passwords')
@Index(['uuid'], { unique: true })
export class TemporaryPassword {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 设备ID
   */
  @Column({ type: 'varchar', length: 100 })
  device_id: string;

  /**
   * 设备UUID（base64编码）
   */
  @Column({ type: 'varchar', length: 255, unique: true })
  uuid: string;

  /**
   * 临时密码
   */
  @Column({ type: 'varchar', length: 255 })
  temporary_password: string;

  /**
   * 客户端版本号（数字格式，不处理）
   */
  @Column({ type: 'bigint', nullable: true })
  ver: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
