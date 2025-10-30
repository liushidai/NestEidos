import { Module } from '@nestjs/common';
import { UserTempModule } from './user-temp/user-temp.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [UserTempModule, UserModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class ModulesModule {}
