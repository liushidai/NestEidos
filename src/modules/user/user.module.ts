import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { ProtectedUserController } from './protected-user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController, ProtectedUserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}