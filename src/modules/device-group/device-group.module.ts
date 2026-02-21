import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceGroupController } from './device-group.controller';
import { DeviceGroupService } from './device-group.service';
import { PeerService } from './peer.service';
import { DeviceGroup } from './entities/device-group.entity';
import { DeviceGroupUserPermission } from './entities/device-group-user-permission.entity';
import { UserUserPermission } from './entities/user-user-permission.entity';
import { Peer, Sysinfo } from '../../common/entities';
import { User } from '../user/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceGroup,
      DeviceGroupUserPermission,
      UserUserPermission,
      Peer,
      Sysinfo,
      User,
    ]),
    AuthModule,
  ],
  controllers: [DeviceGroupController],
  providers: [DeviceGroupService, PeerService],
  exports: [DeviceGroupService, PeerService],
})
export class DeviceGroupModule {}
