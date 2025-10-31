import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

@Entity('file')
@Index(['hash'], { unique: true })
export class File {
  @PrimaryColumn('bigint')
  id: string;

  @Column({ type: 'char', length: 64, unique: true })
  hash: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 64 })
  mimeType: string;

  @Column({ type: 'integer' })
  width: number;

  @Column({ type: 'integer' })
  height: number;

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
  convertWebpParamId: string | null;

  @Column({ name: 'convert_avif_param_id', type: 'bigint', nullable: true })
  convertAvifParamId: string | null;

  @Column({ name: 'created_at', type: 'timestamp without time zone' })
  createdAt: Date;
}