import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { SysinfoController } from './sysinfo.controller';
import { SysinfoService } from './sysinfo.service';
import { Sysinfo, Peer } from '../../common/entities';
import { AddressBook, AddressBookPeer, AddressBookTag } from '../address-book/entities';
import { DeviceGroup } from '../device-group/entities/device-group.entity';
import { DeviceThrottlerGuard } from '../../common/guards/device-throttler.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Sysinfo, AddressBook, AddressBookPeer, AddressBookTag, DeviceGroup, Peer])],
  controllers: [SysinfoController],
  providers: [
    SysinfoService,
    {
      provide: APP_GUARD,
      useClass: DeviceThrottlerGuard,
    },
  ],
  exports: [SysinfoService],
})
export class SysinfoModule {}
