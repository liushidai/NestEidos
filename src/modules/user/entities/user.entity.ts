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

  @Column({ name: 'user_name', unique: true, length: 64 })
  userName: string;

  @Column({ name: 'pass_word', length: 255 })
  passWord: string;

  @Column({ name: 'user_type', type: 'smallint' })
  userType: number;

  @Column({ name: 'user_status', type: 'smallint', default: 1 })
  userStatus: number;

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp' })
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

  @BeforeInsert()
  setCreatedAt() {
    if (!this.createdAt) {
      this.createdAt = new Date();
    }
    if (!this.updatedAt) {
      this.updatedAt = new Date();
    }
  }

  @BeforeUpdate()
  setUpdatedAt() {
    this.updatedAt = new Date();
  }
}