import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('auth_token')
export class AuthToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Index('idx_auth_token_user')
  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'text' })
  token: string;

  @CreateDateColumn()
  createdAt: Date;
}
