import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { SnowflakeUtil } from '../../../utils/snowflake.util';

@Entity('user')
export class User {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true, length: 64 })
  userName: string;

  @Column({ length: 255 })
  passWord: string;

  @Column({ type: 'smallint' })
  userType: number;

  @Column({ type: 'smallint', default: 1 })
  userStatus: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = SnowflakeUtil.getInstance().nextId();
    }
  }

  @BeforeInsert()
  setDefaultValues() {
    if (this.userStatus === undefined || this.userStatus === null) {
      this.userStatus = 1;
    }
  }
}