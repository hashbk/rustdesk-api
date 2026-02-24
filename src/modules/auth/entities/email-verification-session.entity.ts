import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('email_verification_sessions')
export class EmailVerificationSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Index()
  secret: string;

  @Column()
  userId: number;

  @Column()
  email: string;

  @Column()
  code: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
