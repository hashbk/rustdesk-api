import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { Sysinfo } from './entities/sysinfo.entity';
import { AddressBook, AddressBookPeer, AddressBookTag } from '../address-book/entities';
import { DeviceGroup } from '../device-group/entities/device-group.entity';
import { Peer } from '../heartbeat/entities/peer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sysinfo, AddressBook, AddressBookPeer, AddressBookTag, DeviceGroup, Peer])],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
