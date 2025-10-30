import { Module } from '@nestjs/common';
import { UserTempModule } from './user-temp/user-temp.module';

@Module({
  imports: [UserTempModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class ModulesModule {}
