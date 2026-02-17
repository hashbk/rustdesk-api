import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('device_groups')
export class DeviceGroup {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  note: string;

  @Column({ nullable: true })
  owner: string; // 创建者用户名

  // 关联的用户（可访问此设备组的用户）
  @ManyToMany(() => User)
  @JoinTable({
    name: 'device_group_users',
    joinColumn: { name: 'deviceGroupId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
