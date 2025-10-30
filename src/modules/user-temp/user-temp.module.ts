import { Module } from '@nestjs/common';
import { UserTempService } from './user-temp.service';
import { UserTempController } from './user-temp.controller';
import { UserTemp } from './entities/user-temp.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([UserTemp])],
  controllers: [UserTempController],
  providers: [UserTempService],
})
export class UserTempModule {}
