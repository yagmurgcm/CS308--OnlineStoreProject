import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class LoginLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ length: 255 })
  email: string;

  @CreateDateColumn({ type: 'timestamp' })
  loginTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  logoutTime: Date | null;
}
