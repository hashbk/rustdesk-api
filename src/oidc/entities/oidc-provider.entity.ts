import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('oidc_providers')
export class OidcProvider {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  @Index()
  name: string;

  @Column()
  issuer: string;

  @Column()
  clientId: string;

  @Column({ nullable: true, select: false })
  clientSecret: string;

  @Column({ nullable: true })
  scope: string;

  @Column({ nullable: true })
  authorizationEndpoint: string;

  @Column({ nullable: true })
  tokenEndpoint: string;

  @Column({ nullable: true })
  userinfoEndpoint: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 0 })
  priority: number; // 显示优先级

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
