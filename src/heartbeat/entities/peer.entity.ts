import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('peers')
export class Peer {
  @PrimaryColumn()
  uuid: string;

  @Column()
  id: string;

  @Column()
  ver: number;

  @Column()
  modifiedAt: number;

  @Column({ type: 'text', nullable: true })
  conns: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
