import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemController } from './system.controller';
import { SysinfoService } from './sysinfo.service';
import { Sysinfo } from './entities/sysinfo.entity';
import { AddressBook, AbPeer, AbTag } from '../address-book/entities';
import { DeviceGroup } from '../device-group/entities/device-group.entity';
import { AccessiblePeer } from '../device-group/entities/accessible-peer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sysinfo, AddressBook, AbPeer, AbTag, DeviceGroup, AccessiblePeer])],
  controllers: [SystemController],
  providers: [SysinfoService],
  exports: [SysinfoService],
})
export class SystemModule {}
