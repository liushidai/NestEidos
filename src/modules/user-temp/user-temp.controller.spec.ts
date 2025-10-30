import { Test, TestingModule } from '@nestjs/testing';
import { UserTempController } from './user-temp.controller';
import { UserTempService } from './user-temp.service';

describe('UserTempController', () => {
  let controller: UserTempController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserTempController],
      providers: [UserTempService],
    }).compile();

    controller = module.get<UserTempController>(UserTempController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
