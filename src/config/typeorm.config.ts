import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
config();

const configService = new ConfigService();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST', 'localhost'),
  port: Number.parseInt(configService.get<string>('DATABASE_PORT', '5432')),
  username: configService.get<string>('DATABASE_USER', 'nest-typeorm'),
  password: configService.get<string>('DATABASE_PASSWORD', 'nest-typeorm'),
  database: configService.get<string>('DATABASE_NAME', 'nest-typeorm'),
  synchronize: false,
  entities: ['**/*.entity.ts'],
  migrations: ['src/database/migrations/*-migration.ts'],
  migrationsRun: false,
  logging: true,
});

export default AppDataSource;
