import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index, ManyToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Album } from '../../album/entities/album.entity';
import { File } from './file.entity';

@Entity('image')
@Index(['userId', 'albumId'])
@Index(['userId', 'title'])
export class Image {
  @PrimaryColumn('bigint')
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'album_id', type: 'bigint', default: 0 })
  albumId: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ name: 'file_id', type: 'bigint' })
  fileId: string;

  @Column({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Album, { nullable: true })
  @JoinColumn({ name: 'album_id' })
  album: Album | null;

  @ManyToOne(() => File, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: File;
}