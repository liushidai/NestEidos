import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { UserRepository } from './repositories/user.repository';
import { ProtectedUserController } from './protected-user.controller';
import { AdminController } from './admin.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '@/cache';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AuthModule,
    CacheModule,
    ConfigModule,
  ],
  controllers: [ProtectedUserController, AdminController, AdminUsersController],
  providers: [UserService, UserRepository, AdminGuard],
  exports: [UserService, UserRepository],
})
export class UserModule {}
