import { Test, TestingModule } from '@nestjs/testing';
import { DeviceGroupController } from './device-group.controller';

describe('DeviceGroupController', () => {
  let controller: DeviceGroupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceGroupController],
    }).compile();

    controller = module.get<DeviceGroupController>(DeviceGroupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
