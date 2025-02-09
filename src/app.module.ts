import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ModulesModule } from './modules/modules.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'nest-typeorm'),
        password: configService.get('DB_PASSWORD', 'nest-typeorm'),
        database: configService.get('DB_DATABASE', 'nest-typeorm'),
        autoLoadEntities: true,
        synchronize: configService.get('DB_SYNCHRONIZE', false),
      }),
      inject: [ConfigService],
    }),
    ModulesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private readonly dataSource: DataSource) {}

  static setupSwagger(app: INestApplication): void {
    const config = new DocumentBuilder()
      .setTitle('Nest-TypeORM API')
      .setDescription('The Nest-TypeORM API description')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    // Add JSON document endpoint
    SwaggerModule.setup('api-json', app, document, {
      jsonDocumentUrl: 'api-json',
      useGlobalPrefix: true,
    });
  }
}
