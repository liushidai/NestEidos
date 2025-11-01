import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { UserRepository } from './repositories/user.repository';
import { ProtectedUserController } from './protected-user.controller';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '@/cache';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule, CacheModule],
  controllers: [ProtectedUserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}