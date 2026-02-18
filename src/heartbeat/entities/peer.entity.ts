import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('peers')
export class Peer {
  @PrimaryColumn()
  uuid: string;

  @Column()
  id: string;

  @Column({ nullable: true })
  @Index()
  userId: number;

  @Column()
  ver: number;

  @Column()
  modifiedAt: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
