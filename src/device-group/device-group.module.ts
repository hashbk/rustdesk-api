import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceGroupController } from './device-group.controller';
import { DeviceGroupService } from './device-group.service';
import { PeerService } from './peer.service';
import { DeviceGroup } from './entities/device-group.entity';
import { AccessiblePeer } from './entities/accessible-peer.entity';
import { Peer } from '../heartbeat/entities/peer.entity';
import { Sysinfo } from '../system/entities/sysinfo.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceGroup, AccessiblePeer, Peer, Sysinfo]),
    AuthModule,
  ],
  controllers: [DeviceGroupController],
  providers: [DeviceGroupService, PeerService],
  exports: [DeviceGroupService, PeerService],
})
export class DeviceGroupModule {}
