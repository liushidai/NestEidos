import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Album } from '../../album/entities/album.entity';

@Entity('image')
@Index(['userId', 'albumId'])
@Index(['userId', 'title'])
@Index(['imageHash'])
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

  @Column({ name: 'image_hash', type: 'char', length: 64 })
  imageHash: string;

  @Column({ name: 'image_size', type: 'bigint' })
  imageSize: number;

  @Column({ name: 'image_mime_type', type: 'varchar', length: 64 })
  imageMimeType: string;

  @Column({ name: 'image_width', type: 'integer' })
  imageWidth: number;

  @Column({ name: 'image_height', type: 'integer' })
  imageHeight: number;

  @Column({ name: 'has_transparency', type: 'boolean', default: false })
  hasTransparency: boolean;

  @Column({ name: 'is_animated', type: 'boolean', default: false })
  isAnimated: boolean;

  @Column({ name: 'original_key', type: 'varchar', length: 512 })
  originalKey: string;

  @Column({ name: 'jpeg_key', type: 'varchar', length: 512, nullable: true })
  jpegKey: string | null;

  @Column({ name: 'webp_key', type: 'varchar', length: 512, nullable: true })
  webpKey: string | null;

  @Column({ name: 'avif_key', type: 'varchar', length: 512, nullable: true })
  avifKey: string | null;

  @Column({ name: 'has_jpeg', type: 'boolean', default: false })
  hasJpeg: boolean;

  @Column({ name: 'has_webp', type: 'boolean', default: false })
  hasWebp: boolean;

  @Column({ name: 'has_avif', type: 'boolean', default: false })
  hasAvif: boolean;

  @Column({ name: 'convert_jpeg_param', type: 'jsonb', default: () => "'{}'::jsonb" })
  convertJpegParam: Record<string, any>;

  @Column({ name: 'convert_webp_param', type: 'jsonb', default: () => "'{}'::jsonb" })
  convertWebpParam: Record<string, any>;

  @Column({ name: 'convert_avif_param', type: 'jsonb', default: () => "'{}'::jsonb" })
  convertAvifParam: Record<string, any>;

  @Column({ name: 'default_format', type: 'varchar', length: 20, default: 'avif' })
  defaultFormat: 'original' | 'webp' | 'avif';

  @Column({ name: 'expire_policy', type: 'smallint' })
  expirePolicy: number;

  @Column({ name: 'expires_at', type: 'timestamp without time zone', default: () => "'9999-12-31 23:59:59'" })
  expiresAt: Date;

  @Column({ name: 'nsfw_score', type: 'real', nullable: true })
  nsfwScore: number | null;

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
}