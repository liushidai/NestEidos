import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Album } from '../../album/entities/album.entity';

@Entity('image')
@Index(['userId', 'albumId'])
@Index(['userId', 'title'])
@Index(['userId', 'mimeType'])
@Index(['hash'], { unique: true })
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

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 64 })
  mimeType: string;

  @Column({ type: 'integer' })
  width: number;

  @Column({ type: 'integer' })
  height: number;

  @Column({ type: 'char', length: 64 })
  hash: string;

  @Column({ name: 'original_key', type: 'varchar', length: 512 })
  originalKey: string;

  @Column({ name: 'webp_key', type: 'varchar', length: 512, nullable: true })
  webpKey: string;

  @Column({ name: 'avif_key', type: 'varchar', length: 512, nullable: true })
  avifKey: string;

  @Column({ name: 'has_webp', type: 'boolean', default: false })
  hasWebp: boolean;

  @Column({ name: 'has_avif', type: 'boolean', default: false })
  hasAvif: boolean;

  @Column({ name: 'convert_webp_param_id', type: 'bigint', nullable: true })
  convertWebpParamId: string;

  @Column({ name: 'convert_avif_param_id', type: 'bigint', nullable: true })
  convertAvifParamId: string;

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
  album: Album;
}