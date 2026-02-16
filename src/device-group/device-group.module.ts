import { Module } from '@nestjs/common';
import { DeviceGroupController } from './device-group.controller';

@Module({
  controllers: [DeviceGroupController]
})
export class DeviceGroupModule {}
