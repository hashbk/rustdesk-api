import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { HeartbeatController } from './heartbeat.controller';
import { HeartbeatService } from './heartbeat.service';
import { Peer } from '../../common/entities';
import { DeviceThrottlerGuard } from '../../common/guards/device-throttler.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Peer])],
  controllers: [HeartbeatController],
  providers: [
    HeartbeatService,
    {
      provide: APP_GUARD,
      useClass: DeviceThrottlerGuard,
    },
  ],
  exports: [HeartbeatService],
})
export class HeartbeatModule {}
